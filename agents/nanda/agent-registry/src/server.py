from datetime import datetime
from fastapi import FastAPI
from fastapi.responses import JSONResponse
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
        "capabilities": ["workorders", "estimates", "salesforce"],
    },
    "crown-trophy": {
        "name": "Crown Trophy Agent",
        "url": "http://crown-trophy-agent:8080",
        "agentfacts": "/agents/crown-trophy/agentfacts.json",
        "capabilities": ["inventory", "engraving", "orders"],
    },
    "temporal": {
        "name": "Temporal Agent",
        "url": "http://temporal-agent:8080",
        "agentfacts": "/agents/temporal/agentfacts.json",
        "capabilities": ["workflows", "activities", "orchestration"],
    },
    "clark-county": {
        "name": "Clark County Agent",
        "url": "http://clark-county-agent:8080",
        "agentfacts": "/agents/clark-county/agentfacts.json",
        "capabilities": ["permits", "inspections", "contractors"],
    },
}


@app.get("/registry")
async def get_registry():
    """Get all registered agents"""
    return JSONResponse(
        {"agents": AGENTS, "count": len(AGENTS), "updated_at": datetime.utcnow().isoformat()}
    )


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
    return JSONResponse(
        {
            "service": "NANDA Agent Registry",
            "version": "1.0.0",
            "agents": list(AGENTS.keys()),
            "endpoints": ["/registry", "/registry/{agent_id}", "/healthz"],
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
