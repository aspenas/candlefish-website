"""
Monitoring and metrics for Slack Admin Bot
Includes Prometheus metrics, health checks, and alerting
"""

import time
import asyncio
from typing import Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import json

import structlog
from prometheus_client import Counter, Histogram, Gauge, start_http_server

logger = structlog.get_logger(__name__)

# Prometheus metrics
SLACK_API_CALLS = Counter("slack_api_calls_total", "Total Slack API calls", ["method", "status"])
SLACK_API_DURATION = Histogram("slack_api_call_duration_seconds", "Slack API call duration")
ADMIN_ACTIONS = Counter(
    "admin_actions_total", "Total admin actions performed", ["action_type", "success"]
)
EVENTS_PROCESSED = Counter(
    "slack_events_processed_total", "Total Slack events processed", ["event_type"]
)
BOT_UPTIME = Gauge("bot_uptime_seconds", "Bot uptime in seconds")
ACTIVE_CONNECTIONS = Gauge("active_websocket_connections", "Active WebSocket connections")
ERROR_RATE = Counter("bot_errors_total", "Total bot errors", ["error_type"])


@dataclass
class HealthCheck:
    """Health check result"""

    name: str
    healthy: bool
    message: str
    timestamp: datetime
    response_time: float = 0.0


@dataclass
class MetricSnapshot:
    """Snapshot of bot metrics"""

    timestamp: datetime
    api_calls: int
    admin_actions: int
    events_processed: int
    uptime_seconds: float
    error_count: int
    health_checks: List[HealthCheck]


