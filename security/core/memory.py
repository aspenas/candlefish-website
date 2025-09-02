"""
Secure Memory Management Module
Implements secure memory handling for sensitive data
"""

import os
import sys
import ctypes
import secrets
import hashlib
import logging
from typing import Any, Optional, List, Dict
from dataclasses import dataclass
import mmap
import tempfile
import platform
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)


class SecureMemory:
    """
    Secure memory management for sensitive data
    Prevents memory swapping and provides secure deletion
    """
    
    def __init__(self):
        """Initialize secure memory manager"""
        self.platform = platform.system()
        self.locked_pages: List[int] = []
        self.secure_buffers: Dict[int, 'SecureBuffer'] = {}
        
        # Try to increase memory lock limit
        self._increase_memlock_limit()
        
        logger.info("Secure Memory Manager initialized on %s", self.platform)
    
    def _increase_memlock_limit(self) -> None:
        """Try to increase memory lock limit (Unix systems)"""
        if self.platform in ['Linux', 'Darwin']:
            try:
                import resource
                
                # Get current limits
                soft, hard = resource.getrlimit(resource.RLIMIT_MEMLOCK)
                
                # Try to set to maximum
                resource.setrlimit(resource.RLIMIT_MEMLOCK, (hard, hard))
                
                logger.info("Memory lock limit set to: %d bytes", hard)
            except Exception as e:
                logger.warning("Could not increase memory lock limit: %s", str(e))
    
    def create_secure_buffer(self, size: int) -> 'SecureBuffer':
        """
        Create a secure memory buffer
        
        Args:
            size: Buffer size in bytes
        
        Returns:
            SecureBuffer instance
        """
        buffer = SecureBuffer(size)
        self.secure_buffers[id(buffer)] = buffer
        return buffer
    
    def lock_memory(self, address: int, size: int) -> bool:
        """
        Lock memory pages to prevent swapping (Unix)
        
        Args:
            address: Memory address
            size: Size in bytes
        
        Returns:
            True if successful
        """
        if self.platform not in ['Linux', 'Darwin']:
            logger.warning("Memory locking not supported on %s", self.platform)
            return False
        
        try:
            # Use mlock to prevent swapping
            libc = ctypes.CDLL("libc.so.6" if self.platform == 'Linux' else "libc.dylib")
            result = libc.mlock(ctypes.c_void_p(address), ctypes.c_size_t(size))
            
            if result == 0:
                self.locked_pages.append(address)
                logger.debug("Locked memory at address %x (size: %d)", address, size)
                return True
            else:
                logger.error("Failed to lock memory: error code %d", result)
                return False
                
        except Exception as e:
            logger.error("Memory lock failed: %s", str(e))
            return False
    
    def unlock_memory(self, address: int, size: int) -> bool:
        """
        Unlock memory pages
        
        Args:
            address: Memory address
            size: Size in bytes
        
        Returns:
            True if successful
        """
        if self.platform not in ['Linux', 'Darwin']:
            return False
        
        try:
            libc = ctypes.CDLL("libc.so.6" if self.platform == 'Linux' else "libc.dylib")
            result = libc.munlock(ctypes.c_void_p(address), ctypes.c_size_t(size))
            
            if result == 0:
                if address in self.locked_pages:
                    self.locked_pages.remove(address)
                logger.debug("Unlocked memory at address %x", address)
                return True
            else:
                return False
                
        except Exception as e:
            logger.error("Memory unlock failed: %s", str(e))
            return False
    
    def secure_wipe(self, data: bytes, passes: int = 3) -> None:
        """
        Securely wipe memory by overwriting with random data
        
        Args:
            data: Data to wipe
            passes: Number of overwrite passes
        """
        if not isinstance(data, (bytes, bytearray)):
            return
        
        size = len(data)
        
        # Multiple passes with different patterns
        for i in range(passes):
            if i == 0:
                # First pass: random data
                pattern = secrets.token_bytes(size)
            elif i == 1:
                # Second pass: complement pattern
                pattern = bytes([0xFF] * size)
            else:
                # Third pass: zeros
                pattern = bytes([0x00] * size)
            
            # Overwrite memory
            if isinstance(data, bytearray):
                data[:] = pattern
            
        # Force garbage collection
        import gc
        gc.collect()
    
    def cleanup(self) -> None:
        """Clean up all secure buffers"""
        for buffer in list(self.secure_buffers.values()):
            buffer.destroy()
        
        self.secure_buffers.clear()
        
        # Unlock any remaining locked pages
        for address in self.locked_pages[:]:
            self.unlock_memory(address, 4096)  # Assume page size
        
        logger.info("Secure memory cleanup completed")


