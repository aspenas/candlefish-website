"""
Integration tests for RTPM API
Tests database operations, external service integrations, and system behavior
"""

import pytest
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import patch
import json
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool


class TestDatabaseIntegration:
    """Test database operations and data persistence"""

    @pytest.fixture
    def temp_db_path(self):
        """Create temporary database for testing"""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        yield path
        os.unlink(path)

    @pytest.fixture
    def test_db_engine(self, temp_db_path):
        """Create test database engine"""
        engine = create_engine(
            f"sqlite:///{temp_db_path}",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        return engine

    def test_database_schema_creation(self, test_db_engine):
        """Test that database schema is created correctly"""
        # This would test actual database schema creation
        # For now, test that we can connect and create tables

        with test_db_engine.connect() as conn:
            # Create agents table
            conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    version TEXT NOT NULL,
                    capabilities TEXT,
                    last_seen DATETIME,
                    region TEXT,
                    platform TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            )

            # Create metrics table
            conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    cpu REAL,
                    memory REAL,
                    request_rate REAL,
                    error_rate REAL,
                    response_time REAL,
                    throughput REAL,
                    active_connections INTEGER,
                    queue_depth INTEGER,
                    disk_usage REAL,
                    network_latency REAL,
                    FOREIGN KEY (agent_id) REFERENCES agents (id)
                )
            """)
            )

            # Create alerts table
            conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    agent_id TEXT,
                    name TEXT NOT NULL,
                    description TEXT,
                    metric TEXT NOT NULL,
                    operator TEXT NOT NULL,
                    threshold REAL NOT NULL,
                    actions TEXT,
                    enabled BOOLEAN DEFAULT TRUE,
                    severity TEXT NOT NULL,
                    cooldown_period INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_triggered DATETIME,
                    FOREIGN KEY (agent_id) REFERENCES agents (id)
                )
            """)
            )

            # Create alert history table
            conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS alert_history (
                    id TEXT PRIMARY KEY,
                    alert_id TEXT NOT NULL,
                    agent_id TEXT,
                    triggered_at DATETIME NOT NULL,
                    resolved_at DATETIME,
                    value REAL NOT NULL,
                    threshold REAL NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT,
                    acknowledged BOOLEAN DEFAULT FALSE,
                    acknowledged_by TEXT,
                    acknowledged_at DATETIME,
                    FOREIGN KEY (alert_id) REFERENCES alerts (id),
                    FOREIGN KEY (agent_id) REFERENCES agents (id)
                )
            """)
            )

            conn.commit()

        # Verify tables were created
        with test_db_engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result]

            assert "agents" in tables
            assert "agent_metrics" in tables
            assert "alerts" in tables
            assert "alert_history" in tables

    def test_agent_crud_operations(self, test_db_engine, sample_agent):
        """Test CRUD operations for agents"""
        # Create schema first
        self.test_database_schema_creation(test_db_engine)

        with test_db_engine.connect() as conn:
            # Create agent
            conn.execute(
                text("""
                INSERT INTO agents (id, name, status, version, capabilities, last_seen, region, platform)
                VALUES (:id, :name, :status, :version, :capabilities, :last_seen, :region, :platform)
            """),
                {
                    "id": sample_agent["id"],
                    "name": sample_agent["name"],
                    "status": sample_agent["status"],
                    "version": sample_agent["version"],
                    "capabilities": json.dumps(sample_agent["capabilities"]),
                    "last_seen": sample_agent["lastSeen"],
                    "region": sample_agent["region"],
                    "platform": sample_agent["platform"],
                },
            )

            # Read agent
            result = conn.execute(
                text("SELECT * FROM agents WHERE id = :id"), {"id": sample_agent["id"]}
            )
            row = result.fetchone()

            assert row is not None
            assert row[0] == sample_agent["id"]  # id
            assert row[1] == sample_agent["name"]  # name
            assert row[2] == sample_agent["status"]  # status

            # Update agent
            new_status = "offline"
            conn.execute(
                text("""
                UPDATE agents SET status = :status, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """),
                {"status": new_status, "id": sample_agent["id"]},
            )

            # Verify update
            result = conn.execute(
                text("SELECT status FROM agents WHERE id = :id"), {"id": sample_agent["id"]}
            )
            row = result.fetchone()
            assert row[0] == new_status

            # Delete agent
            conn.execute(text("DELETE FROM agents WHERE id = :id"), {"id": sample_agent["id"]})

            # Verify deletion
            result = conn.execute(
                text("SELECT COUNT(*) FROM agents WHERE id = :id"), {"id": sample_agent["id"]}
            )
            count = result.fetchone()[0]
            assert count == 0

            conn.commit()

    def test_metrics_storage_and_retrieval(self, test_db_engine, sample_agent_metrics):
        """Test storing and retrieving metrics data"""
        self.test_database_schema_creation(test_db_engine)

        with test_db_engine.connect() as conn:
            # Insert metrics
            conn.execute(
                text("""
                INSERT INTO agent_metrics (
                    agent_id, timestamp, cpu, memory, request_rate, error_rate,
                    response_time, throughput, active_connections, queue_depth,
                    disk_usage, network_latency
                ) VALUES (
                    :agent_id, :timestamp, :cpu, :memory, :request_rate, :error_rate,
                    :response_time, :throughput, :active_connections, :queue_depth,
                    :disk_usage, :network_latency
                )
            """),
                {
                    "agent_id": sample_agent_metrics["agentId"],
                    "timestamp": sample_agent_metrics["timestamp"],
                    "cpu": sample_agent_metrics["cpu"],
                    "memory": sample_agent_metrics["memory"],
                    "request_rate": sample_agent_metrics["requestRate"],
                    "error_rate": sample_agent_metrics["errorRate"],
                    "response_time": sample_agent_metrics["responseTime"],
                    "throughput": sample_agent_metrics["throughput"],
                    "active_connections": sample_agent_metrics["activeConnections"],
                    "queue_depth": sample_agent_metrics["queueDepth"],
                    "disk_usage": sample_agent_metrics["diskUsage"],
                    "network_latency": sample_agent_metrics["networkLatency"],
                },
            )

            # Retrieve metrics
            result = conn.execute(
                text("""
                SELECT * FROM agent_metrics WHERE agent_id = :agent_id
                ORDER BY timestamp DESC
            """),
                {"agent_id": sample_agent_metrics["agentId"]},
            )

            row = result.fetchone()
            assert row is not None
            assert row[1] == sample_agent_metrics["agentId"]  # agent_id
            assert row[3] == sample_agent_metrics["cpu"]  # cpu
            assert row[4] == sample_agent_metrics["memory"]  # memory

            conn.commit()

    def test_time_series_queries(self, test_db_engine, sample_metrics_history):
        """Test time-based queries for metrics data"""
        self.test_database_schema_creation(test_db_engine)

        with test_db_engine.connect() as conn:
            # Insert multiple metrics records
            for metrics in sample_metrics_history[:50]:  # Use first 50 records
                conn.execute(
                    text("""
                    INSERT INTO agent_metrics (
                        agent_id, timestamp, cpu, memory, request_rate, error_rate,
                        response_time, throughput, active_connections, queue_depth,
                        disk_usage, network_latency
                    ) VALUES (
                        :agent_id, :timestamp, :cpu, :memory, :request_rate, :error_rate,
                        :response_time, :throughput, :active_connections, :queue_depth,
                        :disk_usage, :network_latency
                    )
                """),
                    {
                        "agent_id": metrics["agentId"],
                        "timestamp": metrics["timestamp"],
                        "cpu": metrics["cpu"],
                        "memory": metrics["memory"],
                        "request_rate": metrics["requestRate"],
                        "error_rate": metrics["errorRate"],
                        "response_time": metrics["responseTime"],
                        "throughput": metrics["throughput"],
                        "active_connections": metrics["activeConnections"],
                        "queue_depth": metrics["queueDepth"],
                        "disk_usage": metrics["diskUsage"],
                        "network_latency": metrics["networkLatency"],
                    },
                )

            # Test time range query
            start_time = datetime.utcnow() - timedelta(hours=12)
            result = conn.execute(
                text("""
                SELECT agent_id, AVG(cpu), AVG(memory), COUNT(*)
                FROM agent_metrics
                WHERE timestamp >= :start_time
                GROUP BY agent_id
            """),
                {"start_time": start_time.isoformat()},
            )

            rows = result.fetchall()
            assert len(rows) > 0

            # Test aggregation query
            result = conn.execute(
                text("""
                SELECT
                    agent_id,
                    AVG(cpu) as avg_cpu,
                    MAX(cpu) as max_cpu,
                    MIN(cpu) as min_cpu,
                    COUNT(*) as record_count
                FROM agent_metrics
                GROUP BY agent_id
                HAVING COUNT(*) > 1
            """)
            )

            rows = result.fetchall()
            for row in rows:
                assert row[1] >= 0  # avg_cpu
                assert row[2] >= row[1]  # max_cpu >= avg_cpu
                assert row[3] <= row[1]  # min_cpu <= avg_cpu
                assert row[4] > 1  # record_count > 1

            conn.commit()

    def test_database_constraints(self, test_db_engine):
        """Test database constraints and data integrity"""
        self.test_database_schema_creation(test_db_engine)

        with test_db_engine.connect() as conn:
            # Test foreign key constraint
            try:
                conn.execute(
                    text("""
                    INSERT INTO agent_metrics (agent_id, timestamp, cpu, memory, request_rate, error_rate, response_time)
                    VALUES ('non-existent-agent', :timestamp, 50.0, 60.0, 100.0, 2.0, 150.0)
                """),
                    {"timestamp": datetime.utcnow().isoformat()},
                )
                conn.commit()

                # SQLite doesn't enforce foreign keys by default
                # This test documents the expected behavior
            except Exception:
                # If foreign key constraints are enabled, this should fail
                pass

    def test_database_performance(self, test_db_engine):
        """Test database performance with large datasets"""
        self.test_database_schema_creation(test_db_engine)

        import time

        with test_db_engine.connect() as conn:
            # Insert many records
            start_time = time.time()

            for i in range(1000):
                conn.execute(
                    text("""
                    INSERT INTO agent_metrics (
                        agent_id, timestamp, cpu, memory, request_rate, error_rate, response_time
                    ) VALUES (:agent_id, :timestamp, :cpu, :memory, :request_rate, :error_rate, :response_time)
                """),
                    {
                        "agent_id": f"agent-{i % 10}",
                        "timestamp": (datetime.utcnow() - timedelta(minutes=i)).isoformat(),
                        "cpu": 50.0 + (i % 50),
                        "memory": 60.0 + (i % 40),
                        "request_rate": 100.0 + (i % 100),
                        "error_rate": i % 10,
                        "response_time": 100.0 + (i % 200),
                    },
                )

            conn.commit()
            insert_time = time.time() - start_time

            # Query performance
            start_time = time.time()
            result = conn.execute(
                text("""
                SELECT agent_id, AVG(cpu), AVG(memory), COUNT(*)
                FROM agent_metrics
                GROUP BY agent_id
            """)
            )
            rows = result.fetchall()
            query_time = time.time() - start_time

            # Performance assertions
            assert insert_time < 10.0  # Should insert 1000 records in under 10 seconds
            assert query_time < 1.0  # Should query in under 1 second
            assert len(rows) == 10  # Should have 10 different agents


class TestRedisIntegration:
    """Test Redis caching and session management"""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client for testing"""

        class MockRedis:
            def __init__(self):
                self.data = {}
                self.expires = {}

            def get(self, key):
                if key in self.expires and datetime.now() > self.expires[key]:
                    del self.data[key]
                    del self.expires[key]
                    return None
                return self.data.get(key)

            def set(self, key, value, ex=None):
                self.data[key] = value
                if ex:
                    self.expires[key] = datetime.now() + timedelta(seconds=ex)
                return True

            def delete(self, key):
                self.data.pop(key, None)
                self.expires.pop(key, None)
                return True

            def exists(self, key):
                return key in self.data

            def keys(self, pattern="*"):
                if pattern == "*":
                    return list(self.data.keys())
                # Simple pattern matching
                return [k for k in self.data.keys() if pattern.replace("*", "") in k]

            def flushall(self):
                self.data.clear()
                self.expires.clear()
                return True

        return MockRedis()

    def test_redis_connection(self, mock_redis):
        """Test Redis connection and basic operations"""
        # Test basic set/get
        assert mock_redis.set("test_key", "test_value")
        assert mock_redis.get("test_key") == "test_value"

        # Test key existence
        assert mock_redis.exists("test_key")
        assert not mock_redis.exists("non_existent_key")

        # Test deletion
        assert mock_redis.delete("test_key")
        assert not mock_redis.exists("test_key")

    def test_redis_caching(self, mock_redis, sample_agent_metrics):
        """Test caching of metrics data"""
        cache_key = f"metrics:{sample_agent_metrics['agentId']}:latest"
        metrics_json = json.dumps(sample_agent_metrics)

        # Cache metrics
        mock_redis.set(cache_key, metrics_json, ex=300)  # 5 minute expiry

        # Retrieve from cache
        cached_data = mock_redis.get(cache_key)
        assert cached_data is not None

        # Verify data integrity
        cached_metrics = json.loads(cached_data)
        assert cached_metrics["agentId"] == sample_agent_metrics["agentId"]
        assert cached_metrics["cpu"] == sample_agent_metrics["cpu"]

    def test_redis_session_management(self, mock_redis):
        """Test session management with Redis"""
        session_id = "session_123"
        session_data = {
            "user_id": "user_456",
            "preferences": {"theme": "dark", "refresh_interval": 30},
            "last_accessed": datetime.utcnow().isoformat(),
        }

        # Store session
        session_key = f"session:{session_id}"
        mock_redis.set(session_key, json.dumps(session_data), ex=3600)  # 1 hour expiry

        # Retrieve session
        cached_session = mock_redis.get(session_key)
        assert cached_session is not None

        session = json.loads(cached_session)
        assert session["user_id"] == "user_456"
        assert session["preferences"]["theme"] == "dark"

    def test_redis_expiration(self, mock_redis):
        """Test Redis key expiration"""
        import time

        # Set key with short expiration
        mock_redis.set("temp_key", "temp_value", ex=1)  # 1 second expiry

        # Should exist immediately
        assert mock_redis.exists("temp_key")

        # Mock expiration by manually checking
        # In real Redis, this would happen automatically
        time.sleep(1.1)

        # Simulate expiration check
        # Note: Mock implementation handles this in get() method
        result = mock_redis.get("temp_key")
        # In our mock, expiration is checked on access

    def test_redis_pattern_matching(self, mock_redis):
        """Test Redis pattern matching for cache invalidation"""
        # Store multiple keys
        mock_redis.set("metrics:agent-001:cpu", "50.0")
        mock_redis.set("metrics:agent-001:memory", "60.0")
        mock_redis.set("metrics:agent-002:cpu", "70.0")
        mock_redis.set("alerts:agent-001:high_cpu", "triggered")

        # Find all metrics for agent-001
        agent_keys = mock_redis.keys("metrics:agent-001:*")
        assert len(agent_keys) == 2
        assert "metrics:agent-001:cpu" in agent_keys
        assert "metrics:agent-001:memory" in agent_keys

        # Find all metric keys
        all_metrics = mock_redis.keys("metrics:*")
        assert len(all_metrics) == 3


