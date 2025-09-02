"""
Audit Logging Module
Provides comprehensive security event logging and monitoring
"""

import os
import json
import uuid
import hashlib
import logging
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field, asdict
from enum import Enum
import boto3
from botocore.exceptions import ClientError
import threading
from queue import Queue, Empty
import gzip
import base64

logger = logging.getLogger(__name__)


class EventSeverity(Enum):
    """Security event severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class EventType(Enum):
    """Security event types"""
    # Authentication events
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILURE = "auth.failure"
    AUTH_TOKEN_ISSUED = "auth.token.issued"
    AUTH_TOKEN_REVOKED = "auth.token.revoked"
    AUTH_TOKEN_REFRESHED = "auth.token.refreshed"
    AUTH_MFA_SUCCESS = "auth.mfa.success"
    AUTH_MFA_FAILURE = "auth.mfa.failure"
    
    # Authorization events
    AUTHZ_GRANTED = "authz.granted"
    AUTHZ_DENIED = "authz.denied"
    AUTHZ_ROLE_ASSIGNED = "authz.role.assigned"
    AUTHZ_ROLE_REVOKED = "authz.role.revoked"
    AUTHZ_PERMISSION_CHANGED = "authz.permission.changed"
    
    # Configuration events
    CONFIG_CREATED = "config.created"
    CONFIG_UPDATED = "config.updated"
    CONFIG_DELETED = "config.deleted"
    CONFIG_ACCESSED = "config.accessed"
    CONFIG_EXPORTED = "config.exported"
    
    # Secret events
    SECRET_CREATED = "secret.created"
    SECRET_ACCESSED = "secret.accessed"
    SECRET_UPDATED = "secret.updated"
    SECRET_DELETED = "secret.deleted"
    SECRET_ROTATED = "secret.rotated"
    SECRET_EXPOSED = "secret.exposed"
    
    # System events
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"
    SYSTEM_ERROR = "system.error"
    SYSTEM_WARNING = "system.warning"
    SYSTEM_BREACH_ATTEMPT = "system.breach.attempt"
    
    # Data events
    DATA_ENCRYPTED = "data.encrypted"
    DATA_DECRYPTED = "data.decrypted"
    DATA_EXPORTED = "data.exported"
    DATA_IMPORTED = "data.imported"
    DATA_DELETED = "data.deleted"
    
    # API events
    API_REQUEST = "api.request"
    API_RESPONSE = "api.response"
    API_ERROR = "api.error"
    API_RATE_LIMIT = "api.rate_limit"
    
    # User events
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_SUSPENDED = "user.suspended"
    USER_ACTIVATED = "user.activated"


@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: EventType = EventType.SYSTEM_WARNING
    severity: EventSeverity = EventSeverity.INFO
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    result: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    correlation_id: Optional[str] = None
    service_name: str = "claude-config-system"
    environment: str = field(default_factory=lambda: os.getenv('ENVIRONMENT', 'development'))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['event_type'] = self.event_type.value
        data['severity'] = self.severity.value
        return data
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict())
    
    def calculate_hash(self) -> str:
        """Calculate hash of event for integrity verification"""
        # Create deterministic string representation
        hash_input = f"{self.event_id}:{self.timestamp.isoformat()}:{self.event_type.value}:{self.user_id}"
        return hashlib.sha256(hash_input.encode()).hexdigest()


class AuditLogger:
    """
    Comprehensive audit logging system
    Supports multiple backends: CloudWatch, S3, local files
    """
    
    def __init__(self, 
                 cloudwatch_enabled: bool = True,
                 s3_enabled: bool = True,
                 file_enabled: bool = True,
                 async_mode: bool = True):
        """
        Initialize audit logger
        
        Args:
            cloudwatch_enabled: Enable CloudWatch Logs
            s3_enabled: Enable S3 archival
            file_enabled: Enable local file logging
            async_mode: Enable asynchronous logging
        """
        self.cloudwatch_enabled = cloudwatch_enabled and self._init_cloudwatch()
        self.s3_enabled = s3_enabled and self._init_s3()
        self.file_enabled = file_enabled
        self.async_mode = async_mode
        
        # Event queue for async logging
        self.event_queue = Queue(maxsize=10000)
        self.batch_size = 50
        self.flush_interval = 5  # seconds
        
        # Statistics
        self.events_logged = 0
        self.events_failed = 0
        
        # Start async worker if enabled
        if self.async_mode:
            self.worker_thread = threading.Thread(target=self._async_worker, daemon=True)
            self.worker_thread.start()
        
        # Local file setup
        if self.file_enabled:
            self.log_dir = os.getenv('AUDIT_LOG_DIR', '/var/log/claude-config')
            os.makedirs(self.log_dir, exist_ok=True)
            self.current_log_file = self._get_log_file_path()
        
        logger.info("Audit Logger initialized (CloudWatch: %s, S3: %s, File: %s, Async: %s)",
                   self.cloudwatch_enabled, self.s3_enabled, self.file_enabled, self.async_mode)
    
    def _init_cloudwatch(self) -> bool:
        """Initialize CloudWatch Logs client"""
        try:
            self.cloudwatch = boto3.client(
                'logs',
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            
            self.log_group = os.getenv('AUDIT_LOG_GROUP', '/aws/claude-config/audit')
            self.log_stream = f"{os.getenv('ENVIRONMENT', 'dev')}-{datetime.now().strftime('%Y%m%d')}"
            
            # Create log group if it doesn't exist
            try:
                self.cloudwatch.create_log_group(logGroupName=self.log_group)
            except ClientError as e:
                if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                    raise
            
            # Create log stream
            try:
                self.cloudwatch.create_log_stream(
                    logGroupName=self.log_group,
                    logStreamName=self.log_stream
                )
            except ClientError as e:
                if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                    raise
            
            # Get sequence token
            self.sequence_token = self._get_sequence_token()
            
            return True
            
        except Exception as e:
            logger.warning("Failed to initialize CloudWatch: %s", str(e))
            return False
    
    def _init_s3(self) -> bool:
        """Initialize S3 client for archival"""
        try:
            self.s3 = boto3.client(
                's3',
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            
            self.s3_bucket = os.getenv('AUDIT_S3_BUCKET', 'claude-config-audit-logs')
            self.s3_prefix = os.getenv('AUDIT_S3_PREFIX', 'audit-logs')
            
            # Verify bucket exists
            self.s3.head_bucket(Bucket=self.s3_bucket)
            
            return True
            
        except Exception as e:
            logger.warning("Failed to initialize S3: %s", str(e))
            return False
    
    def log_event(self, event: SecurityEvent) -> bool:
        """
        Log a security event
        
        Args:
            event: Security event to log
        
        Returns:
            True if successful
        """
        try:
            # Add event hash for integrity
            event.metadata['event_hash'] = event.calculate_hash()
            
            if self.async_mode:
                # Add to queue for async processing
                try:
                    self.event_queue.put_nowait(event)
                    return True
                except:
                    # Queue full, log synchronously
                    return self._log_event_sync(event)
            else:
                return self._log_event_sync(event)
                
        except Exception as e:
            logger.error("Failed to log event: %s", str(e))
            self.events_failed += 1
            return False
    
    def _log_event_sync(self, event: SecurityEvent) -> bool:
        """Synchronously log event to all backends"""
        success = True
        
        # Log to CloudWatch
        if self.cloudwatch_enabled:
            success = success and self._log_to_cloudwatch([event])
        
        # Log to file
        if self.file_enabled:
            success = success and self._log_to_file(event)
        
        # Archive to S3 for critical events
        if self.s3_enabled and event.severity in [EventSeverity.CRITICAL, EventSeverity.HIGH]:
            success = success and self._archive_to_s3(event)
        
        if success:
            self.events_logged += 1
        else:
            self.events_failed += 1
        
        return success
    
    def _async_worker(self) -> None:
        """Async worker thread for batch logging"""
        batch = []
        last_flush = datetime.now()
        
        while True:
            try:
                # Get event from queue with timeout
                event = self.event_queue.get(timeout=1)
                batch.append(event)
                
                # Check if batch is full or time to flush
                if len(batch) >= self.batch_size or \
                   (datetime.now() - last_flush).seconds >= self.flush_interval:
                    self._flush_batch(batch)
                    batch = []
                    last_flush = datetime.now()
                    
            except Empty:
                # Timeout reached, flush if needed
                if batch and (datetime.now() - last_flush).seconds >= self.flush_interval:
                    self._flush_batch(batch)
                    batch = []
                    last_flush = datetime.now()
            except Exception as e:
                logger.error("Async worker error: %s", str(e))
    
    def _flush_batch(self, batch: List[SecurityEvent]) -> None:
        """Flush batch of events to backends"""
        if not batch:
            return
        
        # Log to CloudWatch
        if self.cloudwatch_enabled:
            self._log_to_cloudwatch(batch)
        
        # Log to files
        if self.file_enabled:
            for event in batch:
                self._log_to_file(event)
        
        # Archive critical events to S3
        if self.s3_enabled:
            critical_events = [e for e in batch 
                              if e.severity in [EventSeverity.CRITICAL, EventSeverity.HIGH]]
            for event in critical_events:
                self._archive_to_s3(event)
        
        self.events_logged += len(batch)
    
    def _log_to_cloudwatch(self, events: List[SecurityEvent]) -> bool:
        """Log events to CloudWatch"""
        try:
            log_events = [
                {
                    'timestamp': int(event.timestamp.timestamp() * 1000),
                    'message': event.to_json()
                }
                for event in events
            ]
            
            kwargs = {
                'logGroupName': self.log_group,
                'logStreamName': self.log_stream,
                'logEvents': log_events
            }
            
            if self.sequence_token:
                kwargs['sequenceToken'] = self.sequence_token
            
            response = self.cloudwatch.put_log_events(**kwargs)
            self.sequence_token = response.get('nextSequenceToken')
            
            return True
            
        except Exception as e:
            logger.error("Failed to log to CloudWatch: %s", str(e))
            return False
    
    def _log_to_file(self, event: SecurityEvent) -> bool:
        """Log event to local file"""
        try:
            # Rotate file if needed
            if self._should_rotate_file():
                self._rotate_log_file()
            
            # Write event
            with open(self.current_log_file, 'a') as f:
                f.write(event.to_json() + '\n')
            
            return True
            
        except Exception as e:
            logger.error("Failed to log to file: %s", str(e))
            return False
    
    def _archive_to_s3(self, event: SecurityEvent) -> bool:
        """Archive event to S3"""
        try:
            # Create S3 key
            date_path = event.timestamp.strftime('%Y/%m/%d')
            key = f"{self.s3_prefix}/{date_path}/{event.event_type.value}/{event.event_id}.json.gz"
            
            # Compress event data
            event_json = event.to_json()
            compressed = gzip.compress(event_json.encode())
            
            # Upload to S3
            self.s3.put_object(
                Bucket=self.s3_bucket,
                Key=key,
                Body=compressed,
                ContentType='application/json',
                ContentEncoding='gzip',
                Metadata={
                    'event-type': event.event_type.value,
                    'severity': event.severity.value,
                    'user-id': event.user_id or 'system',
                    'timestamp': event.timestamp.isoformat()
                }
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to archive to S3: %s", str(e))
            return False
    
    def _get_log_file_path(self) -> str:
        """Get current log file path"""
        date_str = datetime.now().strftime('%Y%m%d')
        return os.path.join(self.log_dir, f"audit-{date_str}.jsonl")
    
    def _should_rotate_file(self) -> bool:
        """Check if log file should be rotated"""
        if not os.path.exists(self.current_log_file):
            return False
        
        # Rotate if file is from different day
        file_date = os.path.basename(self.current_log_file).split('-')[1].split('.')[0]
        current_date = datetime.now().strftime('%Y%m%d')
        
        return file_date != current_date
    
    def _rotate_log_file(self) -> None:
        """Rotate log file"""
        # Compress old file
        if os.path.exists(self.current_log_file):
            with open(self.current_log_file, 'rb') as f_in:
                with gzip.open(f"{self.current_log_file}.gz", 'wb') as f_out:
                    f_out.writelines(f_in)
            os.remove(self.current_log_file)
        
        # Update to new file
        self.current_log_file = self._get_log_file_path()
    
    def _get_sequence_token(self) -> Optional[str]:
        """Get CloudWatch sequence token"""
        try:
            response = self.cloudwatch.describe_log_streams(
                logGroupName=self.log_group,
                logStreamNamePrefix=self.log_stream
            )
            
            for stream in response.get('logStreams', []):
                if stream['logStreamName'] == self.log_stream:
                    return stream.get('uploadSequenceToken')
            
            return None
            
        except Exception:
            return None
    
    def query_events(self, 
                    start_time: datetime = None,
                    end_time: datetime = None,
                    event_type: EventType = None,
                    user_id: str = None,
                    severity: EventSeverity = None,
                    limit: int = 100) -> List[SecurityEvent]:
        """
        Query audit logs
        
        Args:
            start_time: Start time for query
            end_time: End time for query
            event_type: Filter by event type
            user_id: Filter by user ID
            severity: Filter by severity
            limit: Maximum results
        
        Returns:
            List of matching events
        """
        events = []
        
        if not self.cloudwatch_enabled:
            logger.warning("CloudWatch not enabled, cannot query events")
            return events
        
        try:
            # Build CloudWatch Insights query
            query_parts = ['fields @timestamp, @message']
            filters = []
            
            if event_type:
                filters.append(f'event_type = "{event_type.value}"')
            if user_id:
                filters.append(f'user_id = "{user_id}"')
            if severity:
                filters.append(f'severity = "{severity.value}"')
            
            if filters:
                query_parts.append(f"| filter {' and '.join(filters)}")
            
            query_parts.append(f"| limit {limit}")
            
            query = '\n'.join(query_parts)
            
            # Execute query
            start_timestamp = int(start_time.timestamp()) if start_time else int((datetime.now() - timedelta(days=1)).timestamp())
            end_timestamp = int(end_time.timestamp()) if end_time else int(datetime.now().timestamp())
            
            response = self.cloudwatch.start_query(
                logGroupName=self.log_group,
                startTime=start_timestamp,
                endTime=end_timestamp,
                queryString=query
            )
            
            query_id = response['queryId']
            
            # Wait for query to complete
            while True:
                result = self.cloudwatch.get_query_results(queryId=query_id)
                
                if result['status'] == 'Complete':
                    for row in result['results']:
                        message = next((field['value'] for field in row if field['field'] == '@message'), None)
                        if message:
                            event_dict = json.loads(message)
                            events.append(self._dict_to_event(event_dict))
                    break
                elif result['status'] == 'Failed':
                    logger.error("Query failed")
                    break
                
                time.sleep(0.5)
            
        except Exception as e:
            logger.error("Failed to query events: %s", str(e))
        
        return events
    
    def _dict_to_event(self, data: Dict[str, Any]) -> SecurityEvent:
        """Convert dictionary to SecurityEvent"""
        return SecurityEvent(
            event_id=data.get('event_id'),
            timestamp=datetime.fromisoformat(data.get('timestamp')),
            event_type=EventType(data.get('event_type')),
            severity=EventSeverity(data.get('severity')),
            user_id=data.get('user_id'),
            session_id=data.get('session_id'),
            ip_address=data.get('ip_address'),
            user_agent=data.get('user_agent'),
            resource=data.get('resource'),
            action=data.get('action'),
            result=data.get('result'),
            error_message=data.get('error_message'),
            metadata=data.get('metadata', {}),
            correlation_id=data.get('correlation_id'),
            service_name=data.get('service_name'),
            environment=data.get('environment')
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get logging statistics"""
        return {
            'events_logged': self.events_logged,
            'events_failed': self.events_failed,
            'queue_size': self.event_queue.qsize() if self.async_mode else 0,
            'cloudwatch_enabled': self.cloudwatch_enabled,
            's3_enabled': self.s3_enabled,
            'file_enabled': self.file_enabled,
            'async_mode': self.async_mode
        }
    
    def flush(self) -> None:
        """Flush any pending events"""
        if self.async_mode:
            # Process all queued events
            batch = []
            while not self.event_queue.empty():
                try:
                    batch.append(self.event_queue.get_nowait())
                except Empty:
                    break
            
            if batch:
                self._flush_batch(batch)


# Global audit logger instance
_audit_logger = None


def get_audit_logger() -> AuditLogger:
    """Get global audit logger instance"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger


def log_security_event(event_type: EventType, 
                       severity: EventSeverity = EventSeverity.INFO,
                       **kwargs) -> None:
    """
    Convenience function to log security event
    
    Args:
        event_type: Type of event
        severity: Event severity
        **kwargs: Additional event fields
    """
    logger = get_audit_logger()
    event = SecurityEvent(
        event_type=event_type,
        severity=severity,
        **kwargs
    )
    logger.log_event(event)