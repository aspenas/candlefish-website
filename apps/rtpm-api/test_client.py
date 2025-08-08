#!/usr/bin/env python3
"""
Test client for the RTPM API.
Demonstrates how to use the API endpoints.
"""

import asyncio
import json
import time
import random
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any

import httpx
import websockets

# Configuration
API_BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/metrics"

# Mock JWT token (in real implementation, get this from /auth/login)
MOCK_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJ1c2VybmFtZSI6InRlc3RfdXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIl0sInBlcm1pc3Npb25zIjpbInJlYWQ6bWV0cmljcyIsIndyaXRlOm1ldHJpY3MiLCJtYW5hZ2U6YWxlcnRzIl0sImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjQwOTk1MjAwLCJ0eXBlIjoiYWNjZXNzIn0.placeholder"


class RTAPClient:
    """RTPM API client for testing."""

    def __init__(self, base_url: str = API_BASE_URL, token: str = None):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.client = httpx.AsyncClient()

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authentication."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def health_check(self) -> Dict[str, Any]:
        """Check API health."""
        response = await self.client.get(f"{self.base_url}/health")
        return response.json()

    async def ingest_single_metric(self, metric: Dict[str, Any]) -> Dict[str, Any]:
        """Ingest a single metric."""
        response = await self.client.post(
            f"{self.base_url}/api/v1/metrics/ingest",
            headers=self._get_headers(),
            json=metric,
        )
        return response.json()

    async def ingest_batch_metrics(
        self, metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Ingest a batch of metrics."""
        batch = {"metrics": metrics}
        response = await self.client.post(
            f"{self.base_url}/api/v1/metrics/batch",
            headers=self._get_headers(),
            json=batch,
        )
        return response.json()

    async def query_metrics(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query metrics with filters."""
        response = await self.client.post(
            f"{self.base_url}/api/v1/metrics/query",
            headers=self._get_headers(),
            json=query,
        )
        return response.json()

    async def get_latest_metric(self, metric_name: str) -> Dict[str, Any]:
        """Get latest metric value."""
        response = await self.client.get(
            f"{self.base_url}/api/v1/metrics/latest/{metric_name}",
            headers=self._get_headers(),
        )
        return response.json()

    async def create_alert_rule(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Create an alert rule."""
        response = await self.client.post(
            f"{self.base_url}/api/v1/alerts/rules",
            headers=self._get_headers(),
            json=rule,
        )
        return response.json()

    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active alerts."""
        response = await self.client.get(
            f"{self.base_url}/api/v1/alerts/active", headers=self._get_headers()
        )
        return response.json()

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


def generate_sample_metrics(count: int = 10) -> List[Dict[str, Any]]:
    """Generate sample metrics for testing."""
    metrics = []
    base_time = datetime.utcnow()

    for i in range(count):
        timestamp = base_time - timedelta(seconds=i * 30)  # 30-second intervals

        # CPU metrics
        metrics.append(
            {
                "name": "cpu_usage_percent",
                "type": "gauge",
                "value": random.uniform(20, 80),
                "timestamp": timestamp.isoformat() + "Z",
                "labels": {"host": "server01", "region": "us-east-1"},
                "help_text": "CPU usage percentage",
                "unit": "percent",
            }
        )

        # Memory metrics
        metrics.append(
            {
                "name": "memory_usage_percent",
                "type": "gauge",
                "value": random.uniform(40, 90),
                "timestamp": timestamp.isoformat() + "Z",
                "labels": {"host": "server01", "region": "us-east-1"},
                "help_text": "Memory usage percentage",
                "unit": "percent",
            }
        )

        # Request count
        metrics.append(
            {
                "name": "http_requests_total",
                "type": "counter",
                "value": random.randint(1000, 5000),
                "timestamp": timestamp.isoformat() + "Z",
                "labels": {"method": "GET", "status": "200", "endpoint": "/api/health"},
                "help_text": "Total HTTP requests",
                "unit": "count",
            }
        )

    return metrics


async def test_websocket_connection():
    """Test WebSocket connection for real-time updates."""
    print("Testing WebSocket connection...")

    try:
        async with websockets.connect(WS_URL) as websocket:
            # Subscribe to metrics
            await websocket.send(
                json.dumps({"type": "subscribe", "data": {"subscription": "metrics"}})
            )

            # Subscribe to alerts
            await websocket.send(
                json.dumps({"type": "subscribe", "data": {"subscription": "alerts"}})
            )

            print("WebSocket connected and subscribed")

            # Listen for messages
            timeout = 10  # seconds
            start_time = time.time()

            while time.time() - start_time < timeout:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"WebSocket message: {data['type']} - {data.get('data', {})}")
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    print("WebSocket connection closed")
                    break

    except Exception as e:
        print(f"WebSocket test failed: {e}")


async def main():
    """Main test function."""
    client = RTAPClient(token=MOCK_TOKEN)

    try:
        print("🚀 RTPM API Test Client")
        print("=" * 50)

        # Test 1: Health Check
        print("\n1. Testing health check...")
        health = await client.health_check()
        print(f"Health status: {health.get('status', 'unknown')}")

        # Test 2: Generate and ingest sample metrics
        print("\n2. Generating sample metrics...")
        sample_metrics = generate_sample_metrics(5)
        print(f"Generated {len(sample_metrics)} sample metrics")

        # Test 3: Ingest single metric
        print("\n3. Testing single metric ingestion...")
        try:
            result = await client.ingest_single_metric(sample_metrics[0])
            print(f"Single metric ingestion: {result.get('status', 'unknown')}")
        except Exception as e:
            print(f"Single metric ingestion failed: {e}")

        # Test 4: Ingest batch metrics
        print("\n4. Testing batch metric ingestion...")
        try:
            result = await client.ingest_batch_metrics(sample_metrics[1:])
            print(f"Batch metric ingestion: {result.get('status', 'unknown')}")
            if "metrics_count" in result:
                print(f"Ingested {result['metrics_count']} metrics")
        except Exception as e:
            print(f"Batch metric ingestion failed: {e}")

        # Wait a moment for data to be processed
        await asyncio.sleep(1)

        # Test 5: Query latest metrics
        print("\n5. Testing latest metric retrieval...")
        try:
            latest = await client.get_latest_metric("cpu_usage_percent")
            print(f"Latest CPU usage: {latest.get('value', 'N/A')}%")
        except Exception as e:
            print(f"Latest metric retrieval failed: {e}")

        # Test 6: Query metrics with filters
        print("\n6. Testing metric queries...")
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=1)

            query = {
                "metric_name": "cpu_usage_percent",
                "start_time": start_time.isoformat() + "Z",
                "end_time": end_time.isoformat() + "Z",
                "step": "5m",
                "aggregation": "avg",
            }

            results = await client.query_metrics(query)
            print(f"Query returned {len(results)} metric series")

            if results and results[0].get("data_points"):
                points_count = len(results[0]["data_points"])
                print(f"First series has {points_count} data points")
        except Exception as e:
            print(f"Metric query failed: {e}")

        # Test 7: Create alert rule
        print("\n7. Testing alert rule creation...")
        try:
            alert_rule = {
                "name": "Test High CPU Alert",
                "metric_name": "cpu_usage_percent",
                "condition": "> 75",
                "threshold": 75.0,
                "severity": "high",
                "evaluation_interval": 60,
                "for_duration": 300,
                "annotations": {"description": "CPU usage is above 75% for 5 minutes"},
            }

            result = await client.create_alert_rule(alert_rule)
            print(f"Alert rule created: {result.get('name', 'unknown')}")
        except Exception as e:
            print(f"Alert rule creation failed: {e}")

        # Test 8: Get active alerts
        print("\n8. Testing active alerts retrieval...")
        try:
            alerts = await client.get_active_alerts()
            print(f"Found {len(alerts)} active alerts")

            for alert in alerts[:3]:  # Show first 3 alerts
                print(
                    f"  - {alert.get('rule_name', 'Unknown')}: {alert.get('severity', 'unknown')} severity"
                )
        except Exception as e:
            print(f"Active alerts retrieval failed: {e}")

        # Test 9: WebSocket connection
        print("\n9. Testing WebSocket connection...")
        await test_websocket_connection()

        print("\n✅ Test client completed successfully!")

    except Exception as e:
        print(f"\n❌ Test client failed: {e}")
        sys.exit(1)

    finally:
        await client.close()


if __name__ == "__main__":
    # Check if httpx and websockets are available
    try:
        import httpx
        import websockets
    except ImportError as e:
        print(f"Missing required package: {e}")
        print("Install with: pip install httpx websockets")
        sys.exit(1)

    # Run the test client
    asyncio.run(main())
