"""
Test configuration and fixtures for RTPM API tests
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
import json
import random

# Import the app
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_connection_manager():
    """Mock WebSocket connection manager"""
    mock_manager = MagicMock()
    mock_manager.active_connections = []
    mock_manager.connect = AsyncMock()
    mock_manager.disconnect = MagicMock()
    mock_manager.send_personal_message = AsyncMock()
    mock_manager.broadcast = AsyncMock()
    return mock_manager


@pytest.fixture
def sample_agent():
    """Sample agent data"""
    return {
        "id": "agent-001",
        "name": "Test Agent 001",
        "status": "online",
        "version": "v1.2.3",
        "capabilities": ["monitoring", "analysis"],
        "lastSeen": datetime.utcnow().isoformat(),
        "region": "us-east-1",
        "platform": "OpenAI",
    }


@pytest.fixture
def sample_agent_metrics():
    """Sample agent metrics data"""
    return {
        "agentId": "agent-001",
        "timestamp": datetime.utcnow().isoformat(),
        "cpu": 45.5,
        "memory": 62.3,
        "requestRate": 150.2,
        "errorRate": 2.1,
        "responseTime": 95.7,
        "throughput": 200.0,
        "activeConnections": 25,
        "queueDepth": 5,
        "diskUsage": 35.8,
        "networkLatency": 12.3,
    }


@pytest.fixture
def sample_alert():
    """Sample alert configuration"""
    return {
        "id": "alert-001",
        "agentId": "agent-001",
        "name": "High CPU Usage",
        "description": "Alert when CPU usage exceeds threshold",
        "metric": "cpu",
        "operator": "gt",
        "threshold": 80.0,
        "actions": [
            {"type": "email", "config": {"recipients": ["admin@example.com"]}, "enabled": True}
        ],
        "enabled": True,
        "severity": "warning",
        "cooldownPeriod": 300,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def sample_realtime_metrics():
    """Sample real-time system metrics"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "agents": {"total": 100, "online": 85, "offline": 10, "warning": 3, "error": 2},
        "system": {
            "avgCpu": 45.2,
            "avgMemory": 58.7,
            "avgResponseTime": 125.3,
            "requestRate": 1250.5,
            "errorRate": 1.8,
            "throughput": 2000.0,
            "activeConnections": 450,
        },
        "network": {"latency": 15.2, "bandwidth": 850.7, "packetLoss": 0.02},
    }


@pytest.fixture
def sample_agents_list():
    """Generate a list of sample agents for testing"""
    agents = []
    statuses = ["online", "offline", "warning", "error", "maintenance"]
    platforms = ["OpenAI", "Anthropic", "Google"]
    regions = ["us-east-1", "us-west-2", "eu-west-1"]

    for i in range(50):
        agent = {
            "id": f"agent-{str(i+1).zfill(3)}",
            "name": f"Agent-{str(i+1).zfill(3)}",
            "status": random.choice(statuses),
            "version": f"v{random.randint(1,3)}.{random.randint(0,9)}.{random.randint(0,9)}",
            "capabilities": random.sample(
                ["monitoring", "analysis", "reporting", "alerting"], k=random.randint(1, 3)
            ),
            "lastSeen": (datetime.utcnow() - timedelta(minutes=random.randint(0, 60))).isoformat(),
            "region": random.choice(regions),
            "platform": random.choice(platforms),
            "tags": [f"tag-{random.randint(1,5)}"],
        }
        agents.append(agent)

    return agents


@pytest.fixture
def sample_large_agents_list():
    """Generate a large list of agents for performance testing"""
    agents = []
    statuses = ["online", "offline", "warning", "error", "maintenance"]
    platforms = ["OpenAI", "Anthropic", "Google", "Cohere", "HuggingFace"]
    regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"]

    for i in range(1000):
        agent = {
            "id": f"agent-{str(i+1).zfill(4)}",
            "name": f"Agent-{str(i+1).zfill(4)}",
            "status": random.choice(statuses),
            "version": f"v{random.randint(1,5)}.{random.randint(0,9)}.{random.randint(0,9)}",
            "capabilities": random.sample(
                ["monitoring", "analysis", "reporting", "alerting", "optimization"],
                k=random.randint(1, 4),
            ),
            "lastSeen": (
                datetime.utcnow() - timedelta(minutes=random.randint(0, 1440))
            ).isoformat(),
            "region": random.choice(regions),
            "platform": random.choice(platforms),
            "tags": [
                f"tag-{random.randint(1,10)}",
                f"env-{random.choice(['prod', 'staging', 'dev'])}",
            ],
        }
        agents.append(agent)

    return agents


