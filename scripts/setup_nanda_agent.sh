#!/usr/bin/env bash
set -euo pipefail

# === Config (edit if you want different names/ports) ==========================
REPO_ROOT="/Users/patricksmith/candlefish-ai"
AGENT_NAME="paintbox-agent"
AGENT_DIR="${REPO_ROOT}/agents/nanda/${AGENT_NAME}"
AGENT_USERNAME="@candlefish:paintbox/ops"
SERVICE_PORT=8088         # host port -> container 8080
SERVICE_PATH="agents/paintbox"
DOMAIN="api.nanda.candlefish.ai"     # change if using another host
IMAGE_REG="ghcr.io"                   # or your registry
IMAGE_NAME="paintbox-agent"
NODE="python"                         # language runtime for this agent

# Secrets (expected to be exported by your root-operator or shell)
: "${AWS_REGION:=us-west-2}"
: "${GITHUB_REPOSITORY:=candlefish-ai/candlefish-ai}"
: "${JWT_ISSUER:=https://${DOMAIN}}"

# JWKS location (optional: if you already have one, set JWKS_URL accordingly)
JWKS_URL="https://${DOMAIN}/.well-known/jwks.json"

# Compose / paths
DEPLOY_DIR="${REPO_ROOT}/deploy"
OBS_DIR="${DEPLOY_DIR}/obs"
COMPOSE_FILE="${DEPLOY_DIR}/compose.yml"

# === Helpers =================================================================
say() { printf "\033[1;32m%s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m%s\033[0m\n" "$*"; }
die() { printf "\033[1;31mERROR: %s\033[0m\n" "$*" >&2; exit 1; }

# === Sanity checks ============================================================
command -v docker >/dev/null || die "docker not installed"
command -v docker compose >/dev/null || die "docker compose not installed"
command -v jq >/dev/null || die "jq not installed"
[ -d "${REPO_ROOT}" ] || die "Repo root not found: ${REPO_ROOT}"

# Create compose file if it doesn't exist
if [ ! -f "${COMPOSE_FILE}" ]; then
  say "Creating compose.yml..."
  mkdir -p "${DEPLOY_DIR}"
  cat > "${COMPOSE_FILE}" <<'COMPOSE'
version: '3.8'
services:
  # NANDA agents will be added here
COMPOSE
fi

say "Scaffolding NANDA agent: ${AGENT_NAME}"

# === Filesystem scaffold ======================================================
mkdir -p "${AGENT_DIR}/src" "${AGENT_DIR}/infra" "${AGENT_DIR}/agentfacts"

# server.py (minimal FastAPI MCP+REST)
cat > "${AGENT_DIR}/src/server.py" <<'PY'
import os, json, time, asyncio
from fastapi import FastAPI, Request, Header, Response
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional

app = FastAPI()

# Tool implementations
async def tool_workorders_create(payload: dict):
    """Create a new work order for painting services"""
    return {
        "status": "ok",
        "workorder_id": f"wo_{int(time.time())}",
        "created_at": time.time(),
        "customer": payload.get("customer", "Unknown"),
        "service": payload.get("service", "Painting"),
        "estimated_hours": payload.get("estimated_hours", 4)
    }

async def tool_workorders_search(payload: dict):
    """Search work orders by status or customer"""
    return {
        "status": "ok",
        "results": [
            {
                "workorder_id": "wo_1234567890",
                "customer": "Acme Corp",
                "service": "Interior Painting",
                "status": "in_progress"
            }
        ],
        "count": 1
    }

async def tool_estimates_calculate(payload: dict):
    """Calculate painting estimate based on square footage"""
    sqft = payload.get("square_feet", 0)
    rate = payload.get("rate_per_sqft", 3.5)
    return {
        "status": "ok",
        "square_feet": sqft,
        "rate_per_sqft": rate,
        "labor_cost": sqft * rate,
        "materials_cost": sqft * 1.2,
        "total_estimate": sqft * (rate + 1.2)
    }

TOOLS = {
    "urn:tool:workorders.create": tool_workorders_create,
    "urn:tool:workorders.search": tool_workorders_search,
    "urn:tool:estimates.calculate": tool_estimates_calculate
}

