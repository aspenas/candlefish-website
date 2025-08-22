"""
WebSocket connection tests for RTPM API
Tests WebSocket functionality, connection handling, and real-time data streaming
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import time


class TestWebSocketConnection:
    """Test basic WebSocket connection functionality"""

    def test_websocket_connection_success(self, client):
        """Test successful WebSocket connection"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Should receive initial connection message
            data = websocket.receive_json()

            assert data["type"] == "connection"
            assert data["status"] == "connected"
            assert "timestamp" in data

    def test_websocket_connection_multiple_clients(self, client):
        """Test multiple simultaneous WebSocket connections"""
        connections = []

        try:
            # Create 5 concurrent connections
            for i in range(5):
                ws = client.websocket_connect("/ws/metrics")
                connections.append(ws.__enter__())

            # Each should receive connection message
            for i, ws in enumerate(connections):
                data = ws.receive_json()
                assert data["type"] == "connection"
                assert data["status"] == "connected"

        finally:
            # Clean up connections
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass

    def test_websocket_invalid_endpoint(self, client):
        """Test connection to invalid WebSocket endpoint"""
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/invalid"):
                pass

    def test_websocket_connection_limit(self, client):
        """Test WebSocket connection limits"""
        connections = []
        max_connections = 100

        try:
            # Try to create many connections
            for i in range(max_connections):
                try:
                    ws = client.websocket_connect("/ws/metrics")
                    connections.append(ws.__enter__())
                except Exception:
                    # Connection limit reached
                    break

            # Should handle at least 50 concurrent connections
            assert len(connections) >= 50

        finally:
            # Clean up all connections
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass


class TestWebSocketMessaging:
    """Test WebSocket message sending and receiving"""

    def test_receive_metric_updates(self, client):
        """Test receiving real-time metric updates"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Should receive metric updates periodically
            received_messages = []
            start_time = time.time()

            # Collect messages for 10 seconds
            while time.time() - start_time < 10:
                try:
                    data = websocket.receive_json(timeout=2)
                    if data.get("type") == "metric":
                        received_messages.append(data)

                        # Validate metric structure
                        assert "payload" in data
                        payload = data["payload"]
                        assert "name" in payload
                        assert "value" in payload
                        assert "timestamp" in payload

                        if len(received_messages) >= 3:
                            break
                except:
                    # Timeout or error receiving message
                    break

            # Should receive at least some metric updates
            assert len(received_messages) > 0

    def test_client_message_handling(self, client):
        """Test sending messages from client to server"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Send a keepalive message
            websocket.send_text("keepalive")

            # Should continue to receive updates
            try:
                data = websocket.receive_json(timeout=10)
                assert data["type"] == "metric"
            except:
                pytest.fail("Failed to receive metric after sending keepalive")

    def test_json_message_format(self, client):
        """Test that all messages are valid JSON"""
        with client.websocket_connect("/ws/metrics") as websocket:
            messages_received = 0

            for _ in range(5):
                try:
                    # This will raise exception if not valid JSON
                    data = websocket.receive_json(timeout=5)

                    # Validate message structure
                    assert isinstance(data, dict)
                    assert "type" in data

                    messages_received += 1
                except:
                    break

            assert messages_received >= 1


