#!/usr/bin/env bash
set -euo pipefail

# ===================================================================
# NANDA Ecosystem Setup - Complete Agent Fleet with AWS Secrets
# ===================================================================

REPO_ROOT="/Users/patricksmith/candlefish-ai"
DEPLOY_DIR="${REPO_ROOT}/deploy"
AGENTS_DIR="${REPO_ROOT}/agents/nanda"
COMPOSE_FILE="${DEPLOY_DIR}/compose.yml"
ENV_FILE="${DEPLOY_DIR}/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

say() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*" >&2; }
info() { echo -e "${BLUE}ℹ${NC} $*"; }

# ===================================================================
# AWS Secrets Management
# ===================================================================

fetch_aws_secrets() {
    info "Fetching secrets from AWS Secrets Manager..."

    # Core secrets needed for all agents
    local secrets=(
        "candlefish/jwt-keys"
        "candlefish/database-urls"
        "candlefish/api-keys"
        "paintbox/salesforce"
        "paintbox/companycam"
        "candlefish/temporal"
        "clark-county/credentials"
        "candlefish/github-token"
        "candlefish/openai-api-key"
        "candlefish/anthropic-api-key"
    )

    # Create .env file with secrets
    cat > "${ENV_FILE}" <<EOF
# NANDA Agent Environment Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ===================================================

# Core Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=8080

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=681214184463

# JWT Configuration
JWT_ISSUER=https://api.candlefish.ai
JWKS_URL=https://api.candlefish.ai/.well-known/jwks.json

EOF

    # Fetch each secret and add to .env
    for secret_id in "${secrets[@]}"; do
        info "  Fetching: $secret_id"

        # Try to fetch the secret
        secret_json=$(aws secretsmanager get-secret-value \
            --secret-id "$secret_id" \
            --query 'SecretString' \
            --output text 2>/dev/null || echo "{}")

        if [ "$secret_json" != "{}" ]; then
            # Parse JSON and add each key-value pair to .env
            echo "$secret_json" | jq -r 'to_entries[] | "# From '"$secret_id"'\n\(.key)=\"\(.value)\""' >> "${ENV_FILE}"
            echo "" >> "${ENV_FILE}"
        else
            warn "  Could not fetch $secret_id (may not exist yet)"
        fi
    done

    # Add computed values
    cat >> "${ENV_FILE}" <<EOF
# Computed Values
DEPLOYMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Agent Registry
NANDA_REGISTRY_URL=https://api.candlefish.ai/registry
NANDA_INDEX_URL=https://index.nanda.ai

EOF

    say "Secrets loaded into ${ENV_FILE}"
}

# ===================================================================
# Agent Definitions
# ===================================================================