@dataclass
class SecureBuffer:
    """
    Secure buffer for sensitive data storage
    Provides encryption at rest and secure deletion
    """
    
    def __init__(self, size: int):
        """
        Initialize secure buffer
        
        Args:
            size: Buffer size in bytes
        """
        self.size = size
        self.key = secrets.token_bytes(32)  # AES-256 key
        self.aesgcm = AESGCM(self.key)
        self.nonce_counter = 0
        
        # Create memory-mapped file for secure storage
        self.temp_file = tempfile.NamedTemporaryFile(delete=False)
        self.temp_file.write(b'\x00' * size)
        self.temp_file.flush()
        
        # Memory map the file
        self.mmap = mmap.mmap(self.temp_file.fileno(), size)
        
        # Try to lock the memory
        self._lock_memory()
        
        logger.debug("Created secure buffer of size %d", size)
    
    def _lock_memory(self) -> None:
        """Try to lock buffer memory"""
        if platform.system() in ['Linux', 'Darwin']:
            try:
                # Lock the memory-mapped region
                address = ctypes.addressof(ctypes.c_char.from_buffer(self.mmap))
                SecureMemory().lock_memory(address, self.size)
            except Exception as e:
                logger.warning("Could not lock buffer memory: %s", str(e))
    
    def write(self, data: bytes, offset: int = 0) -> None:
        """
        Write encrypted data to buffer
        
        Args:
            data: Data to write
            offset: Offset in buffer
        """
        if offset + len(data) > self.size:
            raise ValueError("Data exceeds buffer size")
        
        # Generate nonce
        nonce = self._get_nonce()
        
        # Encrypt data
        ciphertext = self.aesgcm.encrypt(nonce, data, None)
        
        # Store nonce + ciphertext
        full_data = nonce + ciphertext
        
        # Write to memory map
        self.mmap[offset:offset + len(full_data)] = full_data
        self.mmap.flush()
    
    def read(self, size: int, offset: int = 0) -> bytes:
        """
        Read and decrypt data from buffer
        
        Args:
            size: Number of bytes to read
            offset: Offset in buffer
        
        Returns:
            Decrypted data
        """
        if offset + size > self.size:
            raise ValueError("Read exceeds buffer size")
        
        # Read nonce + ciphertext
        full_data = self.mmap[offset:offset + size + 28]  # 12 bytes nonce + 16 bytes tag
        
        if len(full_data) < 12:
            return b''
        
        # Extract nonce and ciphertext
        nonce = full_data[:12]
        ciphertext = full_data[12:]
        
        # Decrypt
        try:
            plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext
        except Exception as e:
            logger.error("Decryption failed: %s", str(e))
            return b''
    
    def _get_nonce(self) -> bytes:
        """Generate unique nonce"""
        self.nonce_counter += 1
        return self.nonce_counter.to_bytes(12, 'big')
    
    def wipe(self) -> None:
        """Securely wipe buffer contents"""
        # Overwrite with random data
        for _ in range(3):
            self.mmap[0:self.size] = secrets.token_bytes(self.size)
            self.mmap.flush()
        
        # Final overwrite with zeros
        self.mmap[0:self.size] = b'\x00' * self.size
        self.mmap.flush()
    
    def destroy(self) -> None:
        """Destroy buffer and clean up resources"""
        # Wipe contents
        self.wipe()
        
        # Close memory map
        self.mmap.close()
        
        # Delete temp file
        try:
            os.unlink(self.temp_file.name)
        except Exception as e:
            logger.warning("Could not delete temp file: %s", str(e))
        
        # Clear encryption key
        self.key = b'\x00' * 32
        
        logger.debug("Destroyed secure buffer")


class SecureString:
    """
    Secure string implementation that protects sensitive strings in memory
    """
    
    def __init__(self, value: str):
        """
        Initialize secure string
        
        Args:
            value: String value to protect
        """
        self._buffer = SecureBuffer(len(value.encode()) * 2)
        self._hash = hashlib.sha256(value.encode()).hexdigest()
        
        # Encrypt and store value
        self._buffer.write(value.encode())
        
        # Clear original value
        value = '\x00' * len(value)
    
    def get_value(self) -> str:
        """
        Get the decrypted string value
        
        Returns:
            Original string
        """
        data = self._buffer.read(self._buffer.size)
        return data.decode('utf-8').rstrip('\x00')
    
    def __str__(self) -> str:
        """String representation (masked)"""
        return f"SecureString(hash={self._hash[:8]}...)"
    
    def __repr__(self) -> str:
        """Representation (masked)"""
        return f"<SecureString hash={self._hash[:8]}...>"
    
    def __del__(self) -> None:
        """Destructor - ensure secure cleanup"""
        try:
            self._buffer.destroy()
        except:
            pass
    
    def __eq__(self, other: Any) -> bool:
        """Secure comparison"""
        if not isinstance(other, (SecureString, str)):
            return False
        
        if isinstance(other, SecureString):
            # Compare hashes first (fast path)
            if self._hash != other._hash:
                return False
            # Then compare actual values (constant time)
            return secrets.compare_digest(self.get_value(), other.get_value())
        else:
            # Compare with regular string
            return secrets.compare_digest(self.get_value(), other)


class SecureConfig:
    """
    Secure configuration storage with memory protection
    """
    
    def __init__(self):
        """Initialize secure configuration storage"""
        self.configs: Dict[str, SecureBuffer] = {}
        self.memory_manager = SecureMemory()
    
    def set(self, key: str, value: Any) -> None:
        """
        Store configuration value securely
        
        Args:
            key: Configuration key
            value: Configuration value
        """
        # Serialize value
        import pickle
        serialized = pickle.dumps(value)
        
        # Create secure buffer
        buffer = self.memory_manager.create_secure_buffer(len(serialized) * 2)
        buffer.write(serialized)
        
        # Store buffer
        self.configs[key] = buffer
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Retrieve configuration value
        
        Args:
            key: Configuration key
            default: Default value if not found
        
        Returns:
            Configuration value
        """
        if key not in self.configs:
            return default
        
        buffer = self.configs[key]
        serialized = buffer.read(buffer.size)
        
        # Deserialize
        import pickle
        try:
            return pickle.loads(serialized)
        except Exception:
            return default
    
    def delete(self, key: str) -> bool:
        """
        Delete configuration value
        
        Args:
            key: Configuration key
        
        Returns:
            True if deleted
        """
        if key in self.configs:
            buffer = self.configs[key]
            buffer.destroy()
            del self.configs[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all configuration values"""
        for buffer in self.configs.values():
            buffer.destroy()
        self.configs.clear()
    
    def __del__(self) -> None:
        """Destructor - ensure cleanup"""
        try:
            self.clear()
            self.memory_manager.cleanup()
        except:
            pass