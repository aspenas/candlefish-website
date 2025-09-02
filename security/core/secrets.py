"""
Secrets Management Module
Integrates with AWS Secrets Manager and other secret stores
"""

import os
import json
import base64
import logging
from typing import Any, Dict, Optional, List, Union
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from cryptography.fernet import Fernet
import hvac  # HashiCorp Vault client
from functools import lru_cache
import threading

logger = logging.getLogger(__name__)


class SecretStore(ABC):
    """Abstract base class for secret stores"""
    
    @abstractmethod
    def get_secret(self, secret_id: str) -> Dict[str, Any]:
        """Retrieve a secret by ID"""
        pass
    
    @abstractmethod
    def create_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """Create a new secret"""
        pass
    
    @abstractmethod
    def update_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """Update an existing secret"""
        pass
    
    @abstractmethod
    def delete_secret(self, secret_id: str) -> bool:
        """Delete a secret"""
        pass
    
    @abstractmethod
    def list_secrets(self) -> List[str]:
        """List all available secrets"""
        pass


class AWSSecretsManager(SecretStore):
    """
    AWS Secrets Manager integration
    Provides secure storage and retrieval of secrets
    """
    
    def __init__(self, region: str = None, profile: str = None):
        """
        Initialize AWS Secrets Manager client
        
        Args:
            region: AWS region (defaults to us-east-1)
            profile: AWS profile name (optional)
        """
        self.region = region or os.getenv('AWS_REGION', 'us-east-1')
        self.profile = profile or os.getenv('AWS_PROFILE')
        
        session_kwargs = {'region_name': self.region}
        if self.profile:
            session_kwargs['profile_name'] = self.profile
        
        try:
            session = boto3.Session(**session_kwargs)
            self.client = session.client('secretsmanager')
            self._test_connection()
            logger.info("AWS Secrets Manager initialized for region: %s", self.region)
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error("Failed to initialize AWS Secrets Manager: %s", str(e))
            raise
    
    def _test_connection(self):
        """Test connection to AWS Secrets Manager"""
        try:
            self.client.list_secrets(MaxResults=1)
        except ClientError as e:
            if e.response['Error']['Code'] == 'AccessDeniedException':
                logger.warning("Limited access to AWS Secrets Manager - some operations may fail")
            else:
                raise
    
    @lru_cache(maxsize=128)
    def get_secret(self, secret_id: str, version_id: str = None) -> Dict[str, Any]:
        """
        Retrieve secret from AWS Secrets Manager
        
        Args:
            secret_id: Secret identifier
            version_id: Specific version to retrieve (optional)
        
        Returns:
            Secret data as dictionary
        """
        try:
            kwargs = {'SecretId': secret_id}
            if version_id:
                kwargs['VersionId'] = version_id
            
            response = self.client.get_secret_value(**kwargs)
            
            # Parse secret based on type
            if 'SecretString' in response:
                secret = response['SecretString']
                try:
                    return json.loads(secret)
                except json.JSONDecodeError:
                    return {'value': secret}
            else:
                # Binary secret
                decoded = base64.b64decode(response['SecretBinary'])
                return {'binary_value': decoded}
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'ResourceNotFoundException':
                logger.error("Secret not found: %s", secret_id)
                raise ValueError(f"Secret '{secret_id}' not found")
            elif error_code == 'InvalidRequestException':
                logger.error("Invalid request for secret: %s", secret_id)
                raise ValueError(f"Invalid request for secret '{secret_id}'")
            elif error_code == 'InvalidParameterException':
                logger.error("Invalid parameter for secret: %s", secret_id)
                raise ValueError(f"Invalid parameter for secret '{secret_id}'")
            elif error_code == 'AccessDeniedException':
                logger.error("Access denied to secret: %s", secret_id)
                raise PermissionError(f"Access denied to secret '{secret_id}'")
            else:
                logger.error("Error retrieving secret %s: %s", secret_id, str(e))
                raise
    
    def create_secret(self, secret_id: str, secret_data: Dict[str, Any], 
                     description: str = None, kms_key_id: str = None) -> bool:
        """
        Create a new secret in AWS Secrets Manager
        
        Args:
            secret_id: Secret identifier
            secret_data: Secret data to store
            description: Secret description
            kms_key_id: KMS key for encryption
        
        Returns:
            True if successful
        """
        try:
            kwargs = {
                'Name': secret_id,
                'SecretString': json.dumps(secret_data)
            }
            
            if description:
                kwargs['Description'] = description
            
            if kms_key_id:
                kwargs['KmsKeyId'] = kms_key_id
            
            # Add tags for tracking
            kwargs['Tags'] = [
                {'Key': 'ManagedBy', 'Value': 'ClaudeConfigSystem'},
                {'Key': 'CreatedAt', 'Value': datetime.utcnow().isoformat()},
                {'Key': 'Environment', 'Value': os.getenv('ENVIRONMENT', 'development')}
            ]
            
            self.client.create_secret(**kwargs)
            
            # Clear cache
            self.get_secret.cache_clear()
            
            logger.info("Created secret: %s", secret_id)
            return True
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceExistsException':
                logger.warning("Secret already exists: %s", secret_id)
                return False
            else:
                logger.error("Failed to create secret %s: %s", secret_id, str(e))
                raise
    
    def update_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """
        Update an existing secret
        
        Args:
            secret_id: Secret identifier
            secret_data: New secret data
        
        Returns:
            True if successful
        """
        try:
            self.client.update_secret(
                SecretId=secret_id,
                SecretString=json.dumps(secret_data)
            )
            
            # Clear cache
            self.get_secret.cache_clear()
            
            logger.info("Updated secret: %s", secret_id)
            return True
            
        except ClientError as e:
            logger.error("Failed to update secret %s: %s", secret_id, str(e))
            raise
    
    def delete_secret(self, secret_id: str, recovery_days: int = 30) -> bool:
        """
        Delete a secret (with recovery window)
        
        Args:
            secret_id: Secret identifier
            recovery_days: Recovery window in days (7-30)
        
        Returns:
            True if successful
        """
        try:
            self.client.delete_secret(
                SecretId=secret_id,
                RecoveryWindowInDays=recovery_days
            )
            
            # Clear cache
            self.get_secret.cache_clear()
            
            logger.info("Scheduled deletion of secret %s in %d days", secret_id, recovery_days)
            return True
            
        except ClientError as e:
            logger.error("Failed to delete secret %s: %s", secret_id, str(e))
            raise
    
    def list_secrets(self, prefix: str = None) -> List[str]:
        """
        List all secrets
        
        Args:
            prefix: Filter secrets by prefix
        
        Returns:
            List of secret identifiers
        """
        try:
            secrets = []
            paginator = self.client.get_paginator('list_secrets')
            
            kwargs = {}
            if prefix:
                kwargs['Filters'] = [
                    {'Key': 'name', 'Values': [prefix]}
                ]
            
            for page in paginator.paginate(**kwargs):
                for secret in page['SecretList']:
                    secrets.append(secret['Name'])
            
            return secrets
            
        except ClientError as e:
            logger.error("Failed to list secrets: %s", str(e))
            raise
    
    def rotate_secret(self, secret_id: str, rotation_lambda_arn: str) -> bool:
        """
        Enable automatic rotation for a secret
        
        Args:
            secret_id: Secret identifier
            rotation_lambda_arn: ARN of rotation Lambda function
        
        Returns:
            True if successful
        """
        try:
            self.client.rotate_secret(
                SecretId=secret_id,
                RotationLambdaARN=rotation_lambda_arn,
                RotationRules={
                    'AutomaticallyAfterDays': 30
                }
            )
            
            logger.info("Enabled rotation for secret: %s", secret_id)
            return True
            
        except ClientError as e:
            logger.error("Failed to enable rotation for %s: %s", secret_id, str(e))
            raise


