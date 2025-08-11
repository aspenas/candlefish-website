// Field-level encryption service for Tyler Setup Platform
// Addresses critical security audit findings

const crypto = require('crypto');
const AWS = require('aws-sdk');

const kms = new AWS.KMS({ region: process.env.AWS_REGION });
const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION });

class EncryptionService {
  constructor() {
    this.encryptionKey = null;
    this.keyCache = new Map();
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationAlgorithm = 'pbkdf2';
    this.iterations = 100000;
    this.saltLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  async initialize() {
    if (this.encryptionKey) return;

    try {
      // Get encryption key from AWS Secrets Manager
      const secret = await secretsManager.getSecretValue({
        SecretId: 'tyler-setup/encryption/field-level-key'
      }).promise();

      const secretData = JSON.parse(secret.SecretString);
      this.encryptionKey = Buffer.from(secretData.key, 'base64');

      console.log('Encryption service initialized');
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw error;
    }
  }

  /**
   * Encrypt sensitive field data
   * @param {string} plaintext - The data to encrypt
   * @param {string} fieldName - Field identifier for key derivation
   * @returns {string} - Base64 encoded encrypted data with metadata
   */
  async encryptField(plaintext, fieldName = 'default') {
    await this.initialize();

    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    try {
      // Generate salt for key derivation
      const salt = crypto.randomBytes(this.saltLength);

      // Derive field-specific key
      const fieldKey = await this.deriveKey(this.encryptionKey, salt, fieldName);

      // Generate initialization vector
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, fieldKey, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine all components: version + salt + iv + authTag + encrypted
      const version = Buffer.from([1]); // Version 1
      const combined = Buffer.concat([
        version,
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive field data
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} fieldName - Field identifier for key derivation
   * @returns {string} - Decrypted plaintext
   */
  async decryptField(encryptedData, fieldName = 'default') {
    await this.initialize();

    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }

    try {
      // Decode base64
      const combined = Buffer.from(encryptedData, 'base64');

      if (combined.length < 1 + this.saltLength + this.ivLength + this.tagLength) {
        throw new Error('Invalid encrypted data format');
      }

      // Extract components
      let offset = 0;
      const version = combined.subarray(offset, offset + 1)[0];
      offset += 1;

      if (version !== 1) {
        throw new Error('Unsupported encryption version');
      }

      const salt = combined.subarray(offset, offset + this.saltLength);
      offset += this.saltLength;

      const iv = combined.subarray(offset, offset + this.ivLength);
      offset += this.ivLength;

      const authTag = combined.subarray(offset, offset + this.tagLength);
      offset += this.tagLength;

      const encrypted = combined.subarray(offset);

      // Derive field-specific key
      const fieldKey = await this.deriveKey(this.encryptionKey, salt, fieldName);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, fieldKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Derive field-specific encryption key
   * @param {Buffer} masterKey - Master encryption key
   * @param {Buffer} salt - Random salt
   * @param {string} fieldName - Field identifier
   * @returns {Buffer} - Derived key
   */
  async deriveKey(masterKey, salt, fieldName) {
    const cacheKey = `${salt.toString('hex')}-${fieldName}`;

    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    // Use PBKDF2 for key derivation with field name as additional entropy
    const info = Buffer.from(fieldName, 'utf8');
    const derivedKey = crypto.pbkdf2Sync(masterKey, Buffer.concat([salt, info]), this.iterations, 32, 'sha256');

    // Cache the derived key (with size limit)
    if (this.keyCache.size >= 1000) {
      const firstKey = this.keyCache.keys().next().value;
      this.keyCache.delete(firstKey);
    }

    this.keyCache.set(cacheKey, derivedKey);
    return derivedKey;
  }

  /**
   * Encrypt multiple fields in an object
   * @param {Object} data - Object with fields to encrypt
   * @param {Array} fieldsToEncrypt - Array of field names to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  async encryptObject(data, fieldsToEncrypt = []) {
    const result = { ...data };

    for (const fieldName of fieldsToEncrypt) {
      if (data[fieldName] && typeof data[fieldName] === 'string') {
        result[`${fieldName}_encrypted`] = await this.encryptField(data[fieldName], fieldName);
        delete result[fieldName]; // Remove plaintext
      }
    }

    return result;
  }

  /**
   * Decrypt multiple fields in an object
   * @param {Object} data - Object with encrypted fields
   * @param {Array} fieldsToDecrypt - Array of field names to decrypt
   * @returns {Object} - Object with decrypted fields
   */
  async decryptObject(data, fieldsToDecrypt = []) {
    const result = { ...data };

    for (const fieldName of fieldsToDecrypt) {
      const encryptedField = `${fieldName}_encrypted`;
      if (data[encryptedField]) {
        result[fieldName] = await this.decryptField(data[encryptedField], fieldName);
        delete result[encryptedField]; // Remove encrypted field from result
      }
    }

    return result;
  }

  /**
   * Generate secure hash for data integrity
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} - Hexadecimal hash
   */
  generateHash(data, salt = '') {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    if (salt) {
      hash.update(salt);
    }
    return hash.digest('hex');
  }

  /**
   * Verify data integrity hash
   * @param {string} data - Original data
   * @param {string} expectedHash - Expected hash value
   * @param {string} salt - Optional salt used in hashing
   * @returns {boolean} - Whether hash matches
   */
  verifyHash(data, expectedHash, salt = '') {
    const actualHash = this.generateHash(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  /**
   * Encrypt data using AWS KMS
   * @param {string} plaintext - Data to encrypt
   * @param {string} keyId - KMS key ID
   * @returns {string} - Base64 encoded ciphertext
   */
  async encryptWithKMS(plaintext, keyId) {
    try {
      const result = await kms.encrypt({
        KeyId: keyId || process.env.KMS_KEY_ID,
        Plaintext: plaintext
      }).promise();

      return result.CiphertextBlob.toString('base64');
    } catch (error) {
      console.error('KMS encryption failed:', error);
      throw new Error('KMS encryption failed');
    }
  }

  /**
   * Decrypt data using AWS KMS
   * @param {string} ciphertextBlob - Base64 encoded ciphertext
   * @returns {string} - Decrypted plaintext
   */
  async decryptWithKMS(ciphertextBlob) {
    try {
      const result = await kms.decrypt({
        CiphertextBlob: Buffer.from(ciphertextBlob, 'base64')
      }).promise();

      return result.Plaintext.toString('utf8');
    } catch (error) {
      console.error('KMS decryption failed:', error);
      throw new Error('KMS decryption failed');
    }
  }

  /**
   * Securely compare two strings to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} - Whether strings are equal
   */
  secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  }

  /**
   * Generate cryptographically secure random string
   * @param {number} length - Length of random string
   * @param {string} charset - Character set to use
   * @returns {string} - Random string
   */
  generateSecureRandom(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    const bytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }

    return result;
  }

  /**
   * Clear sensitive data from memory
   */
  clearCache() {
    this.keyCache.clear();
    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
      this.encryptionKey = null;
    }
  }
}

// Export singleton instance
module.exports = new EncryptionService();
