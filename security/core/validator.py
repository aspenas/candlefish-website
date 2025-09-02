"""
Input Validation and Sanitization Module
Implements comprehensive input validation to prevent injection attacks
"""

import re
import json
import html
import urllib.parse
import ipaddress
import logging
from typing import Any, Dict, List, Optional, Union, Pattern, Callable
from datetime import datetime
from enum import Enum
import bleach
import validators
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Custom validation error"""
    pass


class InputType(Enum):
    """Input types for validation"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    EMAIL = "email"
    URL = "url"
    IP_ADDRESS = "ip_address"
    JSON = "json"
    SQL = "sql"
    HTML = "html"
    JAVASCRIPT = "javascript"
    PATH = "path"
    COMMAND = "command"
    REGEX = "regex"
    DATE = "date"
    UUID = "uuid"
    JWT = "jwt"
    BASE64 = "base64"
    PHONE = "phone"
    CREDIT_CARD = "credit_card"


@dataclass
class ValidationRule:
    """Validation rule definition"""
    name: str
    validator: Callable[[Any], bool]
    error_message: str
    sanitizer: Optional[Callable[[Any], Any]] = None


@dataclass
class ValidationSchema:
    """Validation schema for complex objects"""
    fields: Dict[str, List[ValidationRule]] = field(default_factory=dict)
    required_fields: List[str] = field(default_factory=list)
    allow_unknown: bool = False
    strict_mode: bool = True