@pytest.fixture
def sample_metrics_history():
    """Generate historical metrics data"""
    base_time = datetime.utcnow() - timedelta(hours=24)
    metrics_history = []

    for i in range(288):  # 24 hours worth of 5-minute intervals
        timestamp = base_time + timedelta(minutes=i * 5)

        for agent_id in [f"agent-{str(j+1).zfill(3)}" for j in range(10)]:
            metrics = {
                "agentId": agent_id,
                "timestamp": timestamp.isoformat(),
                "cpu": random.uniform(20, 80) + random.uniform(-10, 10),
                "memory": random.uniform(30, 70) + random.uniform(-5, 5),
                "requestRate": random.uniform(100, 500) + random.uniform(-50, 50),
                "errorRate": random.uniform(0, 5) + random.uniform(-1, 1),
                "responseTime": random.uniform(50, 200) + random.uniform(-20, 20),
                "throughput": random.uniform(150, 600) + random.uniform(-50, 50),
                "activeConnections": random.randint(10, 100),
                "queueDepth": random.randint(0, 20),
                "diskUsage": random.uniform(20, 60) + random.uniform(-5, 5),
                "networkLatency": random.uniform(5, 50) + random.uniform(-5, 5),
            }
            # Ensure values stay within reasonable bounds
            for key in ["cpu", "memory", "errorRate", "diskUsage"]:
                if key in metrics:
                    metrics[key] = max(0, min(100, metrics[key]))

            metrics_history.append(metrics)

    return metrics_history


@pytest.fixture
def sample_alert_history():
    """Generate sample alert history"""
    alert_history = []
    base_time = datetime.utcnow() - timedelta(days=7)

    for i in range(20):
        alert = {
            "id": f"alert-history-{i+1}",
            "alertId": f"alert-{random.randint(1, 5):03d}",
            "agentId": f"agent-{random.randint(1, 10):03d}",
            "triggeredAt": (base_time + timedelta(hours=random.randint(0, 168))).isoformat(),
            "resolvedAt": None
            if random.random() < 0.3
            else (
                base_time + timedelta(hours=random.randint(0, 168), minutes=random.randint(10, 120))
            ).isoformat(),
            "value": random.uniform(80, 100),
            "threshold": 80.0,
            "severity": random.choice(["warning", "error", "critical"]),
            "message": f"Alert {i+1} triggered",
            "acknowledged": random.random() > 0.4,
            "acknowledgedBy": f"user-{random.randint(1, 5)}" if random.random() > 0.5 else None,
            "acknowledgedAt": None,
        }

        if alert["acknowledged"] and alert["acknowledgedBy"]:
            alert["acknowledgedAt"] = (
                base_time + timedelta(hours=random.randint(0, 168), minutes=random.randint(5, 60))
            ).isoformat()

        alert_history.append(alert)

    return alert_history


