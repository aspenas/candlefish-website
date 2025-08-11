"""
Health Check and Metrics Server for Slack Workspace Manager
Provides HTTP endpoints for health checks and metrics collection
"""

import json
import time
from datetime import datetime
from typing import Dict, Any
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import structlog
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Gauge
import psutil
import os

logger = structlog.get_logger(__name__)

# Metrics
health_checks = Counter("health_checks_total", "Total health check requests")
app_info = Gauge("app_info", "Application information", ["version", "name"])
system_cpu_percent = Gauge("system_cpu_percent", "System CPU usage percentage")
system_memory_percent = Gauge("system_memory_percent", "System memory usage percentage")
app_uptime_seconds = Gauge("app_uptime_seconds", "Application uptime in seconds")

# Initialize app info
app_info.labels(version="1.0.0", name="candlefish-workspace-manager").set(1)


class HealthHandler(BaseHTTPRequestHandler):
    """HTTP handler for health checks and metrics"""

    def __init__(self, workspace_manager=None, *args, **kwargs):
        self.workspace_manager = workspace_manager
        self.start_time = time.time()
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Handle GET requests"""
        try:
            if self.path == "/health":
                self._handle_health_check()
            elif self.path == "/metrics":
                self._handle_metrics()
            elif self.path == "/ready":
                self._handle_readiness_check()
            elif self.path == "/status":
                self._handle_status()
            else:
                self._send_404()
        except Exception as e:
            logger.error(f"Health handler error: {str(e)}")
            self._send_500(str(e))

    def _handle_health_check(self):
        """Handle health check endpoint"""
        health_checks.inc()

        try:
            # Basic health check
            health_data = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "uptime": time.time() - self.start_time,
                "version": "1.0.0",
                "service": "candlefish-workspace-manager",
            }

            # Add Slack connectivity check if workspace manager is available
            if hasattr(self, "workspace_manager") and self.workspace_manager:
                try:
                    # Simple API test
                    result = self.workspace_manager.app.client.auth_test()
                    health_data["slack_connected"] = True
                    health_data["slack_team"] = result.get("team", "unknown")
                except Exception as e:
                    health_data["slack_connected"] = False
                    health_data["slack_error"] = str(e)

            self._send_json_response(200, health_data)

        except Exception as e:
            error_data = {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self._send_json_response(503, error_data)

    def _handle_readiness_check(self):
        """Handle readiness check endpoint"""
        try:
            # More comprehensive readiness check
            ready = True
            checks = {}

            # Check if workspace manager is initialized
            if hasattr(self, "workspace_manager") and self.workspace_manager:
                try:
                    # Test Slack connection
                    result = self.workspace_manager.app.client.auth_test()
                    checks["slack_connection"] = {
                        "status": "pass",
                        "team": result.get("team", "unknown"),
                    }
                except Exception as e:
                    checks["slack_connection"] = {"status": "fail", "error": str(e)}
                    ready = False

                # Check service integrations
                try:
                    services = self.workspace_manager.service_integrator.get_all_services()
                    checks["service_integrator"] = {
                        "status": "pass",
                        "service_count": len(services),
                    }
                except Exception as e:
                    checks["service_integrator"] = {"status": "fail", "error": str(e)}
                    ready = False
            else:
                checks["workspace_manager"] = {"status": "fail", "error": "Not initialized"}
                ready = False

            # Check system resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent

            if cpu_percent > 90:
                checks["cpu"] = {"status": "fail", "percent": cpu_percent}
                ready = False
            else:
                checks["cpu"] = {"status": "pass", "percent": cpu_percent}

            if memory_percent > 90:
                checks["memory"] = {"status": "fail", "percent": memory_percent}
                ready = False
            else:
                checks["memory"] = {"status": "pass", "percent": memory_percent}

            response_data = {
                "status": "ready" if ready else "not_ready",
                "timestamp": datetime.now().isoformat(),
                "checks": checks,
            }

            status_code = 200 if ready else 503
            self._send_json_response(status_code, response_data)

        except Exception as e:
            error_data = {
                "status": "not_ready",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self._send_json_response(503, error_data)

    def _handle_metrics(self):
        """Handle Prometheus metrics endpoint"""
        try:
            # Update system metrics
            system_cpu_percent.set(psutil.cpu_percent())
            system_memory_percent.set(psutil.virtual_memory().percent)
            app_uptime_seconds.set(time.time() - self.start_time)

            # Generate Prometheus metrics
            metrics_data = generate_latest()

            self.send_response(200)
            self.send_header("Content-Type", CONTENT_TYPE_LATEST)
            self.end_headers()
            self.wfile.write(metrics_data)

        except Exception as e:
            logger.error(f"Metrics error: {str(e)}")
            self._send_500(str(e))

    def _handle_status(self):
        """Handle detailed status endpoint"""
        try:
            status_data = {
                "service": "candlefish-workspace-manager",
                "version": "1.0.0",
                "status": "running",
                "timestamp": datetime.now().isoformat(),
                "uptime_seconds": time.time() - self.start_time,
                "system": {
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_percent": psutil.disk_usage("/").percent,
                    "load_average": os.getloadavg() if hasattr(os, "getloadavg") else None,
                },
            }

            # Add workspace manager specific status
            if hasattr(self, "workspace_manager") and self.workspace_manager:
                try:
                    auth_result = self.workspace_manager.app.client.auth_test()
                    status_data["slack"] = {
                        "connected": True,
                        "team": auth_result.get("team", "unknown"),
                        "user": auth_result.get("user", "unknown"),
                        "team_id": auth_result.get("team_id", "unknown"),
                    }

                    # Service integration status
                    services = self.workspace_manager.service_integrator.get_all_services()
                    service_statuses = {}

                    for service_name in services[:5]:  # Limit to prevent timeout
                        try:
                            service_status = (
                                self.workspace_manager.service_integrator.get_service_status(
                                    service_name
                                )
                            )
                            service_statuses[service_name] = {
                                "healthy": service_status.get("healthy", False),
                                "status": service_status.get("status", "unknown"),
                            }
                        except:
                            service_statuses[service_name] = {
                                "healthy": False,
                                "status": "check_failed",
                            }

                    status_data["services"] = service_statuses

                except Exception as e:
                    status_data["slack"] = {"connected": False, "error": str(e)}

            self._send_json_response(200, status_data)

        except Exception as e:
            error_data = {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self._send_json_response(500, error_data)

    def _send_json_response(self, status_code: int, data: Dict[str, Any]):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        json_data = json.dumps(data, indent=2, default=str)
        self.wfile.write(json_data.encode("utf-8"))

    def _send_404(self):
        """Send 404 response"""
        error_data = {
            "error": "Not Found",
            "path": self.path,
            "timestamp": datetime.now().isoformat(),
        }
        self._send_json_response(404, error_data)

    def _send_500(self, error_message: str):
        """Send 500 response"""
        error_data = {
            "error": "Internal Server Error",
            "message": error_message,
            "timestamp": datetime.now().isoformat(),
        }
        self._send_json_response(500, error_data)

    def log_message(self, format, *args):
        """Override to prevent default logging"""
        logger.info(f"HTTP {format % args}")


class HealthServer:
    """Health check and metrics server"""

    def __init__(self, workspace_manager=None, port=8000):
        self.workspace_manager = workspace_manager
        self.port = port
        self.server = None
        self.thread = None
        self.start_time = time.time()

    def start(self):
        """Start the health server"""
        try:

            def handler(*args, **kwargs):
                handler_instance = HealthHandler(*args, **kwargs)
                handler_instance.workspace_manager = self.workspace_manager
                handler_instance.start_time = self.start_time
                return handler_instance

            self.server = HTTPServer(("0.0.0.0", self.port), handler)

            self.thread = threading.Thread(
                target=self.server.serve_forever, name="HealthServer", daemon=True
            )
            self.thread.start()

            logger.info(f"Health server started on port {self.port}")

        except Exception as e:
            logger.error(f"Failed to start health server: {str(e)}")
            raise

    def stop(self):
        """Stop the health server"""
        if self.server:
            self.server.shutdown()
            self.server.server_close()

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)

        logger.info("Health server stopped")

    def is_running(self) -> bool:
        """Check if server is running"""
        return self.thread and self.thread.is_alive()
