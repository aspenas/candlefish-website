"""
Locust performance testing for RTPM API.
Tests load handling, WebSocket connections, and system behavior under stress.
"""

import json
import time
import random
from datetime import datetime, timedelta
from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser
import websocket
import threading
from typing import Dict, List, Any

class RTPMAPIUser(FastHttpUser):
    """
    Load testing user for RTPM API.
    Simulates typical user behavior patterns.
    """
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Initialize user session."""
        self.auth_token = None
        self.user_id = f"load_test_user_{random.randint(1000, 9999)}"
        self.login()
    
    def login(self):
        """Authenticate user and get token."""
        login_data = {
            "username": self.user_id,
            "password": "load_test_password"
        }
        
        with self.client.post(
            "/api/v1/auth/login",
            json=login_data,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                response.success()
            else:
                response.failure(f"Login failed: {response.status_code}")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication."""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
    
    @task(3)
    def get_health_status(self):
        """Test health endpoint (high frequency)."""
        with self.client.get("/health", headers=self.get_headers()) as response:
            if response.status_code != 200:
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(5)
    def ingest_metrics(self):
        """Test metrics ingestion (very high frequency)."""
        metrics_data = {
            "metrics": [
                {
                    "metric_name": random.choice(["cpu_usage", "memory_usage", "response_time"]),
                    "value": random.uniform(0, 100),
                    "timestamp": datetime.utcnow().isoformat(),
                    "labels": {
                        "host": f"load-test-host-{random.randint(1, 10)}",
                        "environment": "load-test"
                    }
                }
                for _ in range(random.randint(1, 10))  # 1-10 metrics per request
            ]
        }
        
        with self.client.post(
            "/api/v1/metrics",
            json=metrics_data,
            headers=self.get_headers(),
            name="/api/v1/metrics [batch]"
        ) as response:
            if response.status_code == 200:
                result = response.json()
                if result.get("processed_count") != len(metrics_data["metrics"]):
                    response.failure("Processed count mismatch")
            else:
                response.failure(f"Metrics ingestion failed: {response.status_code}")
    
    @task(4)
    def query_metrics(self):
        """Test metrics querying."""
        params = {
            "metric_name": random.choice(["cpu_usage", "memory_usage", "response_time"]),
            "start_time": (datetime.utcnow() - timedelta(minutes=30)).isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "labels": f"environment=load-test"
        }
        
        with self.client.get(
            "/api/v1/metrics/query",
            params=params,
            headers=self.get_headers()
        ) as response:
            if response.status_code != 200:
                response.failure(f"Metrics query failed: {response.status_code}")
            else:
                result = response.json()
                if "metrics" not in result:
                    response.failure("Missing metrics in response")
    
    @task(2)
    def get_aggregated_metrics(self):
        """Test metrics aggregation."""
        params = {
            "metric_name": random.choice(["cpu_usage", "memory_usage"]),
            "start_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "end_time": datetime.utcnow().isoformat(),
            "aggregation": random.choice(["avg", "max", "min"]),
            "interval": random.choice(["1m", "5m", "15m"])
        }
        
        with self.client.get(
            "/api/v1/metrics/aggregated",
            params=params,
            headers=self.get_headers()
        ) as response:
            if response.status_code != 200:
                response.failure(f"Aggregation failed: {response.status_code}")
    
    @task(1)
    def manage_alert_rules(self):
        """Test alert rules management."""
        # Create alert rule
        rule_data = {
            "name": f"Load Test Rule {random.randint(1000, 9999)}",
            "metric": "cpu_usage",
            "condition": "greater_than",
            "threshold": random.uniform(70, 90),
            "duration": 300,
            "severity": random.choice(["warning", "critical"]),
            "enabled": True
        }
        
        with self.client.post(
            "/api/v1/alerts/rules",
            json=rule_data,
            headers=self.get_headers(),
            name="/api/v1/alerts/rules [create]"
        ) as response:
            if response.status_code == 201:
                rule_id = response.json().get("id")
                if rule_id:
                    # Update rule
                    update_data = {"threshold": random.uniform(75, 95)}
                    with self.client.put(
                        f"/api/v1/alerts/rules/{rule_id}",
                        json=update_data,
                        headers=self.get_headers(),
                        name="/api/v1/alerts/rules/{id} [update]"
                    ) as update_response:
                        if update_response.status_code != 200:
                            update_response.failure("Rule update failed")
                    
                    # Delete rule (cleanup)
                    with self.client.delete(
                        f"/api/v1/alerts/rules/{rule_id}",
                        headers=self.get_headers(),
                        name="/api/v1/alerts/rules/{id} [delete]"
                    ) as delete_response:
                        if delete_response.status_code != 204:
                            delete_response.failure("Rule deletion failed")
            else:
                response.failure("Rule creation failed")
    
    @task(2)
    def get_active_alerts(self):
        """Test active alerts retrieval."""
        with self.client.get(
            "/api/v1/alerts/active",
            headers=self.get_headers()
        ) as response:
            if response.status_code != 200:
                response.failure("Active alerts query failed")

