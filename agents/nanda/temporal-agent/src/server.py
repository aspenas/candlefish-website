import json
import time
import asyncio
import uuid
from datetime import datetime
from fastapi import FastAPI, Request
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
        "started_at": datetime.utcnow().isoformat(),
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
        "executed_at": datetime.utcnow().isoformat(),
    }

    return {"status": "ok", "result": result}


TOOLS = {
    "urn:tool:workflow.start": tool_workflow_start,
    "urn:tool:workflow.status": tool_workflow_status,
    "urn:tool:workflow.signal": tool_workflow_signal,
    "urn:tool:activity.execute": tool_activity_execute,
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
    return JSONResponse(
        {
            "agent": {
                "username": "@candlefish:temporal/orchestrator",
                "display_name": "Temporal Workflow Agent",
                "description": "Workflow orchestration and activity execution",
            },
            "endpoints": [
                {"protocol": "mcp+sse", "url": "https://api.candlefish.ai/agents/temporal/mcp"},
                {"protocol": "https", "url": "https://api.candlefish.ai/agents/temporal/rest/call"},
            ],
            "capabilities": list(TOOLS.keys()),
            "version": "1.0.0",
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