@pytest.fixture
def mock_database():
    """Mock database for testing"""

    class MockDB:
        def __init__(self):
            self.agents = {}
            self.metrics = {}
            self.alerts = {}
            self.alert_history = {}

        async def get_agents(self, filters=None):
            return list(self.agents.values())

        async def get_agent(self, agent_id):
            return self.agents.get(agent_id)

        async def create_agent(self, agent_data):
            agent_id = agent_data["id"]
            self.agents[agent_id] = agent_data
            return agent_data

        async def update_agent(self, agent_id, agent_data):
            if agent_id in self.agents:
                self.agents[agent_id].update(agent_data)
                return self.agents[agent_id]
            return None

        async def delete_agent(self, agent_id):
            return self.agents.pop(agent_id, None) is not None

        async def get_agent_metrics(self, agent_id, time_range=None):
            return self.metrics.get(agent_id, [])

        async def store_metrics(self, metrics_data):
            agent_id = metrics_data["agentId"]
            if agent_id not in self.metrics:
                self.metrics[agent_id] = []
            self.metrics[agent_id].append(metrics_data)
            return True

        async def get_alerts(self):
            return list(self.alerts.values())

        async def create_alert(self, alert_data):
            alert_id = alert_data["id"]
            self.alerts[alert_id] = alert_data
            return alert_data

        async def update_alert(self, alert_id, alert_data):
            if alert_id in self.alerts:
                self.alerts[alert_id].update(alert_data)
                return self.alerts[alert_id]
            return None

        async def delete_alert(self, alert_id):
            return self.alerts.pop(alert_id, None) is not None

        async def get_alert_history(self, filters=None):
            return list(self.alert_history.values())

        async def store_alert_history(self, alert_history_data):
            history_id = alert_history_data["id"]
            self.alert_history[history_id] = alert_history_data
            return alert_history_data

    return MockDB()


@pytest.fixture
def websocket_test_client():
    """WebSocket test client"""
    from starlette.testclient import TestClient

    return TestClient(app)


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# Performance test fixtures
@pytest.fixture
def performance_config():
    """Configuration for performance tests"""
    return {
        "concurrent_requests": 100,
        "test_duration": 30,  # seconds
        "ramp_up_time": 5,  # seconds
        "max_response_time": 1000,  # milliseconds
        "error_rate_threshold": 0.01,  # 1%
    }


# Mock AWS services for testing
@pytest.fixture
def mock_aws_secrets():
    """Mock AWS Secrets Manager"""

    class MockSecretsManager:
        def __init__(self):
            self.secrets = {
                "candlefish-database-production": {"host": "localhost", "port": 5432},
                "candlefish-redis-production": {"host": "localhost", "port": 6379},
                "candlefish-auth-secrets-production": {"secret_key": "test-secret"},
                "candlefish-jwt-keys-production": {"private_key": "test-key"},
                "candlefish-api-keys-production": {"openai": "test-api-key"},
            }

        def describe_secret(self, SecretId):
            if SecretId not in self.secrets:
                from botocore.exceptions import ClientError

                raise ClientError(
                    {"Error": {"Code": "ResourceNotFoundException"}}, "DescribeSecret"
                )
            return {"Name": SecretId}

        def get_secret_value(self, SecretId):
            if SecretId not in self.secrets:
                from botocore.exceptions import ClientError

                raise ClientError(
                    {"Error": {"Code": "ResourceNotFoundException"}}, "GetSecretValue"
                )
            return {"SecretString": json.dumps(self.secrets[SecretId])}

    return MockSecretsManager()


# Test data validation helpers
def validate_agent_data(agent_data):
    """Validate agent data structure"""
    required_fields = ["id", "name", "status", "version", "capabilities", "lastSeen"]
    for field in required_fields:
        assert field in agent_data, f"Missing required field: {field}"

    assert agent_data["status"] in ["online", "offline", "warning", "error", "maintenance"]
    assert isinstance(agent_data["capabilities"], list)


def validate_metrics_data(metrics_data):
    """Validate metrics data structure"""
    required_fields = [
        "agentId",
        "timestamp",
        "cpu",
        "memory",
        "requestRate",
        "errorRate",
        "responseTime",
    ]
    for field in required_fields:
        assert field in metrics_data, f"Missing required field: {field}"

    # Check value ranges
    assert 0 <= metrics_data["cpu"] <= 100
    assert 0 <= metrics_data["memory"] <= 100
    assert 0 <= metrics_data["errorRate"] <= 100
    assert metrics_data["requestRate"] >= 0
    assert metrics_data["responseTime"] >= 0


def validate_alert_data(alert_data):
    """Validate alert data structure"""
    required_fields = ["id", "name", "metric", "operator", "threshold", "enabled", "severity"]
    for field in required_fields:
        assert field in alert_data, f"Missing required field: {field}"

    assert alert_data["operator"] in ["gt", "gte", "lt", "lte", "eq", "neq"]
    assert alert_data["severity"] in ["info", "warning", "error", "critical"]
    assert isinstance(alert_data["enabled"], bool)
