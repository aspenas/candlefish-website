"""
Encryption module for secure data handling
Implements AES-256-GCM encryption with key rotation support
"""

import os
import json
import base64
import hashlib
import secrets
from typing import Any, Dict, Optional, Union, Tuple
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
import logging

logger = logging.getLogger(__name__)


class SecureString:
    """Secure string wrapper that prevents accidental exposure"""
    
    def __init__(self, value: str):
        self._hash = hashlib.sha256(value.encode()).hexdigest()
        self._encrypted = self._encrypt_in_memory(value)
        # Clear original value from memory
        value = '\x00' * len(value)
    
    def _encrypt_in_memory(self, value: str) -> bytes:
        """Encrypt value in memory using ephemeral key"""
        key = secrets.token_bytes(32)
        nonce = secrets.token_bytes(12)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, value.encode(), None)
        return key + nonce + ciphertext
    
    def get_value(self) -> str:
        """Decrypt and return the actual value"""
        data = self._encrypted
        key = data[:32]
        nonce = data[32:44]
        ciphertext = data[44:]
        aesgcm = AESGCM(key)
        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext.decode()
        except InvalidTag:
            raise ValueError("Failed to decrypt secure string - data corrupted")
    
    def __str__(self):
        return f"SecureString(hash={self._hash[:8]}...)"
    
    def __repr__(self):
        return f"<SecureString hash={self._hash[:8]}...>"


