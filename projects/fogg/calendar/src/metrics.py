"""OpenTelemetry metrics configuration for Cloud Monitoring."""

import os

from opentelemetry import metrics
from opentelemetry.exporter.cloud_monitoring import CloudMonitoringMetricsExporter
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from structlog import get_logger

logger = get_logger()


class MetricsManager:
    """Manages OpenTelemetry metrics for the application."""

    def __init__(
        self,
        service_name: str = "fogg-calendar",
        project_id: str | None = None,
        export_interval_seconds: int = 60,
    ):
        """Initialize metrics manager.

        Args:
            service_name: Name of the service
            project_id: GCP project ID (auto-detected if not provided)
            export_interval_seconds: How often to export metrics
        """
        self.service_name = service_name
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.export_interval_seconds = export_interval_seconds
        self._meter: metrics.Meter | None = None
        self._instruments: dict[str, metrics.Instrument] = {}

    def setup_metrics(self) -> None:
        """Configure OpenTelemetry metrics with Cloud Monitoring exporter."""
        try:
            # Create resource with service information
            resource = Resource.create(
                {
                    "service.name": self.service_name,
                    "service.version": os.getenv("SERVICE_VERSION", "unknown"),
                    "cloud.provider": "gcp",
                    "cloud.platform": "gcp_cloud_run",
                }
            )

            # Create Cloud Monitoring exporter
            if self.project_id and os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                exporter = CloudMonitoringMetricsExporter(
                    project_id=self.project_id,
                    metric_prefix=f"custom.googleapis.com/{self.service_name}",
                )

                # Create metric reader
                reader = PeriodicExportingMetricReader(
                    exporter=exporter,
                    export_interval_millis=self.export_interval_seconds * 1000,
                )

                # Create meter provider
                provider = MeterProvider(
                    resource=resource,
                    metric_readers=[reader],
                )
            else:
                # Use default provider without export
                logger.warning("Cloud Monitoring export disabled - no credentials")
                provider = MeterProvider(resource=resource)

            # Set global meter provider
            metrics.set_meter_provider(provider)

            # Get meter for our service
            self._meter = metrics.get_meter(self.service_name)

            # Create instruments
            self._create_instruments()

            # Instrument libraries
            self._instrument_libraries()

            logger.info("Metrics configured successfully")

        except Exception as e:
            logger.error("Failed to configure metrics", error=str(e))

    def _create_instruments(self) -> None:
        """Create metric instruments."""
        if not self._meter:
            return

        # API call counter
        self._instruments["api_calls"] = self._meter.create_counter(
            name="api_calls",
            description="Number of Google API calls",
            unit="1",
        )

        # API call duration
        self._instruments["api_duration"] = self._meter.create_histogram(
            name="api_duration",
            description="Duration of Google API calls",
            unit="ms",
        )

        # MCP tool invocations
        self._instruments["mcp_invocations"] = self._meter.create_counter(
            name="mcp_invocations",
            description="Number of MCP tool invocations",
            unit="1",
        )

        # Calendar operations
        self._instruments["calendar_operations"] = self._meter.create_counter(
            name="calendar_operations",
            description="Number of calendar operations",
            unit="1",
        )

        # Error counter
        self._instruments["errors"] = self._meter.create_counter(
            name="errors",
            description="Number of errors",
            unit="1",
        )

        # Health check gauge
        self._instruments["health_status"] = self._meter.create_gauge(
            name="health_status",
            description="Health check status (1=healthy, 0=unhealthy)",
            unit="1",
        )

        # Active tokens gauge
        self._instruments["active_tokens"] = self._meter.create_gauge(
            name="active_tokens",
            description="Number of active authentication tokens",
            unit="1",
        )

    def _instrument_libraries(self) -> None:
        """Instrument external libraries for automatic metrics."""
        try:
            # Instrument gRPC client calls
            GrpcInstrumentorClient().instrument()

            # Instrument HTTP requests
            RequestsInstrumentor().instrument()

            logger.info("Instrumented external libraries")
        except Exception as e:
            logger.error("Failed to instrument libraries", error=str(e))

    def record_api_call(
        self,
        operation: str,
        duration_ms: float,
        success: bool = True,
        api_name: str = "google_calendar",
    ) -> None:
        """Record an API call metric.

        Args:
            operation: API operation name
            duration_ms: Duration in milliseconds
            success: Whether the call succeeded
            api_name: Name of the API
        """
        if "api_calls" in self._instruments:
            self._instruments["api_calls"].add(
                1,
                attributes={
                    "operation": operation,
                    "api": api_name,
                    "success": str(success).lower(),
                },
            )

        if "api_duration" in self._instruments:
            self._instruments["api_duration"].record(
                duration_ms,
                attributes={
                    "operation": operation,
                    "api": api_name,
                },
            )

    def record_mcp_invocation(
        self,
        tool_name: str,
        success: bool = True,
        duration_ms: float | None = None,
    ) -> None:
        """Record an MCP tool invocation.

        Args:
            tool_name: Name of the MCP tool
            success: Whether the invocation succeeded
            duration_ms: Optional duration in milliseconds
        """
        if "mcp_invocations" in self._instruments:
            self._instruments["mcp_invocations"].add(
                1,
                attributes={
                    "tool": tool_name,
                    "success": str(success).lower(),
                },
            )

        if duration_ms and "api_duration" in self._instruments:
            self._instruments["api_duration"].record(
                duration_ms,
                attributes={
                    "operation": f"mcp_{tool_name}",
                    "api": "mcp",
                },
            )

    def record_calendar_operation(
        self,
        operation_type: str,
        calendar_id: str | None = None,
        success: bool = True,
    ) -> None:
        """Record a calendar operation.

        Args:
            operation_type: Type of operation (create, update, delete, share)
            calendar_id: Optional calendar ID
            success: Whether the operation succeeded
        """
        if "calendar_operations" in self._instruments:
            attrs = {
                "operation": operation_type,
                "success": str(success).lower(),
            }
            if calendar_id:
                # Hash calendar ID for privacy
                import hashlib

                attrs["calendar_hash"] = hashlib.md5(calendar_id.encode()).hexdigest()[:8]

            self._instruments["calendar_operations"].add(1, attributes=attrs)

    def record_error(
        self,
        error_type: str,
        operation: str,
        api_name: str = "google_calendar",
    ) -> None:
        """Record an error metric.

        Args:
            error_type: Type of error
            operation: Operation that failed
            api_name: Name of the API
        """
        if "errors" in self._instruments:
            self._instruments["errors"].add(
                1,
                attributes={
                    "error_type": error_type,
                    "operation": operation,
                    "api": api_name,
                },
            )

    def set_health_status(self, is_healthy: bool) -> None:
        """Set the health status gauge.

        Args:
            is_healthy: Whether the service is healthy
        """
        if "health_status" in self._instruments:
            self._instruments["health_status"].set(
                1 if is_healthy else 0,
                attributes={"service": self.service_name},
            )

    def set_active_tokens(self, count: int) -> None:
        """Set the number of active authentication tokens.

        Args:
            count: Number of active tokens
        """
        if "active_tokens" in self._instruments:
            self._instruments["active_tokens"].set(
                count,
                attributes={"service": self.service_name},
            )


# Global metrics manager instance
_metrics_manager: MetricsManager | None = None


def get_metrics_manager() -> MetricsManager:
    """Get the global metrics manager instance.

    Returns:
        MetricsManager instance
    """
    global _metrics_manager
    if _metrics_manager is None:
        _metrics_manager = MetricsManager()
        _metrics_manager.setup_metrics()
    return _metrics_manager
