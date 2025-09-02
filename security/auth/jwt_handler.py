"""
JWT Authentication Handler
Implements secure JWT-based authentication with refresh tokens
"""

import os
import jwt
import json
import uuid
import hashlib
import secrets
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timedelta, timezone
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import redis
import logging

logger = logging.getLogger(__name__)


class JWTHandler:
    """
    Secure JWT handler with RS256 signing and refresh token support
    Implements OWASP JWT best practices
    """
    
    ALGORITHM = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 7
    MAX_REFRESH_COUNT = 5
    
    def __init__(self, 
                 private_key: Optional[str] = None,
                 public_key: Optional[str] = None,
                 redis_client: Optional[redis.Redis] = None):
        """
        Initialize JWT handler
        
        Args:
            private_key: RSA private key for signing
            public_key: RSA public key for verification
            redis_client: Redis client for token blacklisting
        """
        self.private_key = private_key or self._load_or_generate_private_key()
        self.public_key = public_key or self._derive_public_key()
        self.redis_client = redis_client or self._init_redis()
        
        # Token configuration
        self.issuer = os.getenv('JWT_ISSUER', 'claude-config-system')
        self.audience = os.getenv('JWT_AUDIENCE', 'claude-api')
        
        logger.info("JWT Handler initialized with algorithm: %s", self.ALGORITHM)
    
    def _load_or_generate_private_key(self) -> str:
        """Load or generate RSA private key"""
        # Try to load from environment or file
        key_path = os.getenv('JWT_PRIVATE_KEY_PATH', '/secrets/jwt/private.pem')
        
        if os.path.exists(key_path):
            with open(key_path, 'rb') as f:
                return f.read().decode()
        
        # Generate new key pair (development only)
        logger.warning("Generating new RSA key pair - not for production use")
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=default_backend()
        )
        
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        return pem.decode()
    
    def _derive_public_key(self) -> str:
        """Derive public key from private key"""
        from cryptography.hazmat.primitives.serialization import load_pem_private_key
        
        private_key = load_pem_private_key(
            self.private_key.encode(),
            password=None,
            backend=default_backend()
        )
        
        public_key = private_key.public_key()
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        return pem.decode()
    
    def _init_redis(self) -> redis.Redis:
        """Initialize Redis client for token blacklisting"""
        try:
            client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                password=os.getenv('REDIS_PASSWORD'),
                db=int(os.getenv('REDIS_DB', 0)),
                decode_responses=True
            )
            client.ping()
            logger.info("Redis connected for token blacklisting")
            return client
        except Exception as e:
            logger.warning("Redis not available, using in-memory blacklist: %s", str(e))
            return InMemoryBlacklist()
    
    def generate_tokens(self, user_id: str, claims: Dict[str, Any] = None) -> Dict[str, str]:
        """
        Generate access and refresh tokens
        
        Args:
            user_id: User identifier
            claims: Additional claims to include
        
        Returns:
            Dictionary with access_token, refresh_token, and metadata
        """
        # Generate unique JTI (JWT ID) for tracking
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())
        
        # Current time
        now = datetime.now(timezone.utc)
        
        # Access token payload
        access_payload = {
            'sub': user_id,
            'iat': now,
            'exp': now + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES),
            'nbf': now,
            'iss': self.issuer,
            'aud': self.audience,
            'jti': access_jti,
            'type': 'access',
            'refresh_count': 0
        }
        
        # Add custom claims
        if claims:
            # Validate claims don't override standard claims
            protected_claims = {'sub', 'iat', 'exp', 'nbf', 'iss', 'aud', 'jti', 'type'}
            custom_claims = {k: v for k, v in claims.items() if k not in protected_claims}
            access_payload.update(custom_claims)
        
        # Refresh token payload
        refresh_payload = {
            'sub': user_id,
            'iat': now,
            'exp': now + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS),
            'nbf': now,
            'iss': self.issuer,
            'aud': self.audience,
            'jti': refresh_jti,
            'type': 'refresh',
            'access_jti': access_jti,
            'refresh_count': 0
        }
        
        # Generate tokens
        access_token = jwt.encode(
            access_payload,
            self.private_key,
            algorithm=self.ALGORITHM
        )
        
        refresh_token = jwt.encode(
            refresh_payload,
            self.private_key,
            algorithm=self.ALGORITHM
        )
        
        # Store refresh token in Redis
        self._store_refresh_token(refresh_jti, user_id, refresh_payload)
        
        # Generate fingerprint for token binding
        fingerprint = self._generate_fingerprint()
        
        logger.info("Generated tokens for user: %s", user_id)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': self.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            'fingerprint': fingerprint,
            'issued_at': now.isoformat()
        }
    
    def verify_token(self, token: str, token_type: str = 'access') -> Dict[str, Any]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token string
            token_type: Expected token type ('access' or 'refresh')
        
        Returns:
            Decoded token payload
        
        Raises:
            jwt.InvalidTokenError: If token is invalid
        """
        try:
            # Decode token
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=[self.ALGORITHM],
                audience=self.audience,
                issuer=self.issuer
            )
            
            # Verify token type
            if payload.get('type') != token_type:
                raise jwt.InvalidTokenError(f"Invalid token type. Expected {token_type}")
            
            # Check if token is blacklisted
            if self._is_blacklisted(payload['jti']):
                raise jwt.InvalidTokenError("Token has been revoked")
            
            # Additional validation for refresh tokens
            if token_type == 'refresh':
                if not self._validate_refresh_token(payload['jti']):
                    raise jwt.InvalidTokenError("Invalid refresh token")
            
            logger.debug("Token verified for user: %s", payload.get('sub'))
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            raise jwt.InvalidTokenError("Token has expired")
        except jwt.InvalidAudienceError:
            logger.warning("Invalid token audience")
            raise jwt.InvalidTokenError("Invalid token audience")
        except jwt.InvalidIssuerError:
            logger.warning("Invalid token issuer")
            raise jwt.InvalidTokenError("Invalid token issuer")
        except Exception as e:
            logger.error("Token verification failed: %s", str(e))
            raise jwt.InvalidTokenError(f"Token verification failed: {str(e)}")
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Generate new access token using refresh token
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            New token set
        """
        # Verify refresh token
        payload = self.verify_token(refresh_token, token_type='refresh')
        
        # Check refresh count
        refresh_count = payload.get('refresh_count', 0)
        if refresh_count >= self.MAX_REFRESH_COUNT:
            # Revoke refresh token
            self.revoke_token(refresh_token)
            raise ValueError("Refresh token has exceeded maximum refresh count")
        
        # Generate new access token
        user_id = payload['sub']
        
        # Extract custom claims from original token
        claims = {k: v for k, v in payload.items() 
                 if k not in {'sub', 'iat', 'exp', 'nbf', 'iss', 'aud', 'jti', 'type', 'refresh_count'}}
        
        # Generate new tokens
        new_tokens = self.generate_tokens(user_id, claims)
        
        # Update refresh count
        self._update_refresh_count(payload['jti'], refresh_count + 1)
        
        logger.info("Refreshed access token for user: %s", user_id)
        
        return new_tokens
    
    def revoke_token(self, token: str) -> bool:
        """
        Revoke a token (add to blacklist)
        
        Args:
            token: Token to revoke
        
        Returns:
            True if successful
        """
        try:
            # Decode token to get JTI
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=[self.ALGORITHM],
                options={"verify_exp": False}
            )
            
            jti = payload['jti']
            exp = payload['exp']
            
            # Calculate TTL for blacklist entry
            ttl = exp - datetime.now(timezone.utc).timestamp()
            
            if ttl > 0:
                # Add to blacklist
                self._blacklist_token(jti, int(ttl))
                
                # If it's a refresh token, also remove from storage
                if payload.get('type') == 'refresh':
                    self._remove_refresh_token(jti)
                
                logger.info("Revoked token with JTI: %s", jti)
                return True
            
            return False
            
        except Exception as e:
            logger.error("Failed to revoke token: %s", str(e))
            return False
    
    def revoke_all_user_tokens(self, user_id: str) -> int:
        """
        Revoke all tokens for a user
        
        Args:
            user_id: User identifier
        
        Returns:
            Number of tokens revoked
        """
        count = 0
        
        # Find all refresh tokens for user
        pattern = f"refresh_token:{user_id}:*"
        
        if isinstance(self.redis_client, redis.Redis):
            for key in self.redis_client.scan_iter(match=pattern):
                token_data = self.redis_client.get(key)
                if token_data:
                    data = json.loads(token_data)
                    self._blacklist_token(data['jti'], 86400 * 30)  # 30 days
                    self.redis_client.delete(key)
                    count += 1
        
        logger.info("Revoked %d tokens for user: %s", count, user_id)
        return count
    
    def _store_refresh_token(self, jti: str, user_id: str, payload: Dict[str, Any]) -> None:
        """Store refresh token in Redis"""
        key = f"refresh_token:{user_id}:{jti}"
        value = json.dumps(payload)
        
        # Calculate TTL
        exp = payload['exp']
        ttl = int(exp - datetime.now(timezone.utc).timestamp())
        
        if isinstance(self.redis_client, redis.Redis):
            self.redis_client.setex(key, ttl, value)
    
    def _validate_refresh_token(self, jti: str) -> bool:
        """Validate refresh token exists in storage"""
        pattern = f"refresh_token:*:{jti}"
        
        if isinstance(self.redis_client, redis.Redis):
            for key in self.redis_client.scan_iter(match=pattern):
                return True
        
        return False
    
    def _update_refresh_count(self, jti: str, count: int) -> None:
        """Update refresh count for token"""
        pattern = f"refresh_token:*:{jti}"
        
        if isinstance(self.redis_client, redis.Redis):
            for key in self.redis_client.scan_iter(match=pattern):
                data = self.redis_client.get(key)
                if data:
                    payload = json.loads(data)
                    payload['refresh_count'] = count
                    ttl = self.redis_client.ttl(key)
                    self.redis_client.setex(key, ttl, json.dumps(payload))
    
    def _remove_refresh_token(self, jti: str) -> None:
        """Remove refresh token from storage"""
        pattern = f"refresh_token:*:{jti}"
        
        if isinstance(self.redis_client, redis.Redis):
            for key in self.redis_client.scan_iter(match=pattern):
                self.redis_client.delete(key)
    
    def _blacklist_token(self, jti: str, ttl: int) -> None:
        """Add token to blacklist"""
        key = f"blacklist:{jti}"
        
        if isinstance(self.redis_client, redis.Redis):
            self.redis_client.setex(key, ttl, "1")
    
    def _is_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        key = f"blacklist:{jti}"
        
        if isinstance(self.redis_client, redis.Redis):
            return self.redis_client.exists(key) > 0
        
        return False
    
    def _generate_fingerprint(self) -> str:
        """Generate token fingerprint for binding"""
        random_bytes = secrets.token_bytes(32)
        return hashlib.sha256(random_bytes).hexdigest()
    
    def get_jwks(self) -> Dict[str, Any]:
        """
        Get JSON Web Key Set (JWKS) for public key distribution
        
        Returns:
            JWKS dictionary
        """
        from cryptography.hazmat.primitives.serialization import load_pem_public_key
        from cryptography.hazmat.primitives.asymmetric import rsa
        import base64
        
        # Load public key
        public_key = load_pem_public_key(
            self.public_key.encode(),
            backend=default_backend()
        )
        
        # Extract key parameters
        if isinstance(public_key, rsa.RSAPublicKey):
            numbers = public_key.public_numbers()
            
            # Convert to base64url encoding
            def int_to_base64url(n):
                b = n.to_bytes((n.bit_length() + 7) // 8, 'big')
                return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
            
            jwk = {
                'kty': 'RSA',
                'use': 'sig',
                'alg': self.ALGORITHM,
                'kid': hashlib.sha256(self.public_key.encode()).hexdigest()[:8],
                'n': int_to_base64url(numbers.n),
                'e': int_to_base64url(numbers.e)
            }
            
            return {
                'keys': [jwk]
            }
        
        raise ValueError("Invalid public key type")


class InMemoryBlacklist:
    """In-memory token blacklist for development/testing"""
    
    def __init__(self):
        self.blacklist = {}
        self.storage = {}
    
    def setex(self, key: str, ttl: int, value: str) -> None:
        """Set key with expiration"""
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.storage[key] = (value, expiry)
    
    def get(self, key: str) -> Optional[str]:
        """Get value if not expired"""
        if key in self.storage:
            value, expiry = self.storage[key]
            if datetime.now() < expiry:
                return value
            else:
                del self.storage[key]
        return None
    
    def exists(self, key: str) -> int:
        """Check if key exists"""
        return 1 if self.get(key) is not None else 0
    
    def delete(self, key: str) -> None:
        """Delete key"""
        if key in self.storage:
            del self.storage[key]
    
    def scan_iter(self, match: str = "*") -> List[str]:
        """Scan keys by pattern"""
        import fnmatch
        return [k for k in self.storage.keys() if fnmatch.fnmatch(k, match)]
    
    def ttl(self, key: str) -> int:
        """Get TTL for key"""
        if key in self.storage:
            _, expiry = self.storage[key]
            ttl = (expiry - datetime.now()).total_seconds()
            return int(ttl) if ttl > 0 else -1
        return -1
    
    def ping(self) -> bool:
        """Check connection"""
        return True