@app.get("/agents/paintbox/mcp")
async def mcp_sse(request: Request, authorization: str = Header(None)):
    """MCP SSE endpoint for real-time agent communication"""
    async def event_stream():
        # Send initial connection
        yield f"event: hello\ndata: {json.dumps({'agent': 'paintbox', 'version': '1.0.0'})}\n\n"

        # Keep connection alive with heartbeats
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(10)
            yield f"event: heartbeat\ndata: {json.dumps({'timestamp': time.time()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/agents/paintbox/rest/call")
async def rest_call(req: Request, authorization: str = Header(None)):
    """REST endpoint for synchronous tool calls"""
    body = await req.json()
    urn = body.get("tool")
    payload = body.get("input", {})

    fn = TOOLS.get(urn)
    if not fn:
        return JSONResponse({"error": "unknown_tool", "available": list(TOOLS.keys())}, status_code=400)

    try:
        result = await fn(payload)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/healthz")
async def healthz():
    """Health check endpoint"""
    return Response(content="ok", media_type="text/plain")

@app.get("/agents/paintbox/agentfacts.json")
async def agentfacts():
    """Serve AgentFacts manifest"""
    here = os.path.dirname(__file__)
    agentfacts_path = os.path.join(here, "..", "agentfacts", "paintbox.agentfacts.json")
    with open(agentfacts_path) as f:
        return JSONResponse(json.load(f))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
PY

# requirements
cat > "${AGENT_DIR}/src/requirements.txt" <<'REQ'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
REQ

# Dockerfile
cat > "${AGENT_DIR}/infra/Dockerfile" <<'DOCK'
FROM python:3.11-slim
WORKDIR /app
COPY ./src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./src ./src
COPY ./agentfacts ./agentfacts
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
DOCK

# AgentFacts
cat > "${AGENT_DIR}/agentfacts/paintbox.agentfacts.json" <<JSON
{
  "agent": {
    "username": "${AGENT_USERNAME}",
    "display_name": "Paintbox Ops Agent",
    "description": "Work order management and estimate calculation for painting services",
    "owner": {
      "did": "did:key:z6MkCandlefishOwnerDID",
      "org": "Candlefish.ai"
    }
  },
  "endpoints": [
    {
      "protocol": "mcp+sse",
      "url": "https://${DOMAIN}/${SERVICE_PATH}/mcp",
      "description": "MCP SSE endpoint for real-time communication"
    },
    {
      "protocol": "https",
      "url": "https://${DOMAIN}/${SERVICE_PATH}/rest/call",
      "description": "REST endpoint for synchronous tool calls"
    }
  ],
  "capabilities": [
    {
      "urn": "urn:tool:workorders.create",
      "description": "Create new painting work orders",
      "input_schema": {
        "type": "object",
        "properties": {
          "customer": {"type": "string"},
          "service": {"type": "string"},
          "estimated_hours": {"type": "number"}
        }
      }
    },
    {
      "urn": "urn:tool:workorders.search",
      "description": "Search existing work orders",
      "input_schema": {
        "type": "object",
        "properties": {
          "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]},
          "customer": {"type": "string"}
        }
      }
    },
    {
      "urn": "urn:tool:estimates.calculate",
      "description": "Calculate painting estimates based on square footage",
      "input_schema": {
        "type": "object",
        "properties": {
          "square_feet": {"type": "number"},
          "rate_per_sqft": {"type": "number"}
        },
        "required": ["square_feet"]
      }
    }
  ],
  "auth": {
    "method": "bearer",
    "jwks_url": "${JWKS_URL}"
  },
  "compliance": ["gdpr:na", "pci:none"],
  "version": "1.0.0",
  "ttl_seconds": 3600,
  "metadata": {
    "language": "python",
    "framework": "fastapi",
    "deployment": "docker"
  }
}
JSON

# === Compose injection (idempotent) ==========================================
SERVICE_BLOCK=$(cat <<YAML

  ${AGENT_NAME}:
    build:
      context: ../agents/nanda/${AGENT_NAME}
      dockerfile: infra/Dockerfile
    environment:
      - JWT_ISSUER=${JWT_ISSUER}
      - AWS_REGION=${AWS_REGION}
    ports:
      - "${SERVICE_PORT}:8080"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
YAML
)

if ! grep -q "${AGENT_NAME}:" "${COMPOSE_FILE}"; then
  say "Adding ${AGENT_NAME} service to compose.yml"
  # Append to the end of the file
  echo "${SERVICE_BLOCK}" >> "${COMPOSE_FILE}"