class HashiCorpVault(SecretStore):
    """HashiCorp Vault integration for secret management"""
    
    def __init__(self, vault_url: str = None, vault_token: str = None):
        """
        Initialize Vault client
        
        Args:
            vault_url: Vault server URL
            vault_token: Vault authentication token
        """
        self.vault_url = vault_url or os.getenv('VAULT_URL', 'http://localhost:8200')
        self.vault_token = vault_token or os.getenv('VAULT_TOKEN')
        
        self.client = hvac.Client(
            url=self.vault_url,
            token=self.vault_token
        )
        
        if not self.client.is_authenticated():
            raise ValueError("Failed to authenticate with Vault")
        
        logger.info("HashiCorp Vault initialized at: %s", self.vault_url)
    
    def get_secret(self, secret_id: str) -> Dict[str, Any]:
        """Retrieve secret from Vault"""
        try:
            response = self.client.secrets.kv.v2.read_secret_version(
                path=secret_id
            )
            return response['data']['data']
        except hvac.exceptions.InvalidPath:
            raise ValueError(f"Secret '{secret_id}' not found")
        except Exception as e:
            logger.error("Failed to get secret %s: %s", secret_id, str(e))
            raise
    
    def create_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """Create secret in Vault"""
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=secret_id,
                secret=secret_data
            )
            logger.info("Created secret in Vault: %s", secret_id)
            return True
        except Exception as e:
            logger.error("Failed to create secret %s: %s", secret_id, str(e))
            raise
    
    def update_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """Update secret in Vault"""
        return self.create_secret(secret_id, secret_data)
    
    def delete_secret(self, secret_id: str) -> bool:
        """Delete secret from Vault"""
        try:
            self.client.secrets.kv.v2.delete_metadata_and_all_versions(
                path=secret_id
            )
            logger.info("Deleted secret from Vault: %s", secret_id)
            return True
        except Exception as e:
            logger.error("Failed to delete secret %s: %s", secret_id, str(e))
            raise
    
    def list_secrets(self) -> List[str]:
        """List all secrets in Vault"""
        try:
            response = self.client.secrets.kv.v2.list_secrets(path='')
            return response['data']['keys']
        except Exception as e:
            logger.error("Failed to list secrets: %s", str(e))
            raise