class WebSocketUser(HttpUser):
    """
    WebSocket load testing user.
    Tests real-time metric streaming under load.
    """
    
    wait_time = between(2, 5)
    
    def on_start(self):
        """Initialize WebSocket connection."""
        self.auth_token = None
        self.ws = None
        self.ws_thread = None
        self.connected = False
        self.messages_received = 0
        self.login()
        self.connect_websocket()
    
    def on_stop(self):
        """Cleanup WebSocket connection."""
        if self.ws:
            self.ws.close()
        if self.ws_thread:
            self.ws_thread.join(timeout=5)
    
    def login(self):
        """Authenticate and get token for WebSocket."""
        login_data = {
            "username": f"ws_test_user_{random.randint(1000, 9999)}",
            "password": "load_test_password"
        }
        
        response = self.client.post("/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access_token")
    
    def connect_websocket(self):
        """Establish WebSocket connection."""
        if not self.auth_token:
            return
        
        ws_url = f"ws://localhost:8000/ws/metrics?token={self.auth_token}"
        
        def on_message(ws, message):
            self.messages_received += 1
            # Track message reception rate
            events.request.fire(
                request_type="WebSocket",
                name="message_received",
                response_time=0,
                response_length=len(message)
            )
        
        def on_error(ws, error):
            events.request.fire(
                request_type="WebSocket",
                name="connection_error",
                response_time=0,
                response_length=0,
                exception=error
            )
        
        def on_open(ws):
            self.connected = True
            # Subscribe to metrics
            subscribe_message = {
                "type": "subscribe",
                "metrics": ["cpu_usage", "memory_usage", "response_time"],
                "labels": {"environment": "load-test"}
            }
            ws.send(json.dumps(subscribe_message))
        
        def on_close(ws, close_status_code, close_msg):
            self.connected = False
        
        try:
            self.ws = websocket.WebSocketApp(
                ws_url,
                on_message=on_message,
                on_error=on_error,
                on_open=on_open,
                on_close=on_close
            )
            
            # Run WebSocket in separate thread
            self.ws_thread = threading.Thread(target=self.ws.run_forever)
            self.ws_thread.daemon = True
            self.ws_thread.start()
            
            # Wait for connection
            time.sleep(1)
            
        except Exception as e:
            events.request.fire(
                request_type="WebSocket",
                name="connection_failed",
                response_time=0,
                response_length=0,
                exception=e
            )
    
    @task
    def send_ping(self):
        """Send ping to WebSocket."""
        if self.connected and self.ws:
            ping_message = {"type": "ping", "timestamp": time.time()}
            self.ws.send(json.dumps(ping_message))
            
            events.request.fire(
                request_type="WebSocket",
                name="ping_sent",
                response_time=0,
                response_length=len(json.dumps(ping_message))
            )

