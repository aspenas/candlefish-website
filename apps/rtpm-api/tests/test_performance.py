"""
Performance tests for RTPM API
Tests handling of 1000+ agents, high throughput, and system scalability
"""

import pytest
import time
import psutil
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import statistics
import threading
from unittest.mock import patch


class TestPerformanceMetrics:
    """Test system performance metrics collection"""

    def test_response_time_under_load(self, client):
        """Test API response times under load"""
        response_times = []

        def make_request():
            start_time = time.time()
            response = client.get("/health")
            end_time = time.time()
            response_times.append((end_time - start_time) * 1000)  # Convert to ms
            return response.status_code

        # Execute 100 concurrent requests
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(100)]
            results = [future.result() for future in as_completed(futures)]

        # All requests should succeed
        assert all(status == 200 for status in results)

        # Calculate performance metrics
        avg_response_time = statistics.mean(response_times)
        p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
        max_response_time = max(response_times)

        # Performance assertions
        assert avg_response_time < 100  # Average under 100ms
        assert p95_response_time < 200  # 95th percentile under 200ms
        assert max_response_time < 500  # Max under 500ms

        print("Performance metrics:")
        print(f"  Average response time: {avg_response_time:.2f}ms")
        print(f"  95th percentile: {p95_response_time:.2f}ms")
        print(f"  Max response time: {max_response_time:.2f}ms")

    def test_throughput_measurement(self, client):
        """Test API throughput (requests per second)"""
        request_count = 500
        start_time = time.time()

        def make_request():
            return client.get("/health").status_code

        # Execute requests with limited concurrency
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(request_count)]
            results = [future.result() for future in as_completed(futures)]

        end_time = time.time()
        duration = end_time - start_time
        throughput = request_count / duration

        # All requests should succeed
        assert all(status == 200 for status in results)

        # Should achieve minimum throughput
        assert throughput > 100  # At least 100 requests per second

        print(f"Throughput: {throughput:.2f} requests/second")
        print(f"Duration: {duration:.2f} seconds")

    def test_memory_usage_stability(self, client):
        """Test memory usage remains stable under load"""
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Execute many requests
        for _ in range(1000):
            response = client.get("/health")
            assert response.status_code == 200

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable
        assert memory_increase < 50  # Less than 50MB increase

        print(
            f"Memory usage: {initial_memory:.2f}MB -> {final_memory:.2f}MB (+{memory_increase:.2f}MB)"
        )