class InputValidator:
    """
    Comprehensive input validation and sanitization
    Prevents injection attacks and validates data integrity
    """
    
    # Regex patterns for common validations
    PATTERNS = {
        'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
        'uuid': re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I),
        'jwt': re.compile(r'^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$'),
        'base64': re.compile(r'^[A-Za-z0-9+/]*={0,2}$'),
        'phone': re.compile(r'^\+?[1-9]\d{1,14}$'),
        'alphanumeric': re.compile(r'^[a-zA-Z0-9]+$'),
        'safe_string': re.compile(r'^[a-zA-Z0-9\s\-_.]+$'),
        'no_special': re.compile(r'^[^<>\"\'%;()&+]+$'),
    }
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        re.compile(r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)', re.I),
        re.compile(r'(--|\||;|\/\*|\*\/)', re.I),
        re.compile(r'(\bOR\b.*=.*)', re.I),
        re.compile(r'(\bAND\b.*=.*)', re.I),
        re.compile(r'(\'|\"|`)', re.I),
        re.compile(r'(\bEXEC\b|\bEXECUTE\b)', re.I),
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        re.compile(r'<script[^>]*>.*?</script>', re.I | re.S),
        re.compile(r'javascript:', re.I),
        re.compile(r'on\w+\s*=', re.I),
        re.compile(r'<iframe[^>]*>', re.I),
        re.compile(r'<object[^>]*>', re.I),
        re.compile(r'<embed[^>]*>', re.I),
        re.compile(r'<applet[^>]*>', re.I),
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        re.compile(r'\.\.\/'),
        re.compile(r'\.\.\\'),
        re.compile(r'%2e%2e%2f', re.I),
        re.compile(r'%252e%252e%252f', re.I),
    ]
    
    # Command injection patterns
    COMMAND_INJECTION_PATTERNS = [
        re.compile(r'[;&|`$]'),
        re.compile(r'\$\(.*\)'),
        re.compile(r'`.*`'),
    ]
    
    def __init__(self, strict_mode: bool = True):
        """
        Initialize validator
        
        Args:
            strict_mode: Enable strict validation mode
        """
        self.strict_mode = strict_mode
        self.validation_stats = {
            'total_validations': 0,
            'passed': 0,
            'failed': 0,
            'sanitized': 0
        }
        
        logger.info("Input Validator initialized (strict_mode: %s)", strict_mode)
    
    def validate(self, value: Any, input_type: InputType, 
                **kwargs) -> Tuple[bool, Any, Optional[str]]:
        """
        Validate and sanitize input
        
        Args:
            value: Value to validate
            input_type: Type of input
            **kwargs: Additional validation parameters
        
        Returns:
            Tuple of (is_valid, sanitized_value, error_message)
        """
        self.validation_stats['total_validations'] += 1
        
        try:
            # Type-specific validation
            if input_type == InputType.STRING:
                return self._validate_string(value, **kwargs)
            elif input_type == InputType.INTEGER:
                return self._validate_integer(value, **kwargs)
            elif input_type == InputType.FLOAT:
                return self._validate_float(value, **kwargs)
            elif input_type == InputType.BOOLEAN:
                return self._validate_boolean(value)
            elif input_type == InputType.EMAIL:
                return self._validate_email(value)
            elif input_type == InputType.URL:
                return self._validate_url(value, **kwargs)
            elif input_type == InputType.IP_ADDRESS:
                return self._validate_ip(value, **kwargs)
            elif input_type == InputType.JSON:
                return self._validate_json(value)
            elif input_type == InputType.SQL:
                return self._validate_sql(value)
            elif input_type == InputType.HTML:
                return self._validate_html(value, **kwargs)
            elif input_type == InputType.JAVASCRIPT:
                return self._validate_javascript(value)
            elif input_type == InputType.PATH:
                return self._validate_path(value, **kwargs)
            elif input_type == InputType.COMMAND:
                return self._validate_command(value)
            elif input_type == InputType.DATE:
                return self._validate_date(value, **kwargs)
            elif input_type == InputType.UUID:
                return self._validate_uuid(value)
            elif input_type == InputType.JWT:
                return self._validate_jwt(value)
            elif input_type == InputType.BASE64:
                return self._validate_base64(value)
            elif input_type == InputType.PHONE:
                return self._validate_phone(value)
            else:
                return False, value, f"Unsupported input type: {input_type}"
                
        except Exception as e:
            logger.error("Validation error for type %s: %s", input_type, str(e))
            self.validation_stats['failed'] += 1
            return False, value, str(e)
    
    def _validate_string(self, value: Any, min_length: int = 0, 
                        max_length: int = 10000,
                        pattern: Pattern = None,
                        allowed_chars: str = None,
                        strip_html: bool = True) -> Tuple[bool, str, Optional[str]]:
        """Validate string input"""
        if not isinstance(value, str):
            return False, value, "Value must be a string"
        
        # Length check
        if len(value) < min_length:
            return False, value, f"String too short (min: {min_length})"
        if len(value) > max_length:
            return False, value, f"String too long (max: {max_length})"
        
        # Strip HTML if requested
        if strip_html:
            value = self.sanitize_html(value)
            self.validation_stats['sanitized'] += 1
        
        # Pattern matching
        if pattern and not pattern.match(value):
            return False, value, "String does not match required pattern"
        
        # Allowed characters check
        if allowed_chars:
            if not all(c in allowed_chars for c in value):
                return False, value, "String contains invalid characters"
        
        # Check for common injection patterns
        if self.strict_mode:
            for sql_pattern in self.SQL_INJECTION_PATTERNS:
                if sql_pattern.search(value):
                    return False, value, "Potential SQL injection detected"
            
            for xss_pattern in self.XSS_PATTERNS:
                if xss_pattern.search(value):
                    return False, value, "Potential XSS attack detected"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_integer(self, value: Any, min_value: int = None,
                         max_value: int = None) -> Tuple[bool, int, Optional[str]]:
        """Validate integer input"""
        try:
            int_value = int(value)
            
            if min_value is not None and int_value < min_value:
                return False, value, f"Value too small (min: {min_value})"
            if max_value is not None and int_value > max_value:
                return False, value, f"Value too large (max: {max_value})"
            
            self.validation_stats['passed'] += 1
            return True, int_value, None
            
        except (ValueError, TypeError):
            return False, value, "Invalid integer value"
    
    def _validate_float(self, value: Any, min_value: float = None,
                       max_value: float = None) -> Tuple[bool, float, Optional[str]]:
        """Validate float input"""
        try:
            float_value = float(value)
            
            if min_value is not None and float_value < min_value:
                return False, value, f"Value too small (min: {min_value})"
            if max_value is not None and float_value > max_value:
                return False, value, f"Value too large (max: {max_value})"
            
            self.validation_stats['passed'] += 1
            return True, float_value, None
            
        except (ValueError, TypeError):
            return False, value, "Invalid float value"
    
    def _validate_boolean(self, value: Any) -> Tuple[bool, bool, Optional[str]]:
        """Validate boolean input"""
        if isinstance(value, bool):
            self.validation_stats['passed'] += 1
            return True, value, None
        
        if isinstance(value, str):
            if value.lower() in ['true', '1', 'yes', 'on']:
                self.validation_stats['passed'] += 1
                return True, True, None
            elif value.lower() in ['false', '0', 'no', 'off']:
                self.validation_stats['passed'] += 1
                return True, False, None
        
        return False, value, "Invalid boolean value"
    
    def _validate_email(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate email address"""
        if not isinstance(value, str):
            return False, value, "Email must be a string"
        
        # Normalize email
        value = value.strip().lower()
        
        if not self.PATTERNS['email'].match(value):
            return False, value, "Invalid email format"
        
        # Additional validation using validators library
        if not validators.email(value):
            return False, value, "Invalid email address"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_url(self, value: Any, allowed_schemes: List[str] = None) -> Tuple[bool, str, Optional[str]]:
        """Validate URL"""
        if not isinstance(value, str):
            return False, value, "URL must be a string"
        
        # Check URL validity
        if not validators.url(value):
            return False, value, "Invalid URL format"
        
        # Parse URL
        parsed = urllib.parse.urlparse(value)
        
        # Check allowed schemes
        if allowed_schemes:
            if parsed.scheme not in allowed_schemes:
                return False, value, f"URL scheme must be one of: {allowed_schemes}"
        
        # Check for suspicious patterns
        if self.strict_mode:
            if 'javascript:' in value.lower() or 'data:' in value.lower():
                return False, value, "Potentially malicious URL"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_ip(self, value: Any, version: int = None) -> Tuple[bool, str, Optional[str]]:
        """Validate IP address"""
        if not isinstance(value, str):
            return False, value, "IP address must be a string"
        
        try:
            ip = ipaddress.ip_address(value)
            
            if version:
                if version == 4 and not isinstance(ip, ipaddress.IPv4Address):
                    return False, value, "Invalid IPv4 address"
                elif version == 6 and not isinstance(ip, ipaddress.IPv6Address):
                    return False, value, "Invalid IPv6 address"
            
            self.validation_stats['passed'] += 1
            return True, str(ip), None
            
        except ValueError:
            return False, value, "Invalid IP address"
    
    def _validate_json(self, value: Any) -> Tuple[bool, Any, Optional[str]]:
        """Validate JSON input"""
        if isinstance(value, (dict, list)):
            self.validation_stats['passed'] += 1
            return True, value, None
        
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                self.validation_stats['passed'] += 1
                return True, parsed, None
            except json.JSONDecodeError as e:
                return False, value, f"Invalid JSON: {str(e)}"
        
        return False, value, "Value must be JSON string or object"
    
    def _validate_sql(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate SQL query (detect injection attempts)"""
        if not isinstance(value, str):
            return False, value, "SQL must be a string"
        
        # Check for SQL injection patterns
        for pattern in self.SQL_INJECTION_PATTERNS:
            if pattern.search(value):
                return False, value, "Potential SQL injection detected"
        
        # Check for multiple statements
        if ';' in value and value.count(';') > 1:
            return False, value, "Multiple SQL statements not allowed"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_html(self, value: Any, allowed_tags: List[str] = None) -> Tuple[bool, str, Optional[str]]:
        """Validate and sanitize HTML"""
        if not isinstance(value, str):
            return False, value, "HTML must be a string"
        
        # Default allowed tags
        if allowed_tags is None:
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
        
        # Sanitize HTML
        cleaned = bleach.clean(
            value,
            tags=allowed_tags,
            attributes={'a': ['href', 'title']},
            strip=True
        )
        
        self.validation_stats['sanitized'] += 1
        self.validation_stats['passed'] += 1
        
        return True, cleaned, None
    
    def _validate_javascript(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate JavaScript code"""
        if not isinstance(value, str):
            return False, value, "JavaScript must be a string"
        
        # Check for dangerous patterns
        dangerous_patterns = [
            'eval(',
            'Function(',
            'setTimeout(',
            'setInterval(',
            'document.write(',
            'innerHTML',
            'outerHTML'
        ]
        
        for pattern in dangerous_patterns:
            if pattern in value:
                return False, value, f"Dangerous JavaScript pattern detected: {pattern}"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_path(self, value: Any, base_path: str = None) -> Tuple[bool, str, Optional[str]]:
        """Validate file path (prevent path traversal)"""
        if not isinstance(value, str):
            return False, value, "Path must be a string"
        
        # Check for path traversal patterns
        for pattern in self.PATH_TRAVERSAL_PATTERNS:
            if pattern.search(value):
                return False, value, "Path traversal attempt detected"
        
        # Normalize path
        import os
        normalized = os.path.normpath(value)
        
        # Check if path is within base path
        if base_path:
            base = os.path.abspath(base_path)
            full_path = os.path.abspath(os.path.join(base, normalized))
            if not full_path.startswith(base):
                return False, value, "Path outside allowed directory"
        
        self.validation_stats['passed'] += 1
        return True, normalized, None
    
    def _validate_command(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate shell command (prevent command injection)"""
        if not isinstance(value, str):
            return False, value, "Command must be a string"
        
        # Check for command injection patterns
        for pattern in self.COMMAND_INJECTION_PATTERNS:
            if pattern.search(value):
                return False, value, "Command injection attempt detected"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_date(self, value: Any, format: str = '%Y-%m-%d') -> Tuple[bool, datetime, Optional[str]]:
        """Validate date string"""
        if isinstance(value, datetime):
            self.validation_stats['passed'] += 1
            return True, value, None
        
        if not isinstance(value, str):
            return False, value, "Date must be a string or datetime"
        
        try:
            parsed = datetime.strptime(value, format)
            self.validation_stats['passed'] += 1
            return True, parsed, None
        except ValueError:
            return False, value, f"Invalid date format (expected: {format})"
    
    def _validate_uuid(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate UUID"""
        if not isinstance(value, str):
            return False, value, "UUID must be a string"
        
        if not self.PATTERNS['uuid'].match(value):
            return False, value, "Invalid UUID format"
        
        self.validation_stats['passed'] += 1
        return True, value.lower(), None
    
    def _validate_jwt(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate JWT token format"""
        if not isinstance(value, str):
            return False, value, "JWT must be a string"
        
        if not self.PATTERNS['jwt'].match(value):
            return False, value, "Invalid JWT format"
        
        # Check parts
        parts = value.split('.')
        if len(parts) != 3:
            return False, value, "JWT must have 3 parts"
        
        self.validation_stats['passed'] += 1
        return True, value, None
    
    def _validate_base64(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate base64 string"""
        if not isinstance(value, str):
            return False, value, "Base64 must be a string"
        
        # Add padding if needed
        padding = 4 - len(value) % 4
        if padding != 4:
            value += '=' * padding
        
        if not self.PATTERNS['base64'].match(value):
            return False, value, "Invalid base64 format"
        
        # Try to decode
        try:
            import base64
            base64.b64decode(value)
            self.validation_stats['passed'] += 1
            return True, value, None
        except Exception:
            return False, value, "Invalid base64 encoding"
    
    def _validate_phone(self, value: Any) -> Tuple[bool, str, Optional[str]]:
        """Validate phone number"""
        if not isinstance(value, str):
            return False, value, "Phone number must be a string"
        
        # Remove common separators
        cleaned = re.sub(r'[\s\-\(\)]+', '', value)
        
        if not self.PATTERNS['phone'].match(cleaned):
            return False, value, "Invalid phone number format"
        
        self.validation_stats['passed'] += 1
        return True, cleaned, None
    
    def sanitize_html(self, html: str) -> str:
        """Sanitize HTML to prevent XSS"""
        return bleach.clean(html, tags=[], strip=True)
    
    def sanitize_sql(self, sql: str) -> str:
        """Sanitize SQL string"""
        # Replace single quotes
        sql = sql.replace("'", "''")
        # Remove comments
        sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
        return sql
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename"""
        # Remove path components
        filename = os.path.basename(filename)
        # Remove special characters
        filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:250] + ext
        return filename
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get validation statistics"""
        return self.validation_stats.copy()


class ConfigValidator:
    """Validator for configuration data"""
    
    def __init__(self):
        self.validator = InputValidator()
        self.schemas: Dict[str, ValidationSchema] = {}
        
        # Define default schemas
        self._define_default_schemas()
    
    def _define_default_schemas(self):
        """Define default validation schemas"""
        # Database configuration schema
        self.schemas['database'] = ValidationSchema(
            fields={
                'host': [
                    ValidationRule(
                        name='host_format',
                        validator=lambda v: validators.domain(v) or validators.ipv4(v),
                        error_message='Invalid host format'
                    )
                ],
                'port': [
                    ValidationRule(
                        name='port_range',
                        validator=lambda v: 1 <= int(v) <= 65535,
                        error_message='Port must be between 1 and 65535'
                    )
                ],
                'username': [
                    ValidationRule(
                        name='username_format',
                        validator=lambda v: re.match(r'^[a-zA-Z0-9_]+$', v) is not None,
                        error_message='Username must be alphanumeric'
                    )
                ],
                'password': [
                    ValidationRule(
                        name='password_strength',
                        validator=lambda v: len(v) >= 8,
                        error_message='Password must be at least 8 characters'
                    )
                ]
            },
            required_fields=['host', 'port', 'username', 'password']
        )
        
        # API configuration schema
        self.schemas['api'] = ValidationSchema(
            fields={
                'endpoint': [
                    ValidationRule(
                        name='url_format',
                        validator=lambda v: validators.url(v),
                        error_message='Invalid URL format'
                    )
                ],
                'api_key': [
                    ValidationRule(
                        name='api_key_format',
                        validator=lambda v: re.match(r'^[A-Za-z0-9_-]+$', v) is not None,
                        error_message='Invalid API key format'
                    )
                ],
                'timeout': [
                    ValidationRule(
                        name='timeout_range',
                        validator=lambda v: 0 < float(v) <= 300,
                        error_message='Timeout must be between 0 and 300 seconds'
                    )
                ]
            },
            required_fields=['endpoint', 'api_key']
        )
    
    def validate_config(self, config: Dict[str, Any], schema_name: str) -> Tuple[bool, Dict[str, Any], List[str]]:
        """
        Validate configuration against schema
        
        Args:
            config: Configuration dictionary
            schema_name: Name of schema to use
        
        Returns:
            Tuple of (is_valid, sanitized_config, errors)
        """
        if schema_name not in self.schemas:
            return False, config, [f"Unknown schema: {schema_name}"]
        
        schema = self.schemas[schema_name]
        errors = []
        sanitized = {}
        
        # Check required fields
        for field in schema.required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        # Validate fields
        for field, value in config.items():
            if field in schema.fields:
                rules = schema.fields[field]
                field_valid = True
                
                for rule in rules:
                    try:
                        if not rule.validator(value):
                            errors.append(f"{field}: {rule.error_message}")
                            field_valid = False
                            break
                    except Exception as e:
                        errors.append(f"{field}: Validation error - {str(e)}")
                        field_valid = False
                        break
                
                if field_valid:
                    # Apply sanitizer if available
                    if rules and rules[0].sanitizer:
                        sanitized[field] = rules[0].sanitizer(value)
                    else:
                        sanitized[field] = value
            elif not schema.allow_unknown:
                errors.append(f"Unknown field: {field}")
            else:
                sanitized[field] = value
        
        return len(errors) == 0, sanitized, errors