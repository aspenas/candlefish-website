import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const client = new SecretsManagerClient({ 
  region: process.env.AWS_REGION || "us-east-1" 
});

export async function loadZoomCredentials() {
  try {
    // Try to load from AWS Secrets Manager first
    const command = new GetSecretValueCommand({
      SecretId: "zoom-api-credentials"
    });
    
    const response = await client.send(command);
    const secrets = JSON.parse(response.SecretString);
    
    return {
      accountId: secrets.account_id,
      clientId: secrets.client_id,
      clientSecret: secrets.client_secret,
      userEmail: "patrick@candlefish.ai"
    };
  } catch (error) {
    console.log('AWS Secrets Manager not available, using environment variables');
    
    // Fallback to environment variables
    return {
      accountId: process.env.CANDLEFISH_ZOOM_ACCOUNT_ID,
      clientId: process.env.CANDLEFISH_ZOOM_CLIENT_ID,
      clientSecret: process.env.CANDLEFISH_ZOOM_CLIENT_SECRET,
      userEmail: "patrick@candlefish.ai"
    };
  }
}

export async function loadReadAiCredentials() {
  try {
    // Try AWS Secrets Manager
    const command = new GetSecretValueCommand({
      SecretId: "read-ai-api-key"
    });
    
    const response = await client.send(command);
    const secrets = JSON.parse(response.SecretString);
    
    return {
      apiKey: secrets.api_key || secrets.apiKey,
      apiUrl: secrets.api_url || "https://api.read.ai/v1"
    };
  } catch (error) {
    // Fallback to environment variables
    return {
      apiKey: process.env.READ_AI_API_KEY,
      apiUrl: process.env.READ_AI_API_URL || "https://api.read.ai/v1"
    };
  }
}

export async function loadEmailCredentials() {
  const provider = process.env.EMAIL_PROVIDER || 'ses';
  
  if (provider === 'ses') {
    // AWS SES uses IAM credentials or instance role
    return {
      provider: 'ses',
      region: process.env.AWS_REGION || 'us-east-1',
      fromAddress: 'patrick@candlefish.ai',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  } else {
    // Gmail configuration
    return {
      provider: 'gmail',
      user: process.env.GMAIL_USER,
      appPassword: process.env.GMAIL_APP_PASSWORD
    };
  }
}