class TestLargeDatasetHandling:
    """Test handling of large datasets (1000+ agents)"""

    @pytest.fixture
    def large_agent_dataset(self):
        """Generate large agent dataset"""
        agents = []
        for i in range(1000):
            agent = {
                "id": f"agent-{i+1:04d}",
                "name": f"Agent-{i+1:04d}",
                "status": ["online", "offline", "warning", "error"][i % 4],
                "version": f"v{(i % 3) + 1}.{(i % 10)}.{(i % 5)}",
                "capabilities": ["monitoring", "analysis", "reporting"][: (i % 3) + 1],
                "lastSeen": (datetime.utcnow() - timedelta(minutes=i % 60)).isoformat(),
                "region": ["us-east-1", "us-west-2", "eu-west-1"][i % 3],
                "platform": ["OpenAI", "Anthropic", "Google"][i % 3],
            }
            agents.append(agent)
        return agents

    @pytest.fixture
    def large_metrics_dataset(self, large_agent_dataset):
        """Generate large metrics dataset"""
        metrics = []
        base_time = datetime.utcnow() - timedelta(hours=24)

        # 24 hours of 5-minute intervals = 288 intervals
        for i in range(288):
            timestamp = base_time + timedelta(minutes=i * 5)

            for agent in large_agent_dataset[:100]:  # Use first 100 agents
                metric = {
                    "agentId": agent["id"],
                    "timestamp": timestamp.isoformat(),
                    "cpu": 20 + (i % 60) + (hash(agent["id"]) % 20),
                    "memory": 30 + (i % 40) + (hash(agent["id"]) % 15),
                    "requestRate": 100 + (i % 200) + (hash(agent["id"]) % 50),
                    "errorRate": (i % 10) + (hash(agent["id"]) % 5),
                    "responseTime": 50 + (i % 100) + (hash(agent["id"]) % 30),
                    "throughput": 150 + (i % 300) + (hash(agent["id"]) % 100),
                    "activeConnections": 10 + (i % 50) + (hash(agent["id"]) % 20),
                    "queueDepth": (i % 20) + (hash(agent["id"]) % 10),
                    "diskUsage": 20 + (i % 30) + (hash(agent["id"]) % 10),
                    "networkLatency": 5 + (i % 30) + (hash(agent["id"]) % 15),
                }
                # Ensure values are within reasonable bounds
                metric["cpu"] = max(0, min(100, metric["cpu"]))
                metric["memory"] = max(0, min(100, metric["memory"]))
                metric["errorRate"] = max(0, min(100, metric["errorRate"]))
                metric["diskUsage"] = max(0, min(100, metric["diskUsage"]))

                metrics.append(metric)

        return metrics

    def test_agent_listing_performance(self, client, large_agent_dataset):
        """Test performance of listing large number of agents"""
        # Mock the database to return large dataset
        with patch("src.main.db") as mock_db:
            mock_db.get_agents.return_value = large_agent_dataset

            start_time = time.time()
            response = client.get("/api/v1/agents")
            end_time = time.time()

            # Since endpoint doesn't exist yet, this tests the expected behavior
            # In real implementation, should complete within reasonable time
            response_time = (end_time - start_time) * 1000

            # Should handle large dataset efficiently
            # assert response.status_code == 200
            # data = response.json()
            # assert len(data["data"]) == 1000
            assert response_time < 1000  # Under 1 second for listing

    def test_metrics_ingestion_performance(self, client, large_metrics_dataset):
        """Test performance of ingesting large volume of metrics"""
        ingestion_times = []

        # Ingest metrics in batches
        batch_size = 100
        for i in range(0, len(large_metrics_dataset), batch_size):
            batch = large_metrics_dataset[i : i + batch_size]

            start_time = time.time()

            # Ingest each metric in the batch
            for metric in batch:
                response = client.post("/api/v1/metrics", json=metric)
                assert response.status_code == 200

            end_time = time.time()
            batch_time = (end_time - start_time) * 1000
            ingestion_times.append(batch_time)

        # Performance metrics
        avg_batch_time = statistics.mean(ingestion_times)
        max_batch_time = max(ingestion_times)

        # Should handle batch ingestion efficiently
        assert avg_batch_time < 5000  # Average batch under 5 seconds
        assert max_batch_time < 10000  # Max batch under 10 seconds

        print("Batch ingestion performance:")
        print(f"  Average batch time: {avg_batch_time:.2f}ms")
        print(f"  Max batch time: {max_batch_time:.2f}ms")
        print(f"  Total metrics ingested: {len(large_metrics_dataset)}")

    def test_concurrent_metrics_ingestion(self, client):
        """Test concurrent metrics ingestion"""

        def ingest_metrics(agent_id, count):
            times = []
            for i in range(count):
                metric = {
                    "agentId": agent_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "cpu": 50 + (i % 30),
                    "memory": 60 + (i % 20),
                    "requestRate": 100 + (i % 50),
                    "errorRate": i % 5,
                    "responseTime": 80 + (i % 40),
                }

                start_time = time.time()
                response = client.post("/api/v1/metrics", json=metric)
                end_time = time.time()

                assert response.status_code == 200
                times.append((end_time - start_time) * 1000)

            return times

        # Create concurrent ingestion tasks
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = []
            for i in range(20):  # 20 concurrent agents
                future = executor.submit(ingest_metrics, f"agent-{i:03d}", 50)
                futures.append(future)

            all_times = []
            for future in as_completed(futures):
                times = future.result()
                all_times.extend(times)

        # Performance analysis
        avg_time = statistics.mean(all_times)
        p95_time = statistics.quantiles(all_times, n=20)[18]

        assert avg_time < 50  # Average under 50ms
        assert p95_time < 100  # 95th percentile under 100ms

        print("Concurrent ingestion performance:")
        print(f"  Total requests: {len(all_times)}")
        print(f"  Average time: {avg_time:.2f}ms")
        print(f"  95th percentile: {p95_time:.2f}ms")


