"""
Role-Based Access Control (RBAC) System
Implements fine-grained permissions and authorization
"""

import json
import logging
from typing import Dict, List, Set, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import hashlib
import redis
from functools import wraps, lru_cache

logger = logging.getLogger(__name__)


class Permission(Enum):
    """System permissions"""
    # Configuration permissions
    CONFIG_READ = "config:read"
    CONFIG_WRITE = "config:write"
    CONFIG_DELETE = "config:delete"
    CONFIG_ADMIN = "config:admin"
    
    # Secret permissions
    SECRET_READ = "secret:read"
    SECRET_WRITE = "secret:write"
    SECRET_DELETE = "secret:delete"
    SECRET_ROTATE = "secret:rotate"
    
    # User permissions
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    USER_ADMIN = "user:admin"
    
    # System permissions
    SYSTEM_ADMIN = "system:admin"
    SYSTEM_AUDIT = "system:audit"
    SYSTEM_MONITOR = "system:monitor"
    SYSTEM_DEPLOY = "system:deploy"
    
    # API permissions
    API_READ = "api:read"
    API_WRITE = "api:write"
    API_ADMIN = "api:admin"
    
    # Dashboard permissions
    DASHBOARD_VIEW = "dashboard:view"
    DASHBOARD_EDIT = "dashboard:edit"
    DASHBOARD_ADMIN = "dashboard:admin"