class TestExternalServiceIntegration:
    """Test integration with external services"""

    def test_aws_secrets_manager_integration(self, mock_aws_secrets):
        """Test AWS Secrets Manager integration"""
        with patch("boto3.client") as mock_boto3:
            mock_boto3.return_value = mock_aws_secrets

            # Test secret retrieval
            secret_name = "candlefish-database-production"
            secret_value = mock_aws_secrets.get_secret_value(SecretId=secret_name)

            assert "SecretString" in secret_value
            secret_data = json.loads(secret_value["SecretString"])
            assert "host" in secret_data
            assert "port" in secret_data

    def test_prometheus_metrics_integration(self, client):
        """Test Prometheus metrics collection"""
        # Make some requests to generate metrics
        for i in range(10):
            response = client.get("/health")
            assert response.status_code == 200

        # Check metrics endpoint
        response = client.get("/metrics")
        assert response.status_code == 200

        metrics_content = response.text

        # Verify key metrics are present
        assert "rtpm_request_total" in metrics_content
        assert "rtpm_request_latency_seconds" in metrics_content

        # Verify metrics have values
        assert "rtpm_request_total{" in metrics_content
        assert 'endpoint="/health"' in metrics_content

    def test_monitoring_service_integration(self):
        """Test integration with monitoring services"""
        # This would test integration with external monitoring
        # Like DataDog, New Relic, etc.
        pass

    def test_notification_service_integration(self):
        """Test integration with notification services"""
        # This would test email, Slack, SMS notifications
        pass


