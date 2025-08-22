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
