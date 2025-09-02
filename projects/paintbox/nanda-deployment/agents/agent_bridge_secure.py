# agent_bridge_secure.py
# Secure version using AWS Secrets Manager
import os
import sys
import uuid
import traceback
import json
import threading
import requests
from typing import Optional
from datetime import datetime
from anthropic import Anthropic, APIStatusError
from python_a2a import (
    A2AServer,
    A2AClient,
    run_server,
    Message,
    TextContent,
    MessageRole,
    ErrorContent,
)

# MongoDB
from pymongo import MongoClient
import asyncio
from mcp_utils import MCPClient
import base64

# Add parent directory to path for aws_secrets module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../')))

# Import AWS Secrets Manager integration
try:
    from lib.aws_secrets import get_env_or_secret, get_secrets_manager
    USE_AWS_SECRETS = True
except ImportError:
    print("[agent_bridge] WARNING: AWS Secrets Manager not available, using environment variables")
    USE_AWS_SECRETS = False
    
    def get_env_or_secret(env_var, secret_name, secret_key=None):
        return os.getenv(env_var)

sys.stdout.reconfigure(line_buffering=True)

# Get API keys from AWS Secrets Manager or environment variables
if USE_AWS_SECRETS:
    secrets_mgr = get_secrets_manager()
    
    # Get Anthropic API key
    ANTHROPIC_API_KEY = get_env_or_secret(
        "ANTHROPIC_API_KEY", 
        "candlefish/api/anthropic", 
        "api_key"
    )
    
    # Get MongoDB credentials
    try:
        mongo_creds = secrets_mgr.get_database_credentials()
        MONGO_URI = mongo_creds.get('uri') or os.getenv("MONGODB_URI")
    except Exception:
        MONGO_URI = os.getenv("MONGODB_URI")
    
    # Get Smithery API key
    SMITHERY_API_KEY = get_env_or_secret(
        "SMITHERY_API_KEY",
        "candlefish/api/smithery",
        "api_key"
    )
else:
    # Fallback to environment variables only
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
    SMITHERY_API_KEY = os.getenv("SMITHERY_API_KEY")

# Validate required credentials
if not ANTHROPIC_API_KEY:
    print("[agent_bridge] ERROR: ANTHROPIC_API_KEY not found in environment or AWS Secrets Manager")
    sys.exit(1)

# Toggle for message improvement feature
IMPROVE_MESSAGES = os.getenv("IMPROVE_MESSAGES", "true").lower() in ("true", "1", "yes", "y")

# Create Anthropic client with explicit API key
anthropic = Anthropic(api_key=ANTHROPIC_API_KEY)

# Get agent configuration from environment variables
AGENT_ID = os.getenv("AGENT_ID", "default")  # Default to 'default' if not specified
PORT = int(os.getenv("PORT", "6000"))
TERMINAL_PORT = int(os.getenv("TERMINAL_PORT", "6010"))

# Local terminal URL
LOCAL_TERMINAL_URL = f"http://localhost:{TERMINAL_PORT}/a2a"

# UI client support
UI_MODE = os.getenv("UI_MODE", "false").lower() in ("true", "1", "yes", "y")
UI_CLIENT_URL = os.getenv("UI_CLIENT_URL", "")
registered_ui_clients = set()

# Set up logging directory
LOG_DIR = os.getenv("LOG_DIR", "conversation_logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Configure system prompts based on agent ID (examples from the original code)
SYSTEM_PROMPTS = {
    "default": "You are Claude assisting a user (Agent). Assume the messages you get are part of a conversation with other agents. Help the user communicate effectively with other agents."
}

# Configure message improvement prompts
IMPROVE_MESSAGE_PROMPTS = {
    "default": "Improve the following message to make it more clear, compelling, and professional without changing the core content or adding fictional information. Keep the same overall meaning but enhance the phrasing and structure. Don't make it too verbose - keep it concise but impactful. Return only the improved message without explanations or introductions."
}

# Allow custom DB name via env
MONGO_DBNAME = os.getenv("MONGODB_DB", "iot_agents_db")
MCP_REGISTRY = "mcp_registry"

# MongoDB connection with error handling
USE_MONGO = False
if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command("ping")
        mongo_db = mongo_client[MONGO_DBNAME]
        mcp_registry_col = mongo_db[MCP_REGISTRY]
        messages_col = mongo_db["messages"]
        USE_MONGO = True
        print("[agent_bridge] Connected to MongoDB (secure), message logs will be persisted.")
    except Exception as e:
        print(
            f"[agent_bridge] WARNING: Could not connect to MongoDB ({e}). Falling back to file-only logging."
        )
        USE_MONGO = False
else:
    print("[agent_bridge] WARNING: MongoDB URI not configured. Using file-only logging.")

def get_registry_url():
    """Get the registry URL from file or use default"""
    try:
        if os.path.exists("registry_url.txt"):
            with open("registry_url.txt", "r") as f:
                registry_url = f.read().strip()
                return registry_url
    except Exception:
        pass
    return "http://localhost:5000"  # Default registry URL

# Rest of the agent_bridge.py code continues here...
# (The actual implementation would include all the remaining functions from the original file)