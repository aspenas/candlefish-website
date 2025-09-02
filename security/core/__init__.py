"""
Core Security Module for Claude Configuration System
Provides encryption, decryption, and secure configuration handling
"""

from .encryption import EncryptionManager, SecureString
from .secrets import SecretsManager, AWSSecretsManager
from .audit import AuditLogger, SecurityEvent
from .validator import InputValidator, ConfigValidator
from .memory import SecureMemory

__all__ = [
    'EncryptionManager',
    'SecureString',
    'SecretsManager',
    'AWSSecretsManager',
    'AuditLogger',
    'SecurityEvent',
    'InputValidator',
    'ConfigValidator',
    'SecureMemory',
]

__version__ = '1.0.0'