import json
import time
import asyncio
import uuid
from datetime import datetime
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
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
        "notes": payload.get("notes", ""),
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
        "created_at": datetime.utcnow().isoformat(),
    }

    return {"status": "ok", "estimate": estimates[estimate_id]}


async def tool_salesforce_sync(payload: dict) -> dict:
    """Sync with Salesforce CRM"""
    # Placeholder for Salesforce integration
    return {"status": "ok", "message": "Salesforce sync initiated", "records_synced": 0}


TOOLS = {
    "urn:tool:workorders.create": tool_workorders_create,
    "urn:tool:workorders.update": tool_workorders_update,
    "urn:tool:workorders.search": tool_workorders_search,
    "urn:tool:estimates.calculate": tool_estimates_calculate,
    "urn:tool:salesforce.sync": tool_salesforce_sync,
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
            {"error": "unknown_tool", "available": list(TOOLS.keys())}, status_code=400
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
    return JSONResponse(
        {
            "agent": {
                "username": "@candlefish:paintbox/ops",
                "display_name": "Paintbox Operations Agent",
                "description": "Work order management and estimation for painting services",
            },
            "endpoints": [
                {"protocol": "mcp+sse", "url": "https://api.candlefish.ai/agents/paintbox/mcp"},
                {"protocol": "https", "url": "https://api.candlefish.ai/agents/paintbox/rest/call"},
            ],
            "capabilities": list(TOOLS.keys()),
            "version": "2.0.0",
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