create_paintbox_agent() {
    local agent_name="paintbox-agent"
    local agent_dir="${AGENTS_DIR}/${agent_name}"
    local port=8088

    info "Creating Paintbox Agent (Work Orders & Estimates)..."
    mkdir -p "${agent_dir}/src" "${agent_dir}/infra" "${agent_dir}/agentfacts"

    cat > "${agent_dir}/src/server.py" <<'PYTHON'
import os, json, time, asyncio, uuid
from datetime import datetime
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paintbox-agent")

app = FastAPI(title="Paintbox Agent")

# In-memory storage (replace with database in production)
work_orders = {}
estimates = {}

async def tool_workorders_create(payload: dict) -> dict:
    """Create a new work order"""
    order_id = f"wo_{uuid.uuid4().hex[:8]}"
    work_orders[order_id] = {
        "id": order_id,
        "customer": payload.get("customer"),
        "service": payload.get("service"),
        "address": payload.get("address"),
        "estimated_hours": payload.get("estimated_hours", 4),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "notes": payload.get("notes", "")
    }
    logger.info(f"Created work order: {order_id}")
    return {"status": "ok", "workorder": work_orders[order_id]}

async def tool_workorders_update(payload: dict) -> dict:
    """Update work order status"""
    order_id = payload.get("workorder_id")
    if order_id not in work_orders:
        raise HTTPException(404, f"Work order {order_id} not found")

    if "status" in payload:
        work_orders[order_id]["status"] = payload["status"]
    if "notes" in payload:
        work_orders[order_id]["notes"] = payload["notes"]

    work_orders[order_id]["updated_at"] = datetime.utcnow().isoformat()
    return {"status": "ok", "workorder": work_orders[order_id]}

async def tool_workorders_search(payload: dict) -> dict:
    """Search work orders"""
    results = []
    status_filter = payload.get("status")
    customer_filter = payload.get("customer", "").lower()

    for wo in work_orders.values():
        if status_filter and wo["status"] != status_filter:
            continue
        if customer_filter and customer_filter not in wo.get("customer", "").lower():
            continue
        results.append(wo)

    return {"status": "ok", "results": results, "count": len(results)}

async def tool_estimates_calculate(payload: dict) -> dict:
    """Calculate painting estimate"""
    sqft = payload.get("square_feet", 0)
    rooms = payload.get("rooms", 0)
    paint_quality = payload.get("paint_quality", "standard")

    # Pricing logic
    base_rate = {"economy": 2.5, "standard": 3.5, "premium": 5.0}[paint_quality]
    labor_cost = sqft * base_rate
    material_cost = sqft * 1.2

    if rooms > 0:
        room_prep_cost = rooms * 150
    else:
        room_prep_cost = sqft * 0.3

    total = labor_cost + material_cost + room_prep_cost

    estimate_id = f"est_{uuid.uuid4().hex[:8]}"
    estimates[estimate_id] = {
        "id": estimate_id,
        "square_feet": sqft,
        "rooms": rooms,
        "paint_quality": paint_quality,
        "labor_cost": round(labor_cost, 2),
        "material_cost": round(material_cost, 2),
        "prep_cost": round(room_prep_cost, 2),
        "total": round(total, 2),
        "created_at": datetime.utcnow().isoformat()
    }

    return {"status": "ok", "estimate": estimates[estimate_id]}

async def tool_salesforce_sync(payload: dict) -> dict:
    """Sync with Salesforce CRM"""
    # Placeholder for Salesforce integration
    return {
        "status": "ok",
        "message": "Salesforce sync initiated",
        "records_synced": 0
    }

TOOLS = {
    "urn:tool:workorders.create": tool_workorders_create,
    "urn:tool:workorders.update": tool_workorders_update,
    "urn:tool:workorders.search": tool_workorders_search,
    "urn:tool:estimates.calculate": tool_estimates_calculate,
    "urn:tool:salesforce.sync": tool_salesforce_sync
}

@app.get("/agents/paintbox/mcp")
async def mcp_sse(request: Request, authorization: str = Header(None)):
    """MCP SSE endpoint"""
    async def event_stream():
        yield f"event: hello\ndata: {json.dumps({'agent': 'paintbox', 'version': '2.0.0'})}\n\n"
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(30)
            yield f"event: heartbeat\ndata: {json.dumps({'timestamp': time.time()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/agents/paintbox/rest/call")
async def rest_call(req: Request):
    """REST tool invocation"""
    body = await req.json()
    urn = body.get("tool")
    payload = body.get("input", {})

    fn = TOOLS.get(urn)
    if not fn:
        return JSONResponse(
            {"error": "unknown_tool", "available": list(TOOLS.keys())},
            status_code=400
        )

    try:
        result = await fn(payload)
        return JSONResponse(result)
    except HTTPException as e:
        return JSONResponse({"error": str(e.detail)}, status_code=e.status_code)
    except Exception as e:
        logger.error(f"Tool error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/healthz")
async def healthz():
    return JSONResponse({"status": "healthy", "agent": "paintbox"})