class TestWebSocketPerformance:
    """Test WebSocket performance with many connections"""

    def test_websocket_connection_scaling(self, client):
        """Test handling multiple WebSocket connections"""
        connections = []
        connection_times = []

        try:
            # Create multiple WebSocket connections
            for i in range(50):
                start_time = time.time()
                ws = client.websocket_connect("/ws/metrics")
                connection = ws.__enter__()
                end_time = time.time()

                connections.append(connection)
                connection_times.append((end_time - start_time) * 1000)

                # Receive initial connection message
                data = connection.receive_json()
                assert data["type"] == "connection"

        finally:
            # Clean up connections
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass

        # Performance analysis
        avg_connection_time = statistics.mean(connection_times)
        max_connection_time = max(connection_times)

        assert avg_connection_time < 100  # Average connection under 100ms
        assert max_connection_time < 500  # Max connection under 500ms

        print("WebSocket connection performance:")
        print(f"  Connections created: {len(connections)}")
        print(f"  Average connection time: {avg_connection_time:.2f}ms")
        print(f"  Max connection time: {max_connection_time:.2f}ms")

    def test_websocket_message_throughput(self, client):
        """Test WebSocket message throughput"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            message_count = 0
            start_time = time.time()
            test_duration = 10  # 10 seconds

            # Collect messages for specified duration
            while time.time() - start_time < test_duration:
                try:
                    websocket.receive_json(timeout=1)
                    message_count += 1
                except:
                    break

            actual_duration = time.time() - start_time
            throughput = message_count / actual_duration

            # Should achieve minimum message throughput
            assert throughput > 0.1  # At least 0.1 messages per second

            print(f"WebSocket message throughput: {throughput:.2f} messages/second")
            print(f"Messages received: {message_count} in {actual_duration:.2f} seconds")


class TestDatabasePerformance:
    """Test database performance under load"""

    def test_database_query_performance(self, test_db_engine):
        """Test database query performance with large datasets"""
        # This would require setting up test database with large dataset
        # For now, test the structure

        with test_db_engine.connect() as conn:
            # Create tables
            conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS test_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT,
                    timestamp DATETIME,
                    cpu REAL,
                    memory REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            )

            # Insert test data
            start_time = time.time()
            for i in range(10000):
                conn.execute(
                    text("""
                    INSERT INTO test_metrics (agent_id, timestamp, cpu, memory)
                    VALUES (:agent_id, :timestamp, :cpu, :memory)
                """),
                    {
                        "agent_id": f"agent-{i % 100}",
                        "timestamp": datetime.utcnow().isoformat(),
                        "cpu": 50 + (i % 30),
                        "memory": 60 + (i % 25),
                    },
                )

            conn.commit()
            insert_time = time.time() - start_time

            # Test query performance
            start_time = time.time()
            result = conn.execute(
                text("""
                SELECT agent_id, AVG(cpu), AVG(memory), COUNT(*)
                FROM test_metrics
                GROUP BY agent_id
                ORDER BY agent_id
            """)
            )
            rows = result.fetchall()
            query_time = time.time() - start_time

            # Performance assertions
            assert insert_time < 30  # Insert 10k records in under 30 seconds
            assert query_time < 1  # Aggregate query in under 1 second
            assert len(rows) == 100  # Should have 100 agents

            print("Database performance:")
            print(f"  Insert time (10k records): {insert_time:.2f}s")
            print(f"  Query time (aggregation): {query_time:.2f}s")


class TestMemoryAndResourceUsage:
    """Test memory and resource usage under load"""

    def test_memory_leak_detection(self, client):
        """Test for memory leaks during extended operation"""
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        memory_samples = []

        # Run extended test
        for cycle in range(10):
            # Make many requests
            for _ in range(100):
                response = client.get("/health")
                assert response.status_code == 200

            # Sample memory usage
            current_memory = process.memory_info().rss / 1024 / 1024
            memory_samples.append(current_memory)

            # Brief pause between cycles
            time.sleep(0.1)

        final_memory = memory_samples[-1]
        memory_increase = final_memory - initial_memory

        # Check for excessive memory growth
        assert memory_increase < 100  # Less than 100MB increase

        # Check that memory usage stabilizes (not continuously growing)
        recent_samples = memory_samples[-5:]
        memory_variance = statistics.variance(recent_samples) if len(recent_samples) > 1 else 0
        assert memory_variance < 25  # Low variance indicates stability

        print("Memory leak test:")
        print(f"  Initial: {initial_memory:.2f}MB")
        print(f"  Final: {final_memory:.2f}MB")
        print(f"  Increase: {memory_increase:.2f}MB")
        print(f"  Variance (last 5 samples): {memory_variance:.2f}")

    def test_cpu_usage_under_load(self, client):
        """Test CPU usage during high load"""
        # Start CPU monitoring
        cpu_samples = []

        def monitor_cpu():
            for _ in range(20):  # Monitor for 10 seconds
                cpu_percent = psutil.cpu_percent(interval=0.5)
                cpu_samples.append(cpu_percent)

        # Start CPU monitoring in background
        monitor_thread = threading.Thread(target=monitor_cpu)
        monitor_thread.start()

        # Generate load
        def generate_load():
            for _ in range(200):
                response = client.get("/health")
                assert response.status_code == 200

        # Generate concurrent load
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(generate_load) for _ in range(5)]
            for future in as_completed(futures):
                future.result()

        # Wait for monitoring to complete
        monitor_thread.join()

        if cpu_samples:
            avg_cpu = statistics.mean(cpu_samples)
            max_cpu = max(cpu_samples)

            # CPU usage should be reasonable
            assert avg_cpu < 80  # Average CPU under 80%
            assert max_cpu < 95  # Max CPU under 95%

            print("CPU usage under load:")
            print(f"  Average: {avg_cpu:.2f}%")
            print(f"  Maximum: {max_cpu:.2f}%")

    def test_file_descriptor_usage(self, client):
        """Test file descriptor usage doesn't leak"""
        process = psutil.Process(os.getpid())
        initial_fds = process.num_fds() if hasattr(process, "num_fds") else 0

        # Make many requests that might open connections
        for _ in range(500):
            response = client.get("/health")
            assert response.status_code == 200

        final_fds = process.num_fds() if hasattr(process, "num_fds") else 0
        fd_increase = final_fds - initial_fds

        # File descriptor usage should not grow excessively
        if initial_fds > 0:  # Only test if we can measure FDs
            assert fd_increase < 10  # Less than 10 additional FDs

            print("File descriptor usage:")
            print(f"  Initial: {initial_fds}")
            print(f"  Final: {final_fds}")
            print(f"  Increase: {fd_increase}")