class HighVolumeMetricsUser(FastHttpUser):
    """
    Specialized user for high-volume metrics ingestion.
    Tests system behavior under extreme load.
    """
    
    wait_time = between(0.1, 0.5)  # Very fast requests
    
    def on_start(self):
        """Initialize for high-volume testing."""
        self.auth_token = None
        self.batch_size = random.randint(50, 200)  # Large batches
        self.login()
    
    def login(self):
        """Fast login for high-volume user."""
        login_data = {
            "username": f"hv_user_{random.randint(1000, 9999)}",
            "password": "load_test_password"
        }
        
        response = self.client.post("/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access_token")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication."""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
    
    @task
    def ingest_high_volume_metrics(self):
        """Ingest large batches of metrics."""
        base_time = datetime.utcnow()
        
        # Generate large batch of metrics
        metrics_data = {
            "metrics": [
                {
                    "metric_name": f"hv_metric_{i % 20}",  # 20 different metrics
                    "value": random.uniform(0, 100),
                    "timestamp": (base_time + timedelta(seconds=i)).isoformat(),
                    "labels": {
                        "instance": f"hv-instance-{i % 50}",  # 50 different instances
                        "region": f"region-{i % 5}",  # 5 regions
                        "environment": "high-volume-test"
                    }
                }
                for i in range(self.batch_size)
            ]
        }
        
        start_time = time.time()
        
        with self.client.post(
            "/api/v1/metrics",
            json=metrics_data,
            headers=self.get_headers(),
            name=f"/api/v1/metrics [batch-{self.batch_size}]"
        ) as response:
            response_time = (time.time() - start_time) * 1000  # ms
            
            if response.status_code == 200:
                result = response.json()
                processed = result.get("processed_count", 0)
                
                if processed != len(metrics_data["metrics"]):
                    response.failure(f"Processed {processed}/{len(metrics_data['metrics'])}")
                
                # Track throughput
                throughput = processed / (response_time / 1000)  # metrics per second
                events.request.fire(
                    request_type="Metrics",
                    name=f"throughput",
                    response_time=response_time,
                    response_length=throughput
                )
            else:
                response.failure(f"High volume ingestion failed: {response.status_code}")

# Custom event handlers for performance tracking
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Initialize performance tracking."""
    print("🚀 Starting RTPM API load test...")
    environment.stats.start_time = time.time()

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Generate performance report."""
    print("📊 Generating performance report...")
    
    total_time = time.time() - environment.stats.start_time
    total_requests = environment.stats.total.num_requests
    total_failures = environment.stats.total.num_failures
    
    print(f"\n{'='*60}")
    print("RTPM API LOAD TEST RESULTS")
    print(f"{'='*60}")
    print(f"Total Time: {total_time:.2f} seconds")
    print(f"Total Requests: {total_requests}")
    print(f"Total Failures: {total_failures}")
    print(f"Failure Rate: {(total_failures/total_requests)*100:.2f}%")
    print(f"Requests/Second: {total_requests/total_time:.2f}")
    
    # Metrics-specific stats
    metrics_stats = environment.stats.get("/api/v1/metrics", "POST")
    if metrics_stats:
        print(f"\nMETRICS INGESTION:")
        print(f"  Requests: {metrics_stats.num_requests}")
        print(f"  Avg Response Time: {metrics_stats.avg_response_time:.2f}ms")
        print(f"  95th Percentile: {metrics_stats.get_response_time_percentile(0.95):.2f}ms")
    
    # Query stats
    query_stats = environment.stats.get("/api/v1/metrics/query", "GET")
    if query_stats:
        print(f"\nMETRICS QUERYING:")
        print(f"  Requests: {query_stats.num_requests}")
        print(f"  Avg Response Time: {query_stats.avg_response_time:.2f}ms")
        print(f"  95th Percentile: {query_stats.get_response_time_percentile(0.95):.2f}ms")
    
    # Performance criteria
    print(f"\n{'='*60}")
    print("PERFORMANCE CRITERIA CHECK:")
    print(f"{'='*60}")
    
    criteria_passed = 0
    total_criteria = 5
    
    # 1. Overall failure rate < 1%
    failure_rate = (total_failures/total_requests)*100 if total_requests > 0 else 100
    if failure_rate < 1.0:
        print("✅ Failure rate < 1% ✓")
        criteria_passed += 1
    else:
        print(f"❌ Failure rate {failure_rate:.2f}% > 1% ✗")
    
    # 2. Metrics ingestion throughput > 1000 metrics/second
    if metrics_stats and total_time > 0:
        metrics_throughput = metrics_stats.num_requests / total_time
        if metrics_throughput > 1000:
            print(f"✅ Metrics throughput {metrics_throughput:.0f} req/s > 1000 req/s ✓")
            criteria_passed += 1
        else:
            print(f"❌ Metrics throughput {metrics_throughput:.0f} req/s < 1000 req/s ✗")
    else:
        print("❌ No metrics ingestion data ✗")
    
    # 3. Average response time < 500ms
    avg_response_time = environment.stats.total.avg_response_time
    if avg_response_time < 500:
        print(f"✅ Avg response time {avg_response_time:.0f}ms < 500ms ✓")
        criteria_passed += 1
    else:
        print(f"❌ Avg response time {avg_response_time:.0f}ms > 500ms ✗")
    
    # 4. 95th percentile < 1000ms
    p95_response_time = environment.stats.total.get_response_time_percentile(0.95)
    if p95_response_time < 1000:
        print(f"✅ 95th percentile {p95_response_time:.0f}ms < 1000ms ✓")
        criteria_passed += 1
    else:
        print(f"❌ 95th percentile {p95_response_time:.0f}ms > 1000ms ✗")
    
    # 5. Requests per second > 100
    rps = total_requests / total_time if total_time > 0 else 0
    if rps > 100:
        print(f"✅ RPS {rps:.0f} > 100 ✓")
        criteria_passed += 1
    else:
        print(f"❌ RPS {rps:.0f} < 100 ✗")
    
    print(f"\nOVERALL: {criteria_passed}/{total_criteria} criteria passed")
    
    if criteria_passed == total_criteria:
        print("🎉 ALL PERFORMANCE CRITERIA MET!")
        exit(0)
    else:
        print("⚠️  Some performance criteria not met")
        exit(1)

# Test scenarios
class StressTestUser(RTPMAPIUser):
    """Stress test with higher load."""
    wait_time = between(0.1, 0.3)  # Much faster requests

class SpikeTestUser(RTPMAPIUser):
    """Simulates traffic spikes."""
    wait_time = between(0, 0.1)  # Very rapid requests
    
    @task(10)  # Much higher weight
    def spike_metrics_ingestion(self):
        """Spike in metrics ingestion."""
        super().ingest_metrics()

# Usage examples:
# Normal load test:
#   locust -f locustfile.py --host=http://localhost:8000 --users 50 --spawn-rate 5 --run-time 300s
#
# Stress test:
#   locust -f locustfile.py --host=http://localhost:8000 --users 200 --spawn-rate 10 --run-time 300s StressTestUser
#
# Spike test:
#   locust -f locustfile.py --host=http://localhost:8000 --users 100 --spawn-rate 20 --run-time 60s SpikeTestUser
#
# High volume test:
#   locust -f locustfile.py --host=http://localhost:8000 --users 20 --spawn-rate 2 --run-time 600s HighVolumeMetricsUser
#
# WebSocket test:
#   locust -f locustfile.py --host=http://localhost:8000 --users 50 --spawn-rate 5 --run-time 300s WebSocketUser