class EncryptionManager:
    """
    Manages encryption/decryption with key rotation and versioning
    Implements OWASP best practices for encryption
    """
    
    KEY_VERSION = "v1"
    ALGORITHM = "AES-256-GCM"
    KEY_ROTATION_DAYS = 90
    
    def __init__(self, master_key: Optional[bytes] = None, 
                 key_derivation_salt: Optional[bytes] = None):
        """
        Initialize encryption manager
        
        Args:
            master_key: Master encryption key (32 bytes)
            key_derivation_salt: Salt for key derivation (16 bytes)
        """
        self.master_key = master_key or self._get_or_create_master_key()
        self.salt = key_derivation_salt or os.urandom(16)
        self.backend = default_backend()
        self._key_cache: Dict[str, Tuple[bytes, datetime]] = {}
        self._rotation_schedule: Dict[str, datetime] = {}
        
        # Initialize RSA key pair for asymmetric operations
        self.rsa_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=4096,
            backend=self.backend
        )
        self.rsa_public_key = self.rsa_private_key.public_key()
        
        logger.info("EncryptionManager initialized with algorithm: %s", self.ALGORITHM)
    
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master key from environment or AWS KMS"""
        # Try environment variable first
        env_key = os.getenv('CLAUDE_MASTER_KEY')
        if env_key:
            return base64.b64decode(env_key)
        
        # Try AWS KMS (placeholder - requires AWS KMS integration)
        # In production, this would fetch from AWS KMS
        
        # Generate new key if none exists (development only)
        logger.warning("Generating ephemeral master key - not for production use")
        return os.urandom(32)
    
    def derive_key(self, context: str, version: str = None) -> bytes:
        """
        Derive a context-specific key using PBKDF2
        
        Args:
            context: Context identifier for key derivation
            version: Key version (defaults to current version)
        
        Returns:
            32-byte derived key
        """
        version = version or self.KEY_VERSION
        cache_key = f"{context}:{version}"
        
        # Check cache
        if cache_key in self._key_cache:
            key, created = self._key_cache[cache_key]
            if datetime.now() - created < timedelta(days=1):
                return key
        
        # Derive new key
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt + context.encode() + version.encode(),
            iterations=100000,
            backend=self.backend
        )
        key = kdf.derive(self.master_key)
        
        # Cache the key
        self._key_cache[cache_key] = (key, datetime.now())
        
        return key
    
    def encrypt(self, data: Union[str, bytes, dict], context: str = "default") -> Dict[str, str]:
        """
        Encrypt data using AES-256-GCM
        
        Args:
            data: Data to encrypt (string, bytes, or dict)
            context: Encryption context for key derivation
        
        Returns:
            Dict containing encrypted data and metadata
        """
        # Convert data to bytes
        if isinstance(data, dict):
            plaintext = json.dumps(data).encode()
        elif isinstance(data, str):
            plaintext = data.encode()
        else:
            plaintext = data
        
        # Generate nonce
        nonce = os.urandom(12)
        
        # Derive context-specific key
        key = self.derive_key(context)
        
        # Encrypt using AES-GCM
        aesgcm = AESGCM(key)
        
        # Add authenticated data
        aad = json.dumps({
            'context': context,
            'version': self.KEY_VERSION,
            'algorithm': self.ALGORITHM,
            'timestamp': datetime.utcnow().isoformat()
        }).encode()
        
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
        
        # Build encrypted payload
        payload = {
            'ciphertext': base64.b64encode(ciphertext).decode(),
            'nonce': base64.b64encode(nonce).decode(),
            'context': context,
            'version': self.KEY_VERSION,
            'algorithm': self.ALGORITHM,
            'aad': base64.b64encode(aad).decode(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.debug("Encrypted data for context: %s", context)
        
        return payload
    
    def decrypt(self, encrypted_data: Dict[str, str]) -> Union[str, bytes, dict]:
        """
        Decrypt data encrypted with encrypt()
        
        Args:
            encrypted_data: Dictionary containing encrypted payload
        
        Returns:
            Decrypted data in original format
        """
        try:
            # Extract components
            ciphertext = base64.b64decode(encrypted_data['ciphertext'])
            nonce = base64.b64decode(encrypted_data['nonce'])
            context = encrypted_data['context']
            version = encrypted_data.get('version', self.KEY_VERSION)
            aad = base64.b64decode(encrypted_data['aad'])
            
            # Derive key for the specific version
            key = self.derive_key(context, version)
            
            # Decrypt
            aesgcm = AESGCM(key)
            plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
            
            # Try to decode as JSON first
            try:
                return json.loads(plaintext.decode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                # Try as string
                try:
                    return plaintext.decode()
                except UnicodeDecodeError:
                    # Return as bytes
                    return plaintext
                    
        except InvalidTag:
            logger.error("Failed to decrypt - authentication tag invalid")
            raise ValueError("Decryption failed - data may be tampered")
        except Exception as e:
            logger.error("Decryption error: %s", str(e))
            raise
    
    def encrypt_file(self, file_path: str, output_path: Optional[str] = None) -> str:
        """
        Encrypt a file
        
        Args:
            file_path: Path to file to encrypt
            output_path: Output path (defaults to .enc extension)
        
        Returns:
            Path to encrypted file
        """
        output_path = output_path or f"{file_path}.enc"
        
        with open(file_path, 'rb') as f:
            data = f.read()
        
        encrypted = self.encrypt(data, context=f"file:{os.path.basename(file_path)}")
        
        with open(output_path, 'w') as f:
            json.dump(encrypted, f)
        
        # Secure delete original if requested
        if os.getenv('SECURE_DELETE_ORIGINAL') == 'true':
            self._secure_delete(file_path)
        
        logger.info("File encrypted: %s -> %s", file_path, output_path)
        return output_path
    
    def decrypt_file(self, encrypted_path: str, output_path: Optional[str] = None) -> str:
        """
        Decrypt a file
        
        Args:
            encrypted_path: Path to encrypted file
            output_path: Output path
        
        Returns:
            Path to decrypted file
        """
        output_path = output_path or encrypted_path.replace('.enc', '')
        
        with open(encrypted_path, 'r') as f:
            encrypted_data = json.load(f)
        
        decrypted = self.decrypt(encrypted_data)
        
        with open(output_path, 'wb') as f:
            if isinstance(decrypted, bytes):
                f.write(decrypted)
            else:
                f.write(decrypted.encode())
        
        logger.info("File decrypted: %s -> %s", encrypted_path, output_path)
        return output_path
    
    def rotate_keys(self, context: str = None) -> Dict[str, Any]:
        """
        Rotate encryption keys
        
        Args:
            context: Specific context to rotate (None for all)
        
        Returns:
            Rotation status information
        """
        rotated = []
        
        if context:
            contexts = [context]
        else:
            contexts = list(set(k.split(':')[0] for k in self._key_cache.keys()))
        
        new_version = f"v{int(self.KEY_VERSION[1:]) + 1}"
        
        for ctx in contexts:
            # Generate new key for context
            new_key = self.derive_key(ctx, new_version)
            
            # Mark old keys for deletion after grace period
            old_cache_key = f"{ctx}:{self.KEY_VERSION}"
            if old_cache_key in self._key_cache:
                self._rotation_schedule[old_cache_key] = datetime.now() + timedelta(days=7)
            
            rotated.append(ctx)
            logger.info("Rotated key for context: %s", ctx)
        
        # Update version
        self.KEY_VERSION = new_version
        
        return {
            'rotated_contexts': rotated,
            'new_version': new_version,
            'grace_period_days': 7
        }
    
    def _secure_delete(self, file_path: str) -> None:
        """Securely delete a file by overwriting with random data"""
        if not os.path.exists(file_path):
            return
        
        file_size = os.path.getsize(file_path)
        
        with open(file_path, 'rb+') as f:
            # Overwrite with random data 3 times
            for _ in range(3):
                f.seek(0)
                f.write(os.urandom(file_size))
                f.flush()
                os.fsync(f.fileno())
        
        # Finally delete
        os.remove(file_path)
        logger.info("Securely deleted file: %s", file_path)
    
    def encrypt_asymmetric(self, data: bytes, public_key: Optional[Any] = None) -> bytes:
        """
        Encrypt data using RSA public key encryption
        
        Args:
            data: Data to encrypt
            public_key: Public key (uses internal if not provided)
        
        Returns:
            Encrypted data
        """
        key = public_key or self.rsa_public_key
        
        # RSA can only encrypt limited data, so we use hybrid encryption
        # Generate AES key
        aes_key = os.urandom(32)
        
        # Encrypt data with AES
        aesgcm = AESGCM(aes_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data, None)
        
        # Encrypt AES key with RSA
        encrypted_key = key.encrypt(
            aes_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Combine encrypted key, nonce, and ciphertext
        return encrypted_key + nonce + ciphertext
    
    def decrypt_asymmetric(self, encrypted_data: bytes) -> bytes:
        """
        Decrypt data encrypted with encrypt_asymmetric
        
        Args:
            encrypted_data: Encrypted data
        
        Returns:
            Decrypted data
        """
        # Extract components (RSA key size is 512 bytes for 4096-bit key)
        encrypted_key = encrypted_data[:512]
        nonce = encrypted_data[512:524]
        ciphertext = encrypted_data[524:]
        
        # Decrypt AES key with RSA
        aes_key = self.rsa_private_key.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Decrypt data with AES
        aesgcm = AESGCM(aes_key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        
        return plaintext