else
  warn "compose.yml already contains ${AGENT_NAME}; skipping injection"
fi

# === Build & up ===============================================================
say "Building container image..."
cd "${DEPLOY_DIR}"
docker compose build "${AGENT_NAME}"

say "Starting stack (this may also start other services in compose)..."
docker compose up -d "${AGENT_NAME}"

# Wait for service to be healthy
say "Waiting for service to be healthy..."
for i in {1..30}; do
  if curl -sf "http://localhost:${SERVICE_PORT}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# === Smoke tests ==============================================================
say "Running smoke tests..."

say "1. Health check:"
if curl -sf "http://localhost:${SERVICE_PORT}/healthz" >/dev/null; then
  say "   ✓ Health endpoint responding"
else
  warn "   ✗ Health endpoint not responding"
fi

say "2. AgentFacts check:"
AF_JSON=$(curl -sf "http://localhost:${SERVICE_PORT}/${SERVICE_PATH}/agentfacts.json" 2>/dev/null)
if [ $? -eq 0 ]; then
  say "   ✓ AgentFacts endpoint responding"
  echo "${AF_JSON}" | jq -r '.agent.display_name' | sed 's/^/   Agent: /'
else
  warn "   ✗ AgentFacts endpoint not responding"
fi

say "3. REST tool test:"
TEST_PAYLOAD='{"tool":"urn:tool:estimates.calculate","input":{"square_feet":1000}}'
RESULT=$(curl -sf -X POST "http://localhost:${SERVICE_PORT}/${SERVICE_PATH}/rest/call" \
  -H "Content-Type: application/json" \
  -d "${TEST_PAYLOAD}" 2>/dev/null)
if [ $? -eq 0 ]; then
  say "   ✓ REST endpoint responding"
  echo "${RESULT}" | jq -r '.total_estimate' | sed 's/^/   Estimate for 1000 sqft: $/'
else
  warn "   ✗ REST endpoint not responding"
fi

# === Registry tag hint (optional push from your laptop) =======================
IMG_TAG="${IMAGE_REG}/${GITHUB_REPOSITORY}/${IMAGE_NAME}:latest"
say "Tagging image for optional push: ${IMG_TAG}"
CONTAINER_ID=$(docker compose ps -q "${AGENT_NAME}")
if [ -n "${CONTAINER_ID}" ]; then
  IMAGE_ID=$(docker inspect "${CONTAINER_ID}" --format='{{.Image}}')
  docker tag "${IMAGE_ID}" "${IMG_TAG}" 2>/dev/null || true
fi

# === Final output =============================================================
PUBLIC_AF_URL="https://${DOMAIN}/${SERVICE_PATH}/agentfacts.json"
say ""
say "════════════════════════════════════════════════════════════════════"
say "✅ NANDA Agent '${AGENT_NAME}' deployed successfully!"
say "════════════════════════════════════════════════════════════════════"
say ""
say "Local endpoints:"
say "  Health:     http://localhost:${SERVICE_PORT}/healthz"
say "  AgentFacts: http://localhost:${SERVICE_PORT}/${SERVICE_PATH}/agentfacts.json"
say "  REST:       http://localhost:${SERVICE_PORT}/${SERVICE_PATH}/rest/call"
say ""
say "Public endpoints (via reverse proxy):"
say "  MCP SSE:    https://${DOMAIN}/${SERVICE_PATH}/mcp"
say "  REST tool:  https://${DOMAIN}/${SERVICE_PATH}/rest/call"
say "  AgentFacts: ${PUBLIC_AF_URL}"
say ""
say "Next steps:"
say "  1. Verify agent is running: docker compose ps ${AGENT_NAME}"
say "  2. Test a tool call:"
say "     curl -X POST http://localhost:${SERVICE_PORT}/${SERVICE_PATH}/rest/call \\"
say "       -H 'Content-Type: application/json' \\"
say "       -d '{\"tool\":\"urn:tool:workorders.create\",\"input\":{\"customer\":\"Test\"}}'"
say "  3. Register in NANDA Index with this AgentFacts URL:"
say "     ${PUBLIC_AF_URL}"
say ""
say "Optional: Push to registry:"
say "  docker push ${IMG_TAG}"
say "════════════════════════════════════════════════════════════════════"
