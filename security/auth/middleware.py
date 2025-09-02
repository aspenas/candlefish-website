"""
Authentication and Authorization Middleware
Provides request authentication and authorization for APIs
"""

import os
import json
import logging
import time
from typing import Dict, Any, Optional, List, Callable, Union
from functools import wraps
from datetime import datetime, timedelta
import jwt
import redis
from flask import request, jsonify, g
from flask import Flask, Request, Response
import hashlib
import hmac

from .jwt_handler import JWTHandler
from .rbac import RBACManager, Permission
from ..core.audit import AuditLogger, SecurityEvent, EventType, EventSeverity
from ..core.validator import InputValidator, InputType

logger = logging.getLogger(__name__)

# Global instances
_jwt_handler: Optional[JWTHandler] = None
_rbac_manager: Optional[RBACManager] = None
_audit_logger: Optional[AuditLogger] = None
_input_validator: Optional[InputValidator] = None


def initialize_security(app: Flask, config: Dict[str, Any] = None) -> None:
    """
    Initialize security middleware for Flask application
    
    Args:
        app: Flask application instance
        config: Security configuration
    """
    global _jwt_handler, _rbac_manager, _audit_logger, _input_validator
    
    config = config or {}
    
    # Initialize components
    _jwt_handler = JWTHandler(
        private_key=config.get('jwt_private_key'),
        public_key=config.get('jwt_public_key')
    )
    
    _rbac_manager = RBACManager()
    _audit_logger = AuditLogger()
    _input_validator = InputValidator(strict_mode=config.get('strict_mode', True))
    
    # Configure app
    app.config['SECRET_KEY'] = config.get('secret_key', os.urandom(32))
    app.config['JWT_ALGORITHM'] = 'RS256'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)
    
    # Add security headers middleware
    @app.after_request
    def add_security_headers(response: Response) -> Response:
        """Add security headers to all responses"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Remove server header
        response.headers.pop('Server', None)
        
        return response
    
    # Add CORS headers if configured
    if config.get('cors_enabled'):
        @app.after_request
        def add_cors_headers(response: Response) -> Response:
            """Add CORS headers"""
            allowed_origins = config.get('cors_origins', ['http://localhost:3000'])
            origin = request.headers.get('Origin')
            
            if origin in allowed_origins:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Max-Age'] = '3600'
            
            return response
    
    logger.info("Security middleware initialized")


def get_jwt_handler() -> JWTHandler:
    """Get JWT handler instance"""
    global _jwt_handler
    if _jwt_handler is None:
        _jwt_handler = JWTHandler()
    return _jwt_handler


def get_rbac_manager() -> RBACManager:
    """Get RBAC manager instance"""
    global _rbac_manager
    if _rbac_manager is None:
        _rbac_manager = RBACManager()
    return _rbac_manager


def get_audit_logger() -> AuditLogger:
    """Get audit logger instance"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger


def get_input_validator() -> InputValidator:
    """Get input validator instance"""
    global _input_validator
    if _input_validator is None:
        _input_validator = InputValidator()
    return _input_validator