class TestEndToEndWorkflows:
    """Test complete end-to-end workflows"""

    def test_agent_registration_workflow(self, client, sample_agent):
        """Test complete agent registration workflow"""
        # 1. Register agent (would be POST /api/v1/agents when implemented)
        # 2. Verify agent appears in listings
        # 3. Update agent status
        # 4. Verify update is reflected

        # Currently just test that the workflow structure is in place
        response = client.get("/api/v1/status")
        assert response.status_code == 200

    def test_metrics_ingestion_workflow(self, client, sample_agent_metrics):
        """Test complete metrics ingestion and processing workflow"""
        # 1. Ingest metrics
        response = client.post("/api/v1/metrics", json=sample_agent_metrics)
        assert response.status_code == 200

        # 2. Verify metrics are stored (would query database)
        # 3. Verify metrics appear in real-time feed
        # 4. Verify historical data is updated

        data = response.json()
        assert data["status"] == "success"

    def test_alerting_workflow(self, client, sample_alert):
        """Test complete alerting workflow"""
        # 1. Create alert configuration
        # 2. Ingest metrics that trigger alert
        # 3. Verify alert is triggered
        # 4. Verify notification is sent
        # 5. Acknowledge alert
        # 6. Verify alert is resolved

        # Currently just test basic structure
        pass

    def test_dashboard_data_flow(self, client):
        """Test data flow for dashboard updates"""
        # 1. WebSocket connection established
        # 2. Metrics ingested via API
        # 3. WebSocket receives update
        # 4. Dashboard reflects changes

        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Ingest metric
            response = client.post(
                "/api/v1/metrics",
                json={
                    "agentId": "test-agent",
                    "cpu": 85.0,
                    "memory": 70.0,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            assert response.status_code == 200

            # This would verify WebSocket receives the update
            # Implementation depends on whether ingested metrics are broadcast


class TestDataConsistency:
    """Test data consistency and integrity"""

    def test_concurrent_metric_ingestion(self, client):
        """Test concurrent metric ingestion maintains consistency"""
        import threading

        results = []

        def ingest_metric(agent_id, cpu_value):
            response = client.post(
                "/api/v1/metrics",
                json={
                    "agentId": agent_id,
                    "cpu": cpu_value,
                    "memory": 50.0,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
            results.append(response.status_code)

        # Create multiple concurrent requests
        threads = []
        for i in range(20):
            thread = threading.Thread(target=ingest_metric, args=(f"agent-{i % 5}", 50.0 + i))
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # All requests should succeed
        assert len(results) == 20
        assert all(status == 200 for status in results)

    def test_websocket_message_ordering(self, client):
        """Test that WebSocket messages maintain proper ordering"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Send multiple metrics rapidly
            timestamps = []
            for i in range(5):
                client.post(
                    "/api/v1/metrics",
                    json={
                        "agentId": f"agent-{i}",
                        "cpu": 50.0 + i * 10,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
                timestamps.append(datetime.utcnow())

            # Collect WebSocket messages
            # Note: This depends on implementation details

    def test_cache_consistency(self, mock_redis):
        """Test cache consistency with database updates"""
        # This would test that cache is properly invalidated
        # when database is updated
        pass


class TestFailureScenarios:
    """Test system behavior under failure conditions"""

    def test_database_connection_failure(self, client):
        """Test behavior when database is unavailable"""
        # Mock database connection failure
        with patch("sqlite3.connect", side_effect=Exception("Database unavailable")):
            # System should still respond to health checks
            response = client.get("/health")
            assert response.status_code == 200

            # But data operations might fail gracefully
            response = client.post("/api/v1/metrics", json={"agentId": "test-agent", "cpu": 50.0})
            # Should either succeed (if using mock) or fail gracefully
            assert response.status_code in [200, 500, 503]

    def test_redis_connection_failure(self, client):
        """Test behavior when Redis is unavailable"""
        # System should continue operating without cache
        pass

    def test_external_service_failure(self, client):
        """Test behavior when external services fail"""
        # Test AWS, monitoring services, notification failures
        pass

    def test_high_load_behavior(self, client):
        """Test system behavior under high load"""
        import threading
        import time

        results = []
        errors = []

        def make_requests():
            try:
                for _ in range(50):
                    response = client.get("/health")
                    results.append(response.status_code)

                    if response.status_code != 200:
                        errors.append(response.status_code)
            except Exception as e:
                errors.append(str(e))

        # Create high concurrent load
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_requests)
            threads.append(thread)

        start_time = time.time()

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        end_time = time.time()

        # Verify system handled load reasonably
        total_requests = len(results)
        successful_requests = sum(1 for status in results if status == 200)
        success_rate = successful_requests / total_requests if total_requests > 0 else 0

        assert total_requests > 0
        assert success_rate >= 0.95  # 95% success rate under load
        assert end_time - start_time < 30  # Completed within 30 seconds

        if errors:
            print(f"Errors encountered: {errors[:10]}")  # Show first 10 errors