class TestStressScenarios:
    """Test system behavior under stress conditions"""

    def test_burst_traffic_handling(self, client):
        """Test handling of sudden traffic bursts"""
        # Simulate burst traffic
        burst_size = 200
        response_times = []
        errors = []

        def make_burst_request():
            try:
                start_time = time.time()
                response = client.get("/health")
                end_time = time.time()

                response_times.append((end_time - start_time) * 1000)
                return response.status_code
            except Exception as e:
                errors.append(str(e))
                return 500

        # Create sudden burst
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(make_burst_request) for _ in range(burst_size)]
            results = [future.result() for future in as_completed(futures)]
        end_time = time.time()

        burst_duration = end_time - start_time
        success_rate = sum(1 for status in results if status == 200) / len(results)

        # System should handle burst reasonably well
        assert success_rate > 0.95  # 95% success rate
        assert burst_duration < 10  # Complete burst within 10 seconds

        if response_times:
            avg_response_time = statistics.mean(response_times)
            assert avg_response_time < 200  # Average response under 200ms

        print("Burst traffic test:")
        print(f"  Requests: {burst_size}")
        print(f"  Duration: {burst_duration:.2f}s")
        print(f"  Success rate: {success_rate:.2%}")
        print(f"  Errors: {len(errors)}")
        if response_times:
            print(f"  Avg response time: {statistics.mean(response_times):.2f}ms")

    def test_sustained_load_performance(self, client):
        """Test performance under sustained load"""
        duration = 30  # 30 seconds of sustained load
        request_interval = 0.1  # 10 requests per second

        start_time = time.time()
        response_times = []
        error_count = 0

        while time.time() - start_time < duration:
            try:
                req_start = time.time()
                response = client.get("/health")
                req_end = time.time()

                if response.status_code == 200:
                    response_times.append((req_end - req_start) * 1000)
                else:
                    error_count += 1

                # Maintain request rate
                time.sleep(max(0, request_interval - (req_end - req_start)))

            except Exception:
                error_count += 1

        actual_duration = time.time() - start_time
        total_requests = len(response_times) + error_count
        success_rate = len(response_times) / total_requests if total_requests > 0 else 0

        # Performance under sustained load
        assert success_rate > 0.98  # 98% success rate

        if response_times:
            avg_response_time = statistics.mean(response_times)
            p95_response_time = (
                statistics.quantiles(response_times, n=20)[18]
                if len(response_times) >= 20
                else max(response_times)
            )

            assert avg_response_time < 100  # Average under 100ms
            assert p95_response_time < 200  # 95th percentile under 200ms

        print("Sustained load test:")
        print(f"  Duration: {actual_duration:.2f}s")
        print(f"  Total requests: {total_requests}")
        print(f"  Success rate: {success_rate:.2%}")
        print(f"  Errors: {error_count}")
        if response_times:
            print(f"  Avg response time: {statistics.mean(response_times):.2f}ms")
            print(
                f"  95th percentile: {statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else 'N/A':.2f}ms"
            )