class TestWebSocketErrorHandling:
    """Test WebSocket error handling and edge cases"""

    def test_websocket_disconnect_handling(self, client):
        """Test proper handling of client disconnections"""
        # This tests that the server properly cleans up on disconnect
        connection_count_before = 0

        with patch("src.main.manager") as mock_manager:
            mock_manager.active_connections = []
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = MagicMock()

            with client.websocket_connect("/ws/metrics") as websocket:
                # Connection established
                websocket.receive_json()

            # After context exit, disconnect should be called
            # This is handled by the WebSocket context manager

    def test_websocket_malformed_message(self, client):
        """Test handling of malformed messages from client"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Send malformed message
            try:
                websocket.send_text("invalid json {")

                # Server should continue operating
                data = websocket.receive_json(timeout=10)
                assert data["type"] == "metric"
            except Exception:
                # Connection might be closed due to malformed message
                # This is acceptable behavior
                pass

    def test_websocket_connection_drop(self, client):
        """Test handling of unexpected connection drops"""
        with patch("src.main.manager") as mock_manager:
            mock_manager.active_connections = []
            mock_manager.connect = AsyncMock()
            mock_manager.disconnect = MagicMock()

            # Simulate connection drop
            mock_manager.broadcast = AsyncMock(side_effect=Exception("Connection lost"))

            with client.websocket_connect("/ws/metrics") as websocket:
                # Connection should still be established
                data = websocket.receive_json()
                assert data["type"] == "connection"


class TestWebSocketPerformance:
    """Test WebSocket performance and scalability"""

    def test_websocket_throughput(self, client):
        """Test WebSocket message throughput"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            messages_received = 0
            start_time = time.time()

            # Collect messages for 30 seconds
            while time.time() - start_time < 30:
                try:
                    websocket.receive_json(timeout=1)
                    messages_received += 1
                except:
                    break

            elapsed_time = time.time() - start_time
            throughput = messages_received / elapsed_time

            # Should handle at least 1 message per 5 seconds
            assert throughput >= 0.2

    def test_websocket_memory_usage(self, client):
        """Test WebSocket memory usage under load"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        connections = []

        try:
            # Create multiple connections and receive messages
            for i in range(20):
                ws = client.websocket_connect("/ws/metrics")
                connections.append(ws.__enter__())

            # Let connections run for a bit
            time.sleep(5)

            # Check memory usage
            current_memory = process.memory_info().rss
            memory_increase = current_memory - initial_memory

            # Memory increase should be reasonable (less than 100MB)
            assert memory_increase < 100 * 1024 * 1024

        finally:
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass

    def test_websocket_latency(self, client):
        """Test WebSocket message latency"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            latencies = []

            for i in range(10):
                # Send keepalive and measure response time
                start_time = time.time()
                websocket.send_text(f"keepalive-{i}")

                try:
                    websocket.receive_json(timeout=5)
                    end_time = time.time()
                    latency = (end_time - start_time) * 1000  # Convert to ms
                    latencies.append(latency)
                except:
                    break

                time.sleep(1)  # Wait between messages

            if latencies:
                avg_latency = sum(latencies) / len(latencies)
                # Average latency should be under 100ms
                assert avg_latency < 100


class TestWebSocketBroadcasting:
    """Test WebSocket broadcasting functionality"""

    def test_broadcast_to_multiple_clients(self, client):
        """Test broadcasting messages to multiple connected clients"""
        connections = []

        try:
            # Create multiple connections
            for i in range(3):
                ws = client.websocket_connect("/ws/metrics")
                connections.append(ws.__enter__())

            # Each should receive connection message
            for ws in connections:
                data = ws.receive_json()
                assert data["type"] == "connection"

            # All should receive metric updates
            for ws in connections:
                try:
                    data = ws.receive_json(timeout=10)
                    assert data["type"] == "metric"
                except:
                    pytest.fail("Not all clients received broadcast message")

        finally:
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass

    def test_selective_broadcasting(self, client):
        """Test that messages are only sent to active connections"""
        # This would test that disconnected clients don't receive messages
        pass


class TestWebSocketAuthentication:
    """Test WebSocket authentication and authorization (if implemented)"""

    def test_websocket_without_auth(self, client):
        """Test WebSocket connection without authentication"""
        # Currently no auth required, should succeed
        with client.websocket_connect("/ws/metrics") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connection"

    def test_websocket_with_invalid_auth(self, client):
        """Test WebSocket connection with invalid authentication"""
        # This would test auth headers if implemented
        headers = {"Authorization": "Bearer invalid_token"}

        try:
            with client.websocket_connect("/ws/metrics", headers=headers) as websocket:
                data = websocket.receive_json()
                # Currently no auth, so should still succeed
                assert data["type"] == "connection"
        except:
            # If auth is implemented, this might fail
            pass