class MonitoringService:
    """Comprehensive monitoring service for Slack Admin Bot"""

    def __init__(self, bot_instance=None):
        self.bot = bot_instance
        self.start_time = time.time()
        self.health_checks: List[HealthCheck] = []
        self.metrics_history: List[MetricSnapshot] = []
        self.running = False

        # Start Prometheus metrics server
        start_http_server(8000)
        logger.info("Prometheus metrics server started on port 8000")

    async def start_monitoring(self):
        """Start monitoring services"""
        self.running = True
        logger.info("Starting monitoring services")

        # Start background tasks
        asyncio.create_task(self._update_uptime_metric())
        asyncio.create_task(self._periodic_health_checks())
        asyncio.create_task(self._collect_metrics_snapshots())

    async def stop_monitoring(self):
        """Stop monitoring services"""
        self.running = False
        await self._generate_final_report()
        logger.info("Monitoring services stopped")

    async def _update_uptime_metric(self):
        """Continuously update uptime metric"""
        while self.running:
            uptime = time.time() - self.start_time
            BOT_UPTIME.set(uptime)
            await asyncio.sleep(10)

    async def _periodic_health_checks(self):
        """Run health checks periodically"""
        while self.running:
            await self.run_health_checks()
            await asyncio.sleep(60)  # Run every minute

    async def _collect_metrics_snapshots(self):
        """Collect metrics snapshots for trend analysis"""
        while self.running:
            snapshot = await self._create_metrics_snapshot()
            self.metrics_history.append(snapshot)

            # Keep only last 24 hours of data
            cutoff_time = datetime.now() - timedelta(hours=24)
            self.metrics_history = [s for s in self.metrics_history if s.timestamp > cutoff_time]

            await asyncio.sleep(300)  # Collect every 5 minutes

    async def run_health_checks(self) -> List[HealthCheck]:
        """Run comprehensive health checks"""
        checks = []

        # Slack API connectivity check
        checks.append(await self._check_slack_api())

        # AWS Secrets Manager check
        checks.append(await self._check_aws_secrets())

        # WebSocket connection check
        checks.append(await self._check_websocket_connection())

        # Bot responsiveness check
        checks.append(await self._check_bot_responsiveness())

        # Memory usage check
        checks.append(await self._check_memory_usage())

        self.health_checks = checks

        # Log any failed health checks
        failed_checks = [c for c in checks if not c.healthy]
        if failed_checks:
            logger.warning("Health checks failed", failed_count=len(failed_checks))
            for check in failed_checks:
                logger.warning("Failed health check", name=check.name, message=check.message)

        return checks

    async def _check_slack_api(self) -> HealthCheck:
        """Check Slack API connectivity"""
        start_time = time.time()

        try:
            if self.bot and self.bot.web_client:
                auth_response = self.bot.web_client.auth_test()
                response_time = time.time() - start_time

                SLACK_API_CALLS.labels(method="auth_test", status="success").inc()
                SLACK_API_DURATION.observe(response_time)

                return HealthCheck(
                    name="slack_api",
                    healthy=True,
                    message=f"Connected as {auth_response.get('user')}",
                    timestamp=datetime.now(),
                    response_time=response_time,
                )
            else:
                return HealthCheck(
                    name="slack_api",
                    healthy=False,
                    message="Bot client not initialized",
                    timestamp=datetime.now(),
                )

        except Exception as e:
            response_time = time.time() - start_time
            SLACK_API_CALLS.labels(method="auth_test", status="error").inc()
            ERROR_RATE.labels(error_type="slack_api").inc()

            return HealthCheck(
                name="slack_api",
                healthy=False,
                message=f"API error: {str(e)}",
                timestamp=datetime.now(),
                response_time=response_time,
            )

    async def _check_aws_secrets(self) -> HealthCheck:
        """Check AWS Secrets Manager connectivity"""
        start_time = time.time()

        try:
            from config import config_manager

            # Try to load config from secrets manager
            config = config_manager.load_from_secrets_manager()
            response_time = time.time() - start_time

            if config.user_token:
                return HealthCheck(
                    name="aws_secrets",
                    healthy=True,
                    message="Successfully loaded configuration",
                    timestamp=datetime.now(),
                    response_time=response_time,
                )
            else:
                return HealthCheck(
                    name="aws_secrets",
                    healthy=False,
                    message="No valid tokens found",
                    timestamp=datetime.now(),
                    response_time=response_time,
                )

        except Exception as e:
            response_time = time.time() - start_time
            ERROR_RATE.labels(error_type="aws_secrets").inc()

            return HealthCheck(
                name="aws_secrets",
                healthy=False,
                message=f"AWS Secrets error: {str(e)}",
                timestamp=datetime.now(),
                response_time=response_time,
            )

    async def _check_websocket_connection(self) -> HealthCheck:
        """Check WebSocket connection status"""
        try:
            if self.bot and self.bot.socket_client:
                # Check if socket client is connected
                # Note: This is a simplified check - actual implementation may vary
                connected = getattr(self.bot.socket_client, "is_connected", lambda: False)()

                ACTIVE_CONNECTIONS.set(1 if connected else 0)

                return HealthCheck(
                    name="websocket",
                    healthy=connected,
                    message="WebSocket connected" if connected else "WebSocket disconnected",
                    timestamp=datetime.now(),
                )
            else:
                ACTIVE_CONNECTIONS.set(0)
                return HealthCheck(
                    name="websocket",
                    healthy=False,
                    message="Socket Mode not available",
                    timestamp=datetime.now(),
                )

        except Exception as e:
            ERROR_RATE.labels(error_type="websocket").inc()
            return HealthCheck(
                name="websocket",
                healthy=False,
                message=f"WebSocket error: {str(e)}",
                timestamp=datetime.now(),
            )

    async def _check_bot_responsiveness(self) -> HealthCheck:
        """Check if bot is responding properly"""
        try:
            if self.bot and self.bot.running:
                return HealthCheck(
                    name="bot_responsive",
                    healthy=True,
                    message="Bot is running and responsive",
                    timestamp=datetime.now(),
                )
            else:
                return HealthCheck(
                    name="bot_responsive",
                    healthy=False,
                    message="Bot is not running",
                    timestamp=datetime.now(),
                )

        except Exception as e:
            return HealthCheck(
                name="bot_responsive",
                healthy=False,
                message=f"Responsiveness check failed: {str(e)}",
                timestamp=datetime.now(),
            )

    async def _check_memory_usage(self) -> HealthCheck:
        """Check memory usage"""
        try:
            import psutil
            import os

            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024

            # Alert if memory usage is over 500MB
            healthy = memory_mb < 500

            return HealthCheck(
                name="memory_usage",
                healthy=healthy,
                message=f"Memory usage: {memory_mb:.1f} MB",
                timestamp=datetime.now(),
            )

        except ImportError:
            return HealthCheck(
                name="memory_usage",
                healthy=True,
                message="psutil not available - memory check skipped",
                timestamp=datetime.now(),
            )
        except Exception as e:
            return HealthCheck(
                name="memory_usage",
                healthy=False,
                message=f"Memory check failed: {str(e)}",
                timestamp=datetime.now(),
            )

    async def _create_metrics_snapshot(self) -> MetricSnapshot:
        """Create a snapshot of current metrics"""
        uptime = time.time() - self.start_time

        # Note: In a real implementation, you'd get actual metric values
        # from the Prometheus client or maintain counters in the bot
        return MetricSnapshot(
            timestamp=datetime.now(),
            api_calls=0,  # Would be retrieved from actual metrics
            admin_actions=len(getattr(self.bot, "admin_actions", [])),
            events_processed=0,  # Would be retrieved from actual metrics
            uptime_seconds=uptime,
            error_count=0,  # Would be retrieved from actual metrics
            health_checks=self.health_checks.copy(),
        )

    def record_api_call(self, method: str, success: bool, duration: float):
        """Record a Slack API call"""
        status = "success" if success else "error"
        SLACK_API_CALLS.labels(method=method, status=status).inc()
        SLACK_API_DURATION.observe(duration)

    def record_admin_action(self, action_type: str, success: bool):
        """Record an admin action"""
        ADMIN_ACTIONS.labels(action_type=action_type, success=str(success).lower()).inc()

    def record_event_processed(self, event_type: str):
        """Record a processed Slack event"""
        EVENTS_PROCESSED.labels(event_type=event_type).inc()

    def record_error(self, error_type: str):
        """Record an error"""
        ERROR_RATE.labels(error_type=error_type).inc()

    async def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status"""
        recent_checks = await self.run_health_checks()
        failed_checks = [c for c in recent_checks if not c.healthy]

        return {
            "overall_healthy": len(failed_checks) == 0,
            "total_checks": len(recent_checks),
            "failed_checks": len(failed_checks),
            "uptime_seconds": time.time() - self.start_time,
            "last_check": datetime.now().isoformat(),
            "checks": [asdict(c) for c in recent_checks],
        }

    async def _generate_final_report(self):
        """Generate final monitoring report"""
        try:
            final_health = await self.get_health_status()

            report = {
                "session_summary": {
                    "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
                    "end_time": datetime.now().isoformat(),
                    "total_uptime": time.time() - self.start_time,
                    "final_health_status": final_health,
                },
                "metrics_history": [
                    asdict(m) for m in self.metrics_history[-10:]
                ],  # Last 10 snapshots
            }

            with open("monitoring_report.json", "w") as f:
                json.dump(report, f, indent=2, default=str)

            logger.info("Final monitoring report generated")

        except Exception as e:
            logger.error("Failed to generate final report", error=str(e))


# Global monitoring instance
monitoring_service = None


def get_monitoring_service(bot_instance=None) -> MonitoringService:
    """Get or create monitoring service instance"""
    global monitoring_service
    if monitoring_service is None:
        monitoring_service = MonitoringService(bot_instance)
    return monitoring_service