def authenticate(f: Callable) -> Callable:
    """
    Authentication decorator for routes
    Validates JWT token and sets user context
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            # Log authentication failure
            get_audit_logger().log_event(SecurityEvent(
                event_type=EventType.AUTH_FAILURE,
                severity=EventSeverity.MEDIUM,
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
                error_message="Missing authorization header"
            ))
            
            return jsonify({'error': 'Authorization required'}), 401
        
        # Extract token
        try:
            scheme, token = auth_header.split(' ')
            if scheme.lower() != 'bearer':
                raise ValueError("Invalid authentication scheme")
        except ValueError:
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        # Verify token
        jwt_handler = get_jwt_handler()
        
        try:
            payload = jwt_handler.verify_token(token, token_type='access')
            
            # Set user context
            g.user_id = payload['sub']
            g.token_payload = payload
            g.permissions = get_rbac_manager().get_user_permissions(payload['sub'])
            
            # Log successful authentication
            get_audit_logger().log_event(SecurityEvent(
                event_type=EventType.AUTH_SUCCESS,
                severity=EventSeverity.INFO,
                user_id=payload['sub'],
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string
            ))
            
            return f(*args, **kwargs)
            
        except jwt.InvalidTokenError as e:
            # Log authentication failure
            get_audit_logger().log_event(SecurityEvent(
                event_type=EventType.AUTH_FAILURE,
                severity=EventSeverity.HIGH,
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
                error_message=str(e)
            ))
            
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            logger.error("Authentication error: %s", str(e))
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function


def authorize(*required_permissions: Permission):
    """
    Authorization decorator for routes
    Checks if user has required permissions
    
    Args:
        *required_permissions: Required permissions (all must be present)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Ensure user is authenticated
            if not hasattr(g, 'user_id'):
                return jsonify({'error': 'Authentication required'}), 401
            
            # Check permissions
            rbac = get_rbac_manager()
            user_id = g.user_id
            
            # Get resource from route if available
            resource = kwargs.get('resource_id') or request.view_args.get('resource_id')
            
            # Build context
            context = {
                'client_ip': request.remote_addr,
                'user_agent': request.user_agent.string,
                'method': request.method,
                'path': request.path
            }
            
            # Check all required permissions
            for permission in required_permissions:
                if not rbac.check_permission(user_id, permission, resource, context):
                    # Log authorization failure
                    get_audit_logger().log_event(SecurityEvent(
                        event_type=EventType.AUTHZ_DENIED,
                        severity=EventSeverity.MEDIUM,
                        user_id=user_id,
                        ip_address=request.remote_addr,
                        resource=resource,
                        action=permission.value,
                        error_message=f"Missing permission: {permission.value}"
                    ))
                    
                    return jsonify({'error': f'Insufficient permissions: {permission.value}'}), 403
            
            # Log successful authorization
            get_audit_logger().log_event(SecurityEvent(
                event_type=EventType.AUTHZ_GRANTED,
                severity=EventSeverity.INFO,
                user_id=user_id,
                ip_address=request.remote_addr,
                resource=resource,
                action=','.join([p.value for p in required_permissions])
            ))
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def validate_input(schema: Dict[str, Any]):
    """
    Input validation decorator
    Validates request data against schema
    
    Args:
        schema: Validation schema
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            validator = get_input_validator()
            
            # Get request data
            if request.method in ['POST', 'PUT', 'PATCH']:
                data = request.get_json() or {}
            else:
                data = request.args.to_dict()
            
            # Validate each field
            errors = []
            sanitized_data = {}
            
            for field, rules in schema.items():
                value = data.get(field)
                
                # Check required fields
                if rules.get('required') and value is None:
                    errors.append(f"Missing required field: {field}")
                    continue
                
                if value is not None:
                    # Validate type
                    input_type = InputType(rules.get('type', 'string'))
                    is_valid, sanitized, error = validator.validate(
                        value,
                        input_type,
                        **rules.get('options', {})
                    )
                    
                    if not is_valid:
                        errors.append(f"{field}: {error}")
                    else:
                        sanitized_data[field] = sanitized
            
            if errors:
                return jsonify({'errors': errors}), 400
            
            # Add sanitized data to request context
            g.validated_data = sanitized_data
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def rate_limit(max_requests: int = 100, window: int = 60):
    """
    Rate limiting decorator
    Limits requests per IP/user
    
    Args:
        max_requests: Maximum requests allowed
        window: Time window in seconds
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get identifier (user ID or IP)
            identifier = g.get('user_id', request.remote_addr)
            key = f"rate_limit:{f.__name__}:{identifier}"
            
            # Check rate limit
            try:
                # Get Redis client
                redis_client = redis.Redis(
                    host=os.getenv('REDIS_HOST', 'localhost'),
                    port=int(os.getenv('REDIS_PORT', 6379)),
                    decode_responses=True
                )
                
                # Get current count
                current = redis_client.get(key)
                
                if current is None:
                    # First request
                    redis_client.setex(key, window, 1)
                    remaining = max_requests - 1
                else:
                    current_count = int(current)
                    if current_count >= max_requests:
                        # Rate limit exceeded
                        get_audit_logger().log_event(SecurityEvent(
                            event_type=EventType.API_RATE_LIMIT,
                            severity=EventSeverity.MEDIUM,
                            user_id=g.get('user_id'),
                            ip_address=request.remote_addr,
                            action=f.__name__,
                            metadata={'limit': max_requests, 'window': window}
                        ))
                        
                        return jsonify({
                            'error': 'Rate limit exceeded',
                            'retry_after': redis_client.ttl(key)
                        }), 429
                    
                    # Increment counter
                    redis_client.incr(key)
                    remaining = max_requests - current_count - 1
                
                # Add rate limit headers
                response = f(*args, **kwargs)
                if isinstance(response, tuple):
                    response = response[0]
                
                response.headers['X-RateLimit-Limit'] = str(max_requests)
                response.headers['X-RateLimit-Remaining'] = str(remaining)
                response.headers['X-RateLimit-Reset'] = str(int(time.time()) + redis_client.ttl(key))
                
                return response
                
            except redis.RedisError:
                # Redis not available, allow request but log warning
                logger.warning("Rate limiting unavailable - Redis connection failed")
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def csrf_protect(f: Callable) -> Callable:
    """
    CSRF protection decorator
    Validates CSRF token for state-changing operations
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            # Get CSRF token from header or form
            csrf_token = request.headers.get('X-CSRF-Token') or \
                        request.form.get('csrf_token')
            
            if not csrf_token:
                return jsonify({'error': 'CSRF token required'}), 403
            
            # Validate token
            expected_token = g.get('csrf_token')
            if not expected_token:
                # Generate token if not exists
                expected_token = generate_csrf_token()
                g.csrf_token = expected_token
            
            if not hmac.compare_digest(csrf_token, expected_token):
                get_audit_logger().log_event(SecurityEvent(
                    event_type=EventType.SYSTEM_BREACH_ATTEMPT,
                    severity=EventSeverity.HIGH,
                    user_id=g.get('user_id'),
                    ip_address=request.remote_addr,
                    error_message="Invalid CSRF token"
                ))
                
                return jsonify({'error': 'Invalid CSRF token'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


def generate_csrf_token() -> str:
    """Generate CSRF token"""
    # Use session ID and timestamp
    session_id = g.get('session_id', os.urandom(16).hex())
    timestamp = str(int(time.time()))
    
    # Create HMAC
    secret = os.getenv('CSRF_SECRET', 'default-csrf-secret')
    message = f"{session_id}:{timestamp}"
    
    token = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return token


def api_key_required(f: Callable) -> Callable:
    """
    API key authentication decorator
    For service-to-service authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        if not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        # Validate API key
        from ..core.secrets import SecretsManager
        secrets_manager = SecretsManager()
        
        try:
            # Get valid API keys from secrets
            valid_keys = secrets_manager.get_secret('api-keys/valid')
            
            if api_key not in valid_keys.get('keys', []):
                get_audit_logger().log_event(SecurityEvent(
                    event_type=EventType.AUTH_FAILURE,
                    severity=EventSeverity.HIGH,
                    ip_address=request.remote_addr,
                    error_message="Invalid API key"
                ))
                
                return jsonify({'error': 'Invalid API key'}), 401
            
            # Set service context
            g.service_id = valid_keys['keys'][api_key].get('service_id')
            
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error("API key validation error: %s", str(e))
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function


