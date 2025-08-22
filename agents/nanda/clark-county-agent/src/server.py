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
