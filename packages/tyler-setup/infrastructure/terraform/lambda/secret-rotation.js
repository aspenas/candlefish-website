// Secret Rotation Lambda Function for Tyler Setup Platform

const AWS = require('aws-sdk');
const crypto = require('crypto');

const secretsManager = new AWS.SecretsManager();
const kms = new AWS.KMS();

const PROJECT_NAME = '${project_name}';
const KMS_KEY_ID = '${kms_key_id}';

exports.handler = async (event) => {
    console.log('Secret rotation event:', JSON.stringify(event, null, 2));

    const { SecretId, Step, Token } = event;

    try {
        switch (Step) {
            case 'createSecret':
                return await createSecret(SecretId, Token);
            case 'setSecret':
                return await setSecret(SecretId, Token);
            case 'testSecret':
                return await testSecret(SecretId, Token);
            case 'finishSecret':
                return await finishSecret(SecretId, Token);
            default:
                throw new Error(`Invalid step: ${Step}`);
        }
    } catch (error) {
        console.error('Secret rotation failed:', error);
        throw error;
    }
};

async function createSecret(secretId, token) {
    console.log(`Creating new secret version for ${secretId}`);

    // Get current secret
    const currentSecret = await secretsManager.getSecretValue({
        SecretId: secretId
    }).promise();

    const currentData = JSON.parse(currentSecret.SecretString);
    let newData;

    // Generate new secret based on secret type
    if (secretId.includes('jwt-secret')) {
        newData = {
            ...currentData,
            secret: generateSecureToken(64),
            generated_at: new Date().toISOString(),
            algorithm: 'HS256',
            expires_in: '24h'
        };
    } else if (secretId.includes('encryption')) {
        newData = {
            ...currentData,
            key: generateEncryptionKey(),
            generated_at: new Date().toISOString(),
            algorithm: 'AES-256-GCM',
            key_derivation: 'PBKDF2'
        };
    } else if (secretId.includes('database')) {
        // For database secrets, generate new password
        const newPassword = generateSecurePassword();
        const dbEndpoint = currentData.host;
        const dbPort = currentData.port;
        const dbName = currentData.database;
        const dbUser = currentData.username;

        newData = {
            ...currentData,
            password: newPassword,
            url: `postgresql://${dbUser}:${newPassword}@${dbEndpoint}:${dbPort}/${dbName}?sslmode=require`,
            rotated_at: new Date().toISOString()
        };
    } else {
        throw new Error(`Unsupported secret type for rotation: ${secretId}`);
    }

    // Store the new secret version
    await secretsManager.putSecretValue({
        SecretId: secretId,
        SecretString: JSON.stringify(newData),
        VersionStage: 'AWSPENDING',
        ClientRequestToken: token
    }).promise();

    console.log(`New secret version created for ${secretId}`);
    return { statusCode: 200 };
}

async function setSecret(secretId, token) {
    console.log(`Setting secret in service for ${secretId}`);

    if (secretId.includes('database')) {
        // For database secrets, we would typically update the database user password
        // This is a placeholder - implement actual database password update logic
        const pendingSecret = await secretsManager.getSecretValue({
            SecretId: secretId,
            VersionStage: 'AWSPENDING',
            ClientRequestToken: token
        }).promise();

        const secretData = JSON.parse(pendingSecret.SecretString);
        console.log(`Would update database password for user: ${secretData.username}`);

        // TODO: Implement actual database password update via RDS API
        // await rds.modifyDBInstance({
        //     DBInstanceIdentifier: 'your-db-instance',
        //     MasterUserPassword: secretData.password,
        //     ApplyImmediately: true
        // }).promise();
    }

    console.log(`Secret set in service for ${secretId}`);
    return { statusCode: 200 };
}

async function testSecret(secretId, token) {
    console.log(`Testing secret for ${secretId}`);

    const pendingSecret = await secretsManager.getSecretValue({
        SecretId: secretId,
        VersionStage: 'AWSPENDING',
        ClientRequestToken: token
    }).promise();

    const secretData = JSON.parse(pendingSecret.SecretString);

    if (secretId.includes('database')) {
        // Test database connection with new credentials
        const { Pool } = require('pg');
        const pool = new Pool({
            host: secretData.host,
            port: secretData.port,
            database: secretData.database,
            user: secretData.username,
            password: secretData.password,
            ssl: { rejectUnauthorized: false }
        });

        try {
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('Database connection test successful');
        } catch (error) {
            throw new Error(`Database connection test failed: ${error.message}`);
        } finally {
            await pool.end();
        }
    } else if (secretId.includes('jwt-secret')) {
        // Test JWT signing
        const jwt = require('jsonwebtoken');
        const testPayload = { test: true, exp: Math.floor(Date.now() / 1000) + 60 };

        try {
            const token = jwt.sign(testPayload, secretData.secret, { algorithm: secretData.algorithm });
            const decoded = jwt.verify(token, secretData.secret, { algorithms: [secretData.algorithm] });
            console.log('JWT signing test successful');
        } catch (error) {
            throw new Error(`JWT signing test failed: ${error.message}`);
        }
    } else if (secretId.includes('encryption')) {
        // Test field-level encryption
        try {
            const testData = 'test-encryption-data';
            const encrypted = encrypt(testData, Buffer.from(secretData.key, 'base64'));
            const decrypted = decrypt(encrypted, Buffer.from(secretData.key, 'base64'));

            if (decrypted !== testData) {
                throw new Error('Encryption/decryption mismatch');
            }
            console.log('Encryption test successful');
        } catch (error) {
            throw new Error(`Encryption test failed: ${error.message}`);
        }
    }

    console.log(`Secret test successful for ${secretId}`);
    return { statusCode: 200 };
}

async function finishSecret(secretId, token) {
    console.log(`Finishing secret rotation for ${secretId}`);

    // Move AWSPENDING to AWSCURRENT
    await secretsManager.updateSecretVersionStage({
        SecretId: secretId,
        VersionStage: 'AWSCURRENT',
        ClientRequestToken: token,
        MoveToVersionId: token
    }).promise();

    // Remove old AWSCURRENT version
    await secretsManager.updateSecretVersionStage({
        SecretId: secretId,
        VersionStage: 'AWSPREVIOUS',
        RemoveFromVersionId: token
    }).promise();

    console.log(`Secret rotation completed for ${secretId}`);
    return { statusCode: 200 };
}

function generateSecureToken(length) {
    return crypto.randomBytes(length).toString('hex');
}

function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('base64');
}

function generateSecurePassword() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one character from each character set
    password += getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    password += getRandomChar('abcdefghijklmnopqrstuvwxyz');
    password += getRandomChar('0123456789');
    password += getRandomChar('!@#$%^&*');

    // Fill remaining length
    for (let i = 4; i < 32; i++) {
        password += getRandomChar(charset);
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

function getRandomChar(charset) {
    return charset.charAt(Math.floor(Math.random() * charset.length));
}

function encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData, key) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