class SecretsManager:
    """
    Unified secrets management interface
    Supports multiple backend stores with fallback
    """
    
    def __init__(self, primary_store: SecretStore = None, 
                 fallback_stores: List[SecretStore] = None):
        """
        Initialize secrets manager
        
        Args:
            primary_store: Primary secret store
            fallback_stores: List of fallback stores
        """
        self.primary_store = primary_store or self._initialize_default_store()
        self.fallback_stores = fallback_stores or []
        self._cache = {}
        self._cache_ttl = timedelta(minutes=5)
        self._cache_timestamps = {}
        self._lock = threading.Lock()
        
        # Local encryption for cached secrets
        self._cache_key = Fernet.generate_key()
        self._fernet = Fernet(self._cache_key)
        
        logger.info("SecretsManager initialized with %d fallback stores", 
                   len(self.fallback_stores))
    
    def _initialize_default_store(self) -> SecretStore:
        """Initialize default secret store based on environment"""
        # Try AWS Secrets Manager first
        try:
            return AWSSecretsManager()
        except Exception as e:
            logger.warning("Failed to initialize AWS Secrets Manager: %s", str(e))
        
        # Try HashiCorp Vault
        if os.getenv('VAULT_URL'):
            try:
                return HashiCorpVault()
            except Exception as e:
                logger.warning("Failed to initialize Vault: %s", str(e))
        
        # Fall back to environment variables
        logger.warning("Using environment variables for secrets - not recommended for production")
        return EnvironmentSecretStore()
    
    def get_secret(self, secret_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get secret with caching and fallback support
        
        Args:
            secret_id: Secret identifier
            use_cache: Whether to use cache
        
        Returns:
            Secret data
        """
        # Check cache first
        if use_cache and self._is_cached(secret_id):
            return self._get_from_cache(secret_id)
        
        # Try primary store
        try:
            secret = self.primary_store.get_secret(secret_id)
            self._cache_secret(secret_id, secret)
            return secret
        except Exception as e:
            logger.warning("Primary store failed for %s: %s", secret_id, str(e))
        
        # Try fallback stores
        for store in self.fallback_stores:
            try:
                secret = store.get_secret(secret_id)
                self._cache_secret(secret_id, secret)
                return secret
            except Exception:
                continue
        
        raise ValueError(f"Secret '{secret_id}' not found in any store")
    
    def _is_cached(self, secret_id: str) -> bool:
        """Check if secret is in cache and not expired"""
        with self._lock:
            if secret_id not in self._cache:
                return False
            
            timestamp = self._cache_timestamps.get(secret_id)
            if not timestamp:
                return False
            
            return datetime.now() - timestamp < self._cache_ttl
    
    def _get_from_cache(self, secret_id: str) -> Dict[str, Any]:
        """Get secret from encrypted cache"""
        with self._lock:
            encrypted = self._cache[secret_id]
            decrypted = self._fernet.decrypt(encrypted)
            return json.loads(decrypted)
    
    def _cache_secret(self, secret_id: str, secret: Dict[str, Any]) -> None:
        """Cache secret with encryption"""
        with self._lock:
            encrypted = self._fernet.encrypt(json.dumps(secret).encode())
            self._cache[secret_id] = encrypted
            self._cache_timestamps[secret_id] = datetime.now()
    
    def clear_cache(self) -> None:
        """Clear all cached secrets"""
        with self._lock:
            self._cache.clear()
            self._cache_timestamps.clear()
        logger.info("Cleared secrets cache")
    
    def get_database_credentials(self, database: str) -> Dict[str, str]:
        """
        Get database credentials
        
        Args:
            database: Database identifier
        
        Returns:
            Dictionary with host, port, username, password, database
        """
        secret_id = f"database/{database}"
        creds = self.get_secret(secret_id)
        
        # Validate required fields
        required = ['host', 'port', 'username', 'password', 'database']
        for field in required:
            if field not in creds:
                raise ValueError(f"Missing required field '{field}' in database credentials")
        
        return creds
    
    def get_api_key(self, service: str) -> str:
        """
        Get API key for a service
        
        Args:
            service: Service identifier
        
        Returns:
            API key string
        """
        secret_id = f"api-key/{service}"
        secret = self.get_secret(secret_id)
        
        if 'api_key' in secret:
            return secret['api_key']
        elif 'key' in secret:
            return secret['key']
        elif 'value' in secret:
            return secret['value']
        else:
            raise ValueError(f"No API key found in secret for service '{service}'")
    
    def get_jwt_keys(self) -> Dict[str, str]:
        """
        Get JWT signing keys
        
        Returns:
            Dictionary with public and private keys
        """
        secret = self.get_secret('jwt/keys')
        
        if 'private_key' not in secret or 'public_key' not in secret:
            raise ValueError("Invalid JWT keys format")
        
        return secret


class EnvironmentSecretStore(SecretStore):
    """Fallback secret store using environment variables"""
    
    def get_secret(self, secret_id: str) -> Dict[str, Any]:
        """Get secret from environment variable"""
        env_key = f"SECRET_{secret_id.upper().replace('/', '_').replace('-', '_')}"
        value = os.getenv(env_key)
        
        if not value:
            raise ValueError(f"Secret '{secret_id}' not found in environment")
        
        # Try to parse as JSON
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {'value': value}
    
    def create_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """Not supported for environment variables"""
        raise NotImplementedError("Cannot create secrets in environment variables")
    
    def update_secret(self, secret_id: str, secret_data: Dict[str, Any]) -> bool:
        """Not supported for environment variables"""
        raise NotImplementedError("Cannot update secrets in environment variables")
    
    def delete_secret(self, secret_id: str) -> bool:
        """Not supported for environment variables"""
        raise NotImplementedError("Cannot delete secrets from environment variables")
    
    def list_secrets(self) -> List[str]:
        """List secrets from environment"""
        secrets = []
        for key in os.environ:
            if key.startswith('SECRET_'):
                secret_id = key[7:].lower().replace('_', '-')
                secrets.append(secret_id)
        return secrets