def ip_whitelist(allowed_ips: List[str]):
    """
    IP whitelist decorator
    Restricts access to specific IP addresses
    
    Args:
        allowed_ips: List of allowed IP addresses or CIDR ranges
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            
            # Check if IP is in whitelist
            import ipaddress
            
            client_addr = ipaddress.ip_address(client_ip)
            allowed = False
            
            for ip_range in allowed_ips:
                try:
                    network = ipaddress.ip_network(ip_range, strict=False)
                    if client_addr in network:
                        allowed = True
                        break
                except ValueError:
                    # Try as single IP
                    if str(client_addr) == ip_range:
                        allowed = True
                        break
            
            if not allowed:
                get_audit_logger().log_event(SecurityEvent(
                    event_type=EventType.SYSTEM_BREACH_ATTEMPT,
                    severity=EventSeverity.HIGH,
                    ip_address=client_ip,
                    error_message="IP not in whitelist"
                ))
                
                return jsonify({'error': 'Access denied'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


class SecurityMiddleware:
    """
    Comprehensive security middleware for WSGI applications
    """
    
    def __init__(self, app: Any, config: Dict[str, Any] = None):
        """
        Initialize security middleware
        
        Args:
            app: WSGI application
            config: Security configuration
        """
        self.app = app
        self.config = config or {}
        
        # Initialize security components
        initialize_security(app, config)
    
    def __call__(self, environ: Dict[str, Any], start_response: Callable) -> Any:
        """
        WSGI middleware entry point
        
        Args:
            environ: WSGI environment
            start_response: Response starter
        
        Returns:
            Response iterator
        """
        # Add security checks here
        
        # Check for common attack patterns
        path = environ.get('PATH_INFO', '')
        query = environ.get('QUERY_STRING', '')
        
        # Path traversal check
        if '../' in path or '..\\' in path:
            start_response('400 Bad Request', [('Content-Type', 'text/plain')])
            return [b'Invalid request']
        
        # SQL injection check in query string
        sql_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION']
        if any(keyword in query.upper() for keyword in sql_keywords):
            get_audit_logger().log_event(SecurityEvent(
                event_type=EventType.SYSTEM_BREACH_ATTEMPT,
                severity=EventSeverity.HIGH,
                ip_address=environ.get('REMOTE_ADDR'),
                error_message="Potential SQL injection in query string"
            ))
            
            start_response('400 Bad Request', [('Content-Type', 'text/plain')])
            return [b'Invalid request']
        
        # Pass through to application
        return self.app(environ, start_response)