@dataclass
class Role:
    """Role definition"""
    name: str
    description: str
    permissions: Set[Permission] = field(default_factory=set)
    parent_roles: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if role has specific permission"""
        return permission in self.permissions
    
    def add_permission(self, permission: Permission) -> None:
        """Add permission to role"""
        self.permissions.add(permission)
        self.updated_at = datetime.utcnow()
    
    def remove_permission(self, permission: Permission) -> None:
        """Remove permission from role"""
        self.permissions.discard(permission)
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert role to dictionary"""
        return {
            'name': self.name,
            'description': self.description,
            'permissions': [p.value for p in self.permissions],
            'parent_roles': list(self.parent_roles),
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Role':
        """Create role from dictionary"""
        return cls(
            name=data['name'],
            description=data['description'],
            permissions={Permission(p) for p in data.get('permissions', [])},
            parent_roles=set(data.get('parent_roles', [])),
            metadata=data.get('metadata', {}),
            created_at=datetime.fromisoformat(data.get('created_at', datetime.utcnow().isoformat())),
            updated_at=datetime.fromisoformat(data.get('updated_at', datetime.utcnow().isoformat()))
        )


@dataclass
class User:
    """User with roles and permissions"""
    id: str
    username: str
    email: str
    roles: Set[str] = field(default_factory=set)
    direct_permissions: Set[Permission] = field(default_factory=set)
    attributes: Dict[str, Any] = field(default_factory=dict)
    active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'roles': list(self.roles),
            'direct_permissions': [p.value for p in self.direct_permissions],
            'attributes': self.attributes,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class RBACManager:
    """
    Role-Based Access Control Manager
    Manages roles, permissions, and authorization
    """
    
    # Default roles
    DEFAULT_ROLES = {
        'super_admin': Role(
            name='super_admin',
            description='Super Administrator with full access',
            permissions={p for p in Permission}
        ),
        'admin': Role(
            name='admin',
            description='Administrator',
            permissions={
                Permission.CONFIG_READ, Permission.CONFIG_WRITE,
                Permission.SECRET_READ, Permission.SECRET_WRITE,
                Permission.USER_READ, Permission.USER_WRITE,
                Permission.API_READ, Permission.API_WRITE,
                Permission.DASHBOARD_VIEW, Permission.DASHBOARD_EDIT,
                Permission.SYSTEM_MONITOR
            }
        ),
        'developer': Role(
            name='developer',
            description='Developer with read/write access',
            permissions={
                Permission.CONFIG_READ, Permission.CONFIG_WRITE,
                Permission.SECRET_READ,
                Permission.API_READ, Permission.API_WRITE,
                Permission.DASHBOARD_VIEW,
                Permission.SYSTEM_MONITOR
            }
        ),
        'operator': Role(
            name='operator',
            description='Operator with deployment access',
            permissions={
                Permission.CONFIG_READ,
                Permission.SECRET_READ,
                Permission.SYSTEM_DEPLOY,
                Permission.SYSTEM_MONITOR,
                Permission.DASHBOARD_VIEW
            }
        ),
        'auditor': Role(
            name='auditor',
            description='Auditor with read-only access',
            permissions={
                Permission.CONFIG_READ,
                Permission.SECRET_READ,
                Permission.USER_READ,
                Permission.SYSTEM_AUDIT,
                Permission.SYSTEM_MONITOR,
                Permission.DASHBOARD_VIEW
            }
        ),
        'viewer': Role(
            name='viewer',
            description='Viewer with minimal read access',
            permissions={
                Permission.CONFIG_READ,
                Permission.API_READ,
                Permission.DASHBOARD_VIEW
            }
        )
    }
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """
        Initialize RBAC Manager
        
        Args:
            redis_client: Redis client for caching
        """
        self.redis_client = redis_client or self._init_redis()
        self.roles: Dict[str, Role] = {}
        self.users: Dict[str, User] = {}
        self.resource_policies: Dict[str, Dict[str, Any]] = {}
        
        # Initialize default roles
        self._initialize_default_roles()
        
        logger.info("RBAC Manager initialized with %d default roles", len(self.DEFAULT_ROLES))
    
    def _init_redis(self) -> Optional[redis.Redis]:
        """Initialize Redis client"""
        try:
            client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                password=os.getenv('REDIS_PASSWORD'),
                db=int(os.getenv('REDIS_DB', 1)),
                decode_responses=True
            )
            client.ping()
            return client
        except Exception as e:
            logger.warning("Redis not available for RBAC caching: %s", str(e))
            return None
    
    def _initialize_default_roles(self) -> None:
        """Initialize default roles"""
        for role_name, role in self.DEFAULT_ROLES.items():
            self.roles[role_name] = role
            self._cache_role(role)
    
    def create_role(self, name: str, description: str, 
                   permissions: Set[Permission] = None,
                   parent_roles: Set[str] = None) -> Role:
        """
        Create a new role
        
        Args:
            name: Role name
            description: Role description
            permissions: Set of permissions
            parent_roles: Parent roles to inherit from
        
        Returns:
            Created role
        """
        if name in self.roles:
            raise ValueError(f"Role '{name}' already exists")
        
        role = Role(
            name=name,
            description=description,
            permissions=permissions or set(),
            parent_roles=parent_roles or set()
        )
        
        # Inherit permissions from parent roles
        for parent_name in parent_roles or []:
            if parent_name in self.roles:
                parent = self.roles[parent_name]
                role.permissions.update(parent.permissions)
        
        self.roles[name] = role
        self._cache_role(role)
        
        logger.info("Created role: %s with %d permissions", name, len(role.permissions))
        
        return role
    
    def update_role(self, name: str, **kwargs) -> Role:
        """
        Update an existing role
        
        Args:
            name: Role name
            **kwargs: Fields to update
        
        Returns:
            Updated role
        """
        if name not in self.roles:
            raise ValueError(f"Role '{name}' not found")
        
        role = self.roles[name]
        
        for key, value in kwargs.items():
            if hasattr(role, key):
                setattr(role, key, value)
        
        role.updated_at = datetime.utcnow()
        self._cache_role(role)
        
        logger.info("Updated role: %s", name)
        
        return role
    
    def delete_role(self, name: str) -> bool:
        """
        Delete a role
        
        Args:
            name: Role name
        
        Returns:
            True if successful
        """
        if name in self.DEFAULT_ROLES:
            raise ValueError(f"Cannot delete default role '{name}'")
        
        if name not in self.roles:
            return False
        
        del self.roles[name]
        self._remove_role_cache(name)
        
        # Remove role from all users
        for user in self.users.values():
            user.roles.discard(name)
        
        logger.info("Deleted role: %s", name)
        
        return True
    
    def assign_role(self, user_id: str, role_name: str) -> bool:
        """
        Assign role to user
        
        Args:
            user_id: User identifier
            role_name: Role name
        
        Returns:
            True if successful
        """
        if role_name not in self.roles:
            raise ValueError(f"Role '{role_name}' not found")
        
        user = self.get_user(user_id)
        if not user:
            raise ValueError(f"User '{user_id}' not found")
        
        user.roles.add(role_name)
        self._cache_user(user)
        
        logger.info("Assigned role %s to user %s", role_name, user_id)
        
        return True
    
    def revoke_role(self, user_id: str, role_name: str) -> bool:
        """
        Revoke role from user
        
        Args:
            user_id: User identifier
            role_name: Role name
        
        Returns:
            True if successful
        """
        user = self.get_user(user_id)
        if not user:
            return False
        
        user.roles.discard(role_name)
        self._cache_user(user)
        
        logger.info("Revoked role %s from user %s", role_name, user_id)
        
        return True
    
    def check_permission(self, user_id: str, permission: Permission,
                        resource: str = None, context: Dict[str, Any] = None) -> bool:
        """
        Check if user has permission
        
        Args:
            user_id: User identifier
            permission: Permission to check
            resource: Resource identifier (optional)
            context: Additional context for evaluation
        
        Returns:
            True if user has permission
        """
        user = self.get_user(user_id)
        if not user or not user.active:
            return False
        
        # Check direct permissions
        if permission in user.direct_permissions:
            return True
        
        # Check role permissions
        for role_name in user.roles:
            role = self.roles.get(role_name)
            if role and role.has_permission(permission):
                # Check resource-specific policies if provided
                if resource and not self._check_resource_policy(user, permission, resource, context):
                    continue
                return True
        
        return False
    
    def get_user_permissions(self, user_id: str) -> Set[Permission]:
        """
        Get all permissions for a user
        
        Args:
            user_id: User identifier
        
        Returns:
            Set of permissions
        """
        user = self.get_user(user_id)
        if not user:
            return set()
        
        permissions = user.direct_permissions.copy()
        
        # Add permissions from roles
        for role_name in user.roles:
            role = self.roles.get(role_name)
            if role:
                permissions.update(role.permissions)
        
        return permissions
    
    def create_user(self, user_id: str, username: str, email: str,
                   roles: Set[str] = None, attributes: Dict[str, Any] = None) -> User:
        """
        Create a new user
        
        Args:
            user_id: User identifier
            username: Username
            email: Email address
            roles: Initial roles
            attributes: User attributes
        
        Returns:
            Created user
        """
        if user_id in self.users:
            raise ValueError(f"User '{user_id}' already exists")
        
        # Validate roles exist
        for role_name in roles or []:
            if role_name not in self.roles:
                raise ValueError(f"Role '{role_name}' not found")
        
        user = User(
            id=user_id,
            username=username,
            email=email,
            roles=roles or set(),
            attributes=attributes or {}
        )
        
        self.users[user_id] = user
        self._cache_user(user)
        
        logger.info("Created user: %s", user_id)
        
        return user
    
    def get_user(self, user_id: str) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            user_id: User identifier
        
        Returns:
            User object or None
        """
        # Check cache first
        cached = self._get_cached_user(user_id)
        if cached:
            return cached
        
        return self.users.get(user_id)
    
    def update_user(self, user_id: str, **kwargs) -> User:
        """
        Update user attributes
        
        Args:
            user_id: User identifier
            **kwargs: Fields to update
        
        Returns:
            Updated user
        """
        user = self.get_user(user_id)
        if not user:
            raise ValueError(f"User '{user_id}' not found")
        
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        self._cache_user(user)
        
        logger.info("Updated user: %s", user_id)
        
        return user
    
    def deactivate_user(self, user_id: str) -> bool:
        """
        Deactivate a user
        
        Args:
            user_id: User identifier
        
        Returns:
            True if successful
        """
        user = self.get_user(user_id)
        if not user:
            return False
        
        user.active = False
        self._cache_user(user)
        
        logger.info("Deactivated user: %s", user_id)
        
        return True
    
    def add_resource_policy(self, resource: str, policy: Dict[str, Any]) -> None:
        """
        Add resource-specific access policy
        
        Args:
            resource: Resource identifier
            policy: Policy definition
        """
        self.resource_policies[resource] = policy
        logger.info("Added resource policy for: %s", resource)
    
    def _check_resource_policy(self, user: User, permission: Permission,
                               resource: str, context: Dict[str, Any] = None) -> bool:
        """
        Check resource-specific policy
        
        Args:
            user: User object
            permission: Permission to check
            resource: Resource identifier
            context: Evaluation context
        
        Returns:
            True if allowed by policy
        """
        policy = self.resource_policies.get(resource)
        if not policy:
            return True  # No policy means allow
        
        # Evaluate conditions
        conditions = policy.get('conditions', {})
        
        for condition_type, condition_value in conditions.items():
            if condition_type == 'user_attributes':
                for attr, required_value in condition_value.items():
                    if user.attributes.get(attr) != required_value:
                        return False
            
            elif condition_type == 'time_range':
                now = datetime.utcnow()
                start = datetime.fromisoformat(condition_value.get('start'))
                end = datetime.fromisoformat(condition_value.get('end'))
                if not (start <= now <= end):
                    return False
            
            elif condition_type == 'ip_whitelist' and context:
                client_ip = context.get('client_ip')
                whitelist = condition_value
                if client_ip not in whitelist:
                    return False
        
        return True
    
    def _cache_role(self, role: Role) -> None:
        """Cache role in Redis"""
        if self.redis_client:
            key = f"rbac:role:{role.name}"
            self.redis_client.setex(
                key,
                3600,  # 1 hour TTL
                json.dumps(role.to_dict())
            )
    
    def _cache_user(self, user: User) -> None:
        """Cache user in Redis"""
        if self.redis_client:
            key = f"rbac:user:{user.id}"
            self.redis_client.setex(
                key,
                300,  # 5 minute TTL
                json.dumps(user.to_dict())
            )
    
    def _get_cached_user(self, user_id: str) -> Optional[User]:
        """Get user from cache"""
        if self.redis_client:
            key = f"rbac:user:{user_id}"
            data = self.redis_client.get(key)
            if data:
                user_dict = json.loads(data)
                return User(
                    id=user_dict['id'],
                    username=user_dict['username'],
                    email=user_dict['email'],
                    roles=set(user_dict['roles']),
                    direct_permissions={Permission(p) for p in user_dict['direct_permissions']},
                    attributes=user_dict['attributes'],
                    active=user_dict['active'],
                    created_at=datetime.fromisoformat(user_dict['created_at']),
                    last_login=datetime.fromisoformat(user_dict['last_login']) if user_dict['last_login'] else None
                )
        return None
    
    def _remove_role_cache(self, role_name: str) -> None:
        """Remove role from cache"""
        if self.redis_client:
            key = f"rbac:role:{role_name}"
            self.redis_client.delete(key)


def require_permission(permission: Permission, resource: str = None):
    """
    Decorator to require permission for function/method
    
    Args:
        permission: Required permission
        resource: Resource identifier (optional)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id from context (assumes it's in kwargs or first arg)
            user_id = kwargs.get('user_id')
            if not user_id and args:
                # Try to extract from first argument if it's a request object
                request = args[0]
                if hasattr(request, 'user_id'):
                    user_id = request.user_id
            
            if not user_id:
                raise PermissionError("User authentication required")
            
            # Get RBAC manager (assumes it's available globally or in context)
            from .middleware import get_rbac_manager
            rbac = get_rbac_manager()
            
            # Check permission
            context = kwargs.get('context', {})
            if not rbac.check_permission(user_id, permission, resource, context):
                raise PermissionError(f"Permission denied: {permission.value}")
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_any_permission(*permissions: Permission):
    """
    Decorator to require any of the specified permissions
    
    Args:
        *permissions: List of permissions (any one is sufficient)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = kwargs.get('user_id')
            if not user_id and args:
                request = args[0]
                if hasattr(request, 'user_id'):
                    user_id = request.user_id
            
            if not user_id:
                raise PermissionError("User authentication required")
            
            from .middleware import get_rbac_manager
            rbac = get_rbac_manager()
            
            context = kwargs.get('context', {})
            for permission in permissions:
                if rbac.check_permission(user_id, permission, None, context):
                    return func(*args, **kwargs)
            
            raise PermissionError(f"Permission denied: requires one of {[p.value for p in permissions]}")
        
        return wrapper
    return decorator