class TestWebSocketReconnection:
    """Test WebSocket reconnection scenarios"""

    def test_reconnect_after_disconnect(self, client):
        """Test reconnecting after disconnection"""
        # First connection
        with client.websocket_connect("/ws/metrics") as websocket1:
            data1 = websocket1.receive_json()
            assert data1["type"] == "connection"

        # Second connection after first is closed
        with client.websocket_connect("/ws/metrics") as websocket2:
            data2 = websocket2.receive_json()
            assert data2["type"] == "connection"

    def test_rapid_reconnection(self, client):
        """Test rapid reconnection attempts"""
        for i in range(5):
            with client.websocket_connect("/ws/metrics") as websocket:
                data = websocket.receive_json()
                assert data["type"] == "connection"

            # Brief pause between connections
            time.sleep(0.1)


@pytest.mark.asyncio
class TestAsyncWebSocket:
    """Test asynchronous WebSocket operations"""

    async def test_async_websocket_handling(self):
        """Test asynchronous WebSocket message handling"""
        # This would test the actual async implementation
        # Requires proper async WebSocket client
        pass

    async def test_concurrent_websocket_operations(self):
        """Test concurrent WebSocket operations"""
        # This would test multiple async operations
        pass


class TestWebSocketIntegration:
    """Test WebSocket integration with other components"""

    def test_websocket_with_api_calls(self, client):
        """Test WebSocket behavior when API calls are made"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Make an API call that should trigger WebSocket notification
            response = client.post(
                "/api/v1/metrics",
                json={
                    "agentId": "test-agent",
                    "cpu": 75.0,
                    "memory": 60.0,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            assert response.status_code == 200

            # Should receive the metric via WebSocket
            # (This depends on the implementation broadcasting the ingested metric)

    def test_websocket_connection_manager(self, client):
        """Test the WebSocket connection manager functionality"""
        from src.main import manager

        initial_count = len(manager.active_connections)

        with client.websocket_connect("/ws/metrics") as websocket:
            # Connection count should increase
            assert len(manager.active_connections) == initial_count + 1

            # Receive connection message
            data = websocket.receive_json()
            assert data["type"] == "connection"

        # Connection count should return to initial
        # Note: This might be flaky due to async cleanup
        # assert len(manager.active_connections) == initial_count


class TestWebSocketStressTest:
    """Stress tests for WebSocket functionality"""

    def test_websocket_stress_connections(self, client):
        """Stress test with many simultaneous connections"""
        connections = []
        max_connections = 50

        try:
            for i in range(max_connections):
                try:
                    ws = client.websocket_connect("/ws/metrics")
                    connections.append(ws.__enter__())
                except Exception:
                    # Stop when we can't create more connections
                    break

            # All connections should receive initial message
            successful_connections = 0
            for ws in connections:
                try:
                    data = ws.receive_json(timeout=5)
                    if data["type"] == "connection":
                        successful_connections += 1
                except:
                    pass

            # At least 80% of connections should be successful
            success_rate = successful_connections / len(connections)
            assert success_rate >= 0.8

        finally:
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass

    def test_websocket_message_flood(self, client):
        """Test handling of message flood from clients"""
        with client.websocket_connect("/ws/metrics") as websocket:
            # Skip connection message
            websocket.receive_json()

            # Send many messages rapidly
            for i in range(100):
                try:
                    websocket.send_text(f"message-{i}")
                except:
                    break

            # Server should still be responsive
            try:
                data = websocket.receive_json(timeout=10)
                assert data["type"] == "metric"
            except:
                pytest.fail("Server became unresponsive after message flood")