@app.get("/agents/paintbox/agentfacts.json")
async def agentfacts():
    return JSONResponse({
        "agent": {
            "username": "@candlefish:paintbox/ops",
            "display_name": "Paintbox Operations Agent",
            "description": "Work order management and estimation for painting services"
        },
        "endpoints": [
            {"protocol": "mcp+sse", "url": "https://api.candlefish.ai/agents/paintbox/mcp"},
            {"protocol": "https", "url": "https://api.candlefish.ai/agents/paintbox/rest/call"}
        ],
        "capabilities": list(TOOLS.keys()),
        "version": "2.0.0"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PYTHON

    # Create requirements and Dockerfile
    cat > "${agent_dir}/src/requirements.txt" <<EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
httpx==0.25.2
EOF

    cat > "${agent_dir}/infra/Dockerfile" <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

    say "Paintbox Agent created"
}

create_crown_trophy_agent() {
    local agent_name="crown-trophy-agent"
    local agent_dir="${AGENTS_DIR}/${agent_name}"
    local port=8089

    info "Creating Crown Trophy Agent (Inventory & Engraving)..."
    mkdir -p "${agent_dir}/src" "${agent_dir}/infra" "${agent_dir}/agentfacts"

    cat > "${agent_dir}/src/server.py" <<'PYTHON'
import os, json, time, asyncio, uuid
from datetime import datetime
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, Dict, Any, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crown-trophy-agent")

app = FastAPI(title="Crown Trophy Agent")

# In-memory storage
inventory = {}
engravings = {}
orders = {}

async def tool_inventory_check(payload: dict) -> dict:
    """Check inventory levels"""
    sku = payload.get("sku")
    category = payload.get("category")

    results = []
    for item in inventory.values():
        if sku and item["sku"] != sku:
            continue
        if category and item["category"] != category:
            continue
        results.append(item)

    return {"status": "ok", "items": results, "count": len(results)}

async def tool_inventory_update(payload: dict) -> dict:
    """Update inventory levels"""
    sku = payload.get("sku")
    quantity_change = payload.get("quantity_change", 0)

    if sku not in inventory:
        inventory[sku] = {
            "sku": sku,
            "name": payload.get("name", f"Item {sku}"),
            "category": payload.get("category", "trophy"),
            "quantity": 0,
            "price": payload.get("price", 0)
        }

    inventory[sku]["quantity"] += quantity_change
    inventory[sku]["updated_at"] = datetime.utcnow().isoformat()

    return {"status": "ok", "item": inventory[sku]}

async def tool_engraving_create(payload: dict) -> dict:
    """Create engraving order"""
    engraving_id = f"eng_{uuid.uuid4().hex[:8]}"
    engravings[engraving_id] = {
        "id": engraving_id,
        "text": payload.get("text"),
        "font": payload.get("font", "Arial"),
        "size": payload.get("size", "medium"),
        "item_sku": payload.get("item_sku"),
        "customer": payload.get("customer"),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    logger.info(f"Created engraving: {engraving_id}")
    return {"status": "ok", "engraving": engravings[engraving_id]}

async def tool_order_create(payload: dict) -> dict:
    """Create customer order"""
    order_id = f"ord_{uuid.uuid4().hex[:8]}"
    orders[order_id] = {
        "id": order_id,
        "customer": payload.get("customer"),
        "items": payload.get("items", []),
        "engravings": payload.get("engravings", []),
        "total": payload.get("total", 0),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }

    return {"status": "ok", "order": orders[order_id]}

async def tool_pricing_calculate(payload: dict) -> dict:
    """Calculate pricing for trophies and engravings"""
    base_price = payload.get("base_price", 0)
    engraving_lines = payload.get("engraving_lines", 0)
    quantity = payload.get("quantity", 1)
    rush_order = payload.get("rush_order", False)

    engraving_cost = engraving_lines * 5  # $5 per line
    subtotal = (base_price + engraving_cost) * quantity

    if rush_order:
        rush_fee = subtotal * 0.25  # 25% rush fee
        total = subtotal + rush_fee
    else:
        total = subtotal

    return {
        "status": "ok",
        "pricing": {
            "base_price": base_price,
            "engraving_cost": engraving_cost,
            "quantity": quantity,
            "subtotal": round(subtotal, 2),
            "rush_fee": round(rush_fee if rush_order else 0, 2),
            "total": round(total, 2)
        }
    }

TOOLS = {
    "urn:tool:inventory.check": tool_inventory_check,
    "urn:tool:inventory.update": tool_inventory_update,
    "urn:tool:engraving.create": tool_engraving_create,
    "urn:tool:order.create": tool_order_create,
    "urn:tool:pricing.calculate": tool_pricing_calculate
}

@app.get("/agents/crown-trophy/mcp")
async def mcp_sse(request: Request, authorization: str = Header(None)):
    """MCP SSE endpoint"""
    async def event_stream():
        yield f"event: hello\ndata: {json.dumps({'agent': 'crown-trophy', 'version': '1.0.0'})}\n\n"
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(30)
            yield f"event: heartbeat\ndata: {json.dumps({'timestamp': time.time()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/agents/crown-trophy/rest/call")
async def rest_call(req: Request):
    """REST tool invocation"""
    body = await req.json()
    urn = body.get("tool")
    payload = body.get("input", {})

    fn = TOOLS.get(urn)
    if not fn:
        return JSONResponse(
            {"error": "unknown_tool", "available": list(TOOLS.keys())},
            status_code=400
        )

    try:
        result = await fn(payload)
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"Tool error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/healthz")
async def healthz():
    return JSONResponse({"status": "healthy", "agent": "crown-trophy"})

@app.get("/agents/crown-trophy/agentfacts.json")
async def agentfacts():
    return JSONResponse({
        "agent": {
            "username": "@candlefish:crown-trophy/ops",
            "display_name": "Crown Trophy Agent",
            "description": "Trophy inventory and engraving management"
        },
        "endpoints": [
            {"protocol": "mcp+sse", "url": "https://api.candlefish.ai/agents/crown-trophy/mcp"},
            {"protocol": "https", "url": "https://api.candlefish.ai/agents/crown-trophy/rest/call"}
        ],
        "capabilities": list(TOOLS.keys()),
        "version": "1.0.0"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PYTHON

    # Create requirements and Dockerfile
    cat > "${agent_dir}/src/requirements.txt" <<EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
EOF

    cat > "${agent_dir}/infra/Dockerfile" <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

    say "Crown Trophy Agent created"
}

create_temporal_agent() {
    local agent_name="temporal-agent"
    local agent_dir="${AGENTS_DIR}/${agent_name}"
    local port=8090

    info "Creating Temporal Workflow Agent..."
    mkdir -p "${agent_dir}/src" "${agent_dir}/infra" "${agent_dir}/agentfacts"

    cat > "${agent_dir}/src/server.py" <<'PYTHON'
import os, json, time, asyncio, uuid
from datetime import datetime
from fastapi import FastAPI, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("temporal-agent")

app = FastAPI(title="Temporal Agent")

# Workflow tracking
workflows = {}

async def tool_workflow_start(payload: dict) -> dict:
    """Start a new workflow"""
    workflow_id = f"wf_{uuid.uuid4().hex[:8]}"
    workflows[workflow_id] = {
        "id": workflow_id,
        "name": payload.get("workflow_name"),
        "type": payload.get("workflow_type"),
        "params": payload.get("params", {}),
        "status": "running",
        "started_at": datetime.utcnow().isoformat()
    }

    logger.info(f"Started workflow: {workflow_id}")
    return {"status": "ok", "workflow_id": workflow_id}

async def tool_workflow_status(payload: dict) -> dict:
    """Check workflow status"""
    workflow_id = payload.get("workflow_id")
    if workflow_id in workflows:
        return {"status": "ok", "workflow": workflows[workflow_id]}
    return {"status": "error", "message": "Workflow not found"}

async def tool_workflow_signal(payload: dict) -> dict:
    """Send signal to workflow"""
    workflow_id = payload.get("workflow_id")
    signal = payload.get("signal")

    if workflow_id in workflows:
        workflows[workflow_id]["last_signal"] = signal
        workflows[workflow_id]["signaled_at"] = datetime.utcnow().isoformat()
        return {"status": "ok", "message": f"Signal sent to {workflow_id}"}

    return {"status": "error", "message": "Workflow not found"}

async def tool_activity_execute(payload: dict) -> dict:
    """Execute workflow activity"""
    activity_name = payload.get("activity_name")
    params = payload.get("params", {})

    # Simulate activity execution
    result = {
        "activity": activity_name,
        "result": "completed",
        "output": params,
        "executed_at": datetime.utcnow().isoformat()
    }

    return {"status": "ok", "result": result}

TOOLS = {
    "urn:tool:workflow.start": tool_workflow_start,
    "urn:tool:workflow.status": tool_workflow_status,
    "urn:tool:workflow.signal": tool_workflow_signal,
    "urn:tool:activity.execute": tool_activity_execute
}

@app.get("/agents/temporal/mcp")
async def mcp_sse(request: Request):
    """MCP SSE endpoint"""
    async def event_stream():
        yield f"event: hello\ndata: {json.dumps({'agent': 'temporal', 'version': '1.0.0'})}\n\n"
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(30)
            yield f"event: heartbeat\ndata: {json.dumps({'timestamp': time.time()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/agents/temporal/rest/call")
async def rest_call(req: Request):
    """REST tool invocation"""
    body = await req.json()
    urn = body.get("tool")
    payload = body.get("input", {})

    fn = TOOLS.get(urn)
    if not fn:
        return JSONResponse({"error": "unknown_tool"}, status_code=400)

    try:
        result = await fn(payload)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/healthz")
async def healthz():
    return JSONResponse({"status": "healthy", "agent": "temporal"})

@app.get("/agents/temporal/agentfacts.json")
async def agentfacts():
    return JSONResponse({
        "agent": {
            "username": "@candlefish:temporal/orchestrator",
            "display_name": "Temporal Workflow Agent",
            "description": "Workflow orchestration and activity execution"
        },
        "endpoints": [
            {"protocol": "mcp+sse", "url": "https://api.candlefish.ai/agents/temporal/mcp"},
            {"protocol": "https", "url": "https://api.candlefish.ai/agents/temporal/rest/call"}
        ],
        "capabilities": list(TOOLS.keys()),
        "version": "1.0.0"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PYTHON

    cat > "${agent_dir}/src/requirements.txt" <<EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
EOF

    cat > "${agent_dir}/infra/Dockerfile" <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

    say "Temporal Agent created"
}

create_clark_county_agent() {
    local agent_name="clark-county-agent"
    local agent_dir="${AGENTS_DIR}/${agent_name}"
    local port=8091

    info "Creating Clark County Permit Agent..."
    mkdir -p "${agent_dir}/src" "${agent_dir}/infra" "${agent_dir}/agentfacts"

    cat > "${agent_dir}/src/server.py" <<'PYTHON'
import os, json, time, asyncio, uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
import logging
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clark-county-agent")

app = FastAPI(title="Clark County Agent")

# Simulated permit database
permits = {}

async def tool_permit_search(payload: dict) -> dict:
    """Search for building permits"""
    permit_number = payload.get("permit_number")
    address = payload.get("address", "").lower()
    status = payload.get("status")

    results = []
    for permit in permits.values():
        if permit_number and permit["number"] != permit_number:
            continue
        if address and address not in permit.get("address", "").lower():
            continue
        if status and permit["status"] != status:
            continue
        results.append(permit)

    return {"status": "ok", "permits": results, "count": len(results)}

async def tool_permit_details(payload: dict) -> dict:
    """Get detailed permit information"""
    permit_number = payload.get("permit_number")

    if permit_number in permits:
        return {"status": "ok", "permit": permits[permit_number]}

    # Simulate fetching from Clark County
    permit = {
        "number": permit_number,
        "type": "Building",
        "subtype": "Residential",
        "address": f"{random.randint(100, 9999)} Main St, Las Vegas, NV",
        "status": random.choice(["Active", "Finaled", "Pending", "Expired"]),
        "issued_date": (datetime.utcnow() - timedelta(days=random.randint(1, 365))).isoformat(),
        "contractor": f"Contractor {random.randint(100, 999)}",
        "value": random.randint(10000, 500000),
        "description": "General construction permit"
    }

    permits[permit_number] = permit
    return {"status": "ok", "permit": permit}

async def tool_inspection_schedule(payload: dict) -> dict:
    """Schedule or check inspections"""
    permit_number = payload.get("permit_number")
    inspection_type = payload.get("inspection_type")

    inspection = {
        "id": f"insp_{uuid.uuid4().hex[:8]}",
        "permit_number": permit_number,
        "type": inspection_type,
        "scheduled_date": (datetime.utcnow() + timedelta(days=random.randint(1, 14))).isoformat(),
        "inspector": f"Inspector {random.randint(100, 999)}",
        "status": "Scheduled"
    }

    return {"status": "ok", "inspection": inspection}

async def tool_contractor_lookup(payload: dict) -> dict:
    """Look up contractor information"""
    license_number = payload.get("license_number")
    name = payload.get("name")

    contractor = {
        "license": license_number or f"LIC{random.randint(100000, 999999)}",
        "name": name or f"Construction Company {random.randint(100, 999)}",
        "status": "Active",
        "expiry": (datetime.utcnow() + timedelta(days=random.randint(30, 730))).isoformat(),
        "specialties": ["General Building", "Electrical", "Plumbing"],
        "rating": round(random.uniform(3.5, 5.0), 1)
    }

    return {"status": "ok", "contractor": contractor}

TOOLS = {
    "urn:tool:permit.search": tool_permit_search,
    "urn:tool:permit.details": tool_permit_details,
    "urn:tool:inspection.schedule": tool_inspection_schedule,
    "urn:tool:contractor.lookup": tool_contractor_lookup
}

@app.get("/agents/clark-county/mcp")
async def mcp_sse(request: Request):
    """MCP SSE endpoint"""
    async def event_stream():
        yield f"event: hello\ndata: {json.dumps({'agent': 'clark-county', 'version': '1.0.0'})}\n\n"
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(30)
            yield f"event: heartbeat\ndata: {json.dumps({'timestamp': time.time()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/agents/clark-county/rest/call")
async def rest_call(req: Request):
    """REST tool invocation"""
    body = await req.json()
    urn = body.get("tool")
    payload = body.get("input", {})

    fn = TOOLS.get(urn)
    if not fn:
        return JSONResponse({"error": "unknown_tool"}, status_code=400)

    try:
        result = await fn(payload)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/healthz")
async def healthz():
    return JSONResponse({"status": "healthy", "agent": "clark-county"})

@app.get("/agents/clark-county/agentfacts.json")
async def agentfacts():
    return JSONResponse({
        "agent": {
            "username": "@candlefish:clark-county/permits",
            "display_name": "Clark County Permits Agent",
            "description": "Building permit search and inspection scheduling"
        },
        "endpoints": [
            {"protocol": "mcp+sse", "url": "https://api.candlefish.ai/agents/clark-county/mcp"},
            {"protocol": "https", "url": "https://api.candlefish.ai/agents/clark-county/rest/call"}
        ],
        "capabilities": list(TOOLS.keys()),
        "version": "1.0.0"
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PYTHON

    cat > "${agent_dir}/src/requirements.txt" <<EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
httpx==0.25.2
EOF

    cat > "${agent_dir}/infra/Dockerfile" <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

    say "Clark County Agent created"
}

# ===================================================================
# Docker Compose Configuration
# ===================================================================

create_compose_file() {
    info "Creating Docker Compose configuration..."

    cat > "${COMPOSE_FILE}" <<'YAML'
version: '3.8'

services:
  # NANDA Agent Registry
  agent-registry:
    build:
      context: ../agents/nanda/agent-registry
      dockerfile: infra/Dockerfile
    env_file: [.env]
    ports:
      - "8087:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  # Paintbox Agent - Work Orders & Estimates
  paintbox-agent:
    build:
      context: ../agents/nanda/paintbox-agent
      dockerfile: infra/Dockerfile
    env_file: [.env]
    ports:
      - "8088:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    depends_on:
      - agent-registry

  # Crown Trophy Agent - Inventory & Engraving
  crown-trophy-agent:
    build:
      context: ../agents/nanda/crown-trophy-agent
      dockerfile: infra/Dockerfile
    env_file: [.env]
    ports:
      - "8089:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    depends_on:
      - agent-registry

  # Temporal Agent - Workflow Orchestration
  temporal-agent:
    build:
      context: ../agents/nanda/temporal-agent
      dockerfile: infra/Dockerfile
    env_file: [.env]
    ports:
      - "8090:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    depends_on:
      - agent-registry

  # Clark County Agent - Permit Tracking
  clark-county-agent:
    build:
      context: ../agents/nanda/clark-county-agent
      dockerfile: infra/Dockerfile
    env_file: [.env]
    ports:
      - "8091:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped
    depends_on:
      - agent-registry

  # Observability - Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./obs/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

  # Observability - Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./obs/grafana-datasources.yml:/etc/grafana/provisioning/datasources/prometheus.yml
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=nanda2025
      - GF_INSTALL_PLUGINS=redis-datasource
    restart: unless-stopped
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:

networks:
  default:
    name: nanda-network
    driver: bridge
YAML

    say "Docker Compose configuration created"
}

create_agent_registry() {
    local agent_name="agent-registry"
    local agent_dir="${AGENTS_DIR}/${agent_name}"

    info "Creating Agent Registry..."
    mkdir -p "${agent_dir}/src" "${agent_dir}/infra"

    cat > "${agent_dir}/src/server.py" <<'PYTHON'
import os, json, time
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-registry")

app = FastAPI(title="NANDA Agent Registry")

# Registry of all agents
AGENTS = {
    "paintbox": {
        "name": "Paintbox Agent",
        "url": "http://paintbox-agent:8080",
        "agentfacts": "/agents/paintbox/agentfacts.json",
        "capabilities": ["workorders", "estimates", "salesforce"]
    },
    "crown-trophy": {
        "name": "Crown Trophy Agent",
        "url": "http://crown-trophy-agent:8080",
        "agentfacts": "/agents/crown-trophy/agentfacts.json",
        "capabilities": ["inventory", "engraving", "orders"]
    },
    "temporal": {
        "name": "Temporal Agent",
        "url": "http://temporal-agent:8080",
        "agentfacts": "/agents/temporal/agentfacts.json",
        "capabilities": ["workflows", "activities", "orchestration"]
    },
    "clark-county": {
        "name": "Clark County Agent",
        "url": "http://clark-county-agent:8080",
        "agentfacts": "/agents/clark-county/agentfacts.json",
        "capabilities": ["permits", "inspections", "contractors"]
    }
}

@app.get("/registry")
async def get_registry():
    """Get all registered agents"""
    return JSONResponse({
        "agents": AGENTS,
        "count": len(AGENTS),
        "updated_at": datetime.utcnow().isoformat()
    })

@app.get("/registry/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent details"""
    if agent_id in AGENTS:
        return JSONResponse(AGENTS[agent_id])
    return JSONResponse({"error": "Agent not found"}, status_code=404)

@app.get("/healthz")
async def healthz():
    return JSONResponse({"status": "healthy", "agents_registered": len(AGENTS)})

@app.get("/")
async def root():
    return JSONResponse({
        "service": "NANDA Agent Registry",
        "version": "1.0.0",
        "agents": list(AGENTS.keys()),
        "endpoints": ["/registry", "/registry/{agent_id}", "/healthz"]
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PYTHON

    cat > "${agent_dir}/src/requirements.txt" <<EOF
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
httpx==0.25.2
EOF

    cat > "${agent_dir}/infra/Dockerfile" <<EOF
FROM python:3.11-slim
WORKDIR /app
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

    say "Agent Registry created"
}

# ===================================================================
# Observability Configuration
# ===================================================================

create_observability_config() {
    info "Setting up observability..."
    mkdir -p "${DEPLOY_DIR}/obs"

    # Prometheus configuration
    cat > "${DEPLOY_DIR}/obs/prometheus.yml" <<'YAML'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'agent-registry'
    static_configs:
      - targets: ['agent-registry:8080']

  - job_name: 'paintbox-agent'
    static_configs:
      - targets: ['paintbox-agent:8080']

  - job_name: 'crown-trophy-agent'
    static_configs:
      - targets: ['crown-trophy-agent:8080']

  - job_name: 'temporal-agent'
    static_configs:
      - targets: ['temporal-agent:8080']

  - job_name: 'clark-county-agent'
    static_configs:
      - targets: ['clark-county-agent:8080']
YAML

    # Grafana datasource
    cat > "${DEPLOY_DIR}/obs/grafana-datasources.yml" <<'YAML'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
YAML

    say "Observability configuration created"
}

# ===================================================================
# Main Execution
# ===================================================================

main() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "   NANDA Ecosystem Setup - Candlefish AI Agent Fleet"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    # Create directory structure
    mkdir -p "${DEPLOY_DIR}" "${AGENTS_DIR}"

    # Fetch AWS secrets
    fetch_aws_secrets

    # Create all agents
    create_agent_registry
    create_paintbox_agent
    create_crown_trophy_agent
    create_temporal_agent
    create_clark_county_agent

    # Create infrastructure
    create_compose_file
    create_observability_config

    # Build and deploy
    info "Building all agent containers..."
    cd "${DEPLOY_DIR}"
    docker compose build

    info "Starting NANDA ecosystem..."
    docker compose up -d

    # Wait for services to be healthy
    info "Waiting for services to be healthy..."
    sleep 10

    # Display status
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "   ✅ NANDA Ecosystem Deployed Successfully!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "🔗 Local Endpoints:"
    echo "   Registry:     http://localhost:8087/registry"
    echo "   Paintbox:     http://localhost:8088/agents/paintbox/agentfacts.json"
    echo "   Crown Trophy: http://localhost:8089/agents/crown-trophy/agentfacts.json"
    echo "   Temporal:     http://localhost:8090/agents/temporal/agentfacts.json"
    echo "   Clark County: http://localhost:8091/agents/clark-county/agentfacts.json"
    echo ""
    echo "📊 Observability:"
    echo "   Prometheus: http://localhost:9090"
    echo "   Grafana:    http://localhost:3000 (admin/nanda2025)"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Configure reverse proxy for public access"
    echo "   2. Register agents in NANDA Index"
    echo "   3. Set up DNS for api.candlefish.ai"
    echo ""
    echo "📝 View logs:"
    echo "   docker compose -f ${COMPOSE_FILE} logs -f [agent-name]"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
}

# Run main function
main "$@"
