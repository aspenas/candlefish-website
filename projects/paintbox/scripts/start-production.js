#!/usr/bin/env node

/**
 * Production start script for Paintbox
 * - Bootstraps secrets from AWS Secrets Manager (if enabled)
 * - Starts Next.js server and WebSocket server
 */

const { spawn } = require('child_process');
const path = require('path');

// Optionally load real secrets from AWS before starting child processes
async function loadAwsSecretsIfEnabled() {
  // Allow opting out
  if (process.env.SKIP_AWS_SECRETS === 'true') {
    console.log('🔒 SKIP_AWS_SECRETS=true, not loading from AWS Secrets Manager');
    return;
  }

  // Only attempt in production or when explicitly configured with a prefix
  const isProduction = process.env.NODE_ENV === 'production';
  const hasExplicitPrefix = !!process.env.AWS_SECRETS_PREFIX;
  if (!isProduction && !hasExplicitPrefix) {
    console.log('🔧 Development mode without AWS_SECRETS_PREFIX; skipping AWS Secrets Manager');
    return;
  }

  const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

  const region = process.env.AWS_REGION || 'us-east-1';
  const explicitSecretName = process.env.AWS_SECRETS_MANAGER_SECRET_NAME;
  const prefix = process.env.AWS_SECRETS_PREFIX || 'paintbox';

  console.log('🔐 Loading secrets from AWS Secrets Manager...');
  console.log(`   Region: ${region}`);
  console.log(`   Prefix: ${prefix}`);

  const client = new SecretsManagerClient({ region });

  async function fetchSecretJson(name) {
    const id = `${prefix}/${name}`;
    const resp = await client.send(new GetSecretValueCommand({ SecretId: id }));
    if (!resp.SecretString) throw new Error(`Secret has no string value: ${id}`);
    return JSON.parse(resp.SecretString);
  }

  try {
    // Prefer aggregated secret if available, otherwise try decomposed names
    const aggregatedName = explicitSecretName || `${prefix}/secrets`;
    let aggregated;
    try {
      const resp = await client.send(new GetSecretValueCommand({ SecretId: aggregatedName }));
      aggregated = resp.SecretString ? JSON.parse(resp.SecretString) : null;
    } catch (e) {
      aggregated = null;
    }

    if (aggregated && typeof aggregated === 'object') {
      console.log(`   Using aggregated secret: ${aggregatedName}`);
      // Database
      if (aggregated.database?.url) {
        process.env.DATABASE_URL = aggregated.database.url;
        console.log('   ✓ Database URL set');
      }
      // Redis
      if (aggregated.redis?.url) {
        process.env.REDIS_URL = aggregated.redis.url;
        console.log('   ✓ Redis URL set');
      }
      // Salesforce
      if (aggregated.salesforce) {
        const sf = aggregated.salesforce;
        if (sf.clientId) process.env.SALESFORCE_CLIENT_ID = sf.clientId;
        if (sf.clientSecret) process.env.SALESFORCE_CLIENT_SECRET = sf.clientSecret;
        if (sf.username) process.env.SALESFORCE_USERNAME = sf.username;
        if (sf.password) process.env.SALESFORCE_PASSWORD = sf.password;
        if (sf.securityToken) process.env.SALESFORCE_SECURITY_TOKEN = sf.securityToken;
        if (sf.instanceUrl) process.env.SALESFORCE_INSTANCE_URL = sf.instanceUrl;
        if (sf.apiVersion) process.env.SALESFORCE_API_VERSION = sf.apiVersion;
        console.log('   ✓ Salesforce secrets set');
      }
      // CompanyCam
      if (aggregated.companyCam?.apiToken) {
        process.env.COMPANYCAM_API_KEY = aggregated.companyCam.apiToken;
        console.log('   ✓ CompanyCam token set');
      }
      // Monitoring
      if (aggregated.sentry?.dsn) process.env.SENTRY_DSN = aggregated.sentry.dsn;
      // JWT keys (RS256)
      if (aggregated.jwt?.publicKey) process.env.JWT_PUBLIC_KEY = aggregated.jwt.publicKey;
      if (aggregated.jwt?.privateKey) process.env.JWT_PRIVATE_KEY = aggregated.jwt.privateKey;
      // Encryption
      if (aggregated.encryption?.key) process.env.ENCRYPTION_KEY = aggregated.encryption.key;

      console.log('✅ AWS aggregated secrets initialization complete');
    } else {
      console.log('   Aggregated secrets not found; falling back to decomposed secrets');

      // Fetch in parallel
      const [db, redis, app, salesforce, companycam, monitoring, email] = await Promise.all([
        fetchSecretJson('database').catch((e) => ({ __error: e })),
        fetchSecretJson('redis').catch((e) => ({ __error: e })),
        fetchSecretJson('app').catch((e) => ({ __error: e })),
        fetchSecretJson('salesforce').catch((e) => ({ __error: e })),
        fetchSecretJson('companycam').catch((e) => ({ __error: e })),
        fetchSecretJson('monitoring').catch((e) => ({ __error: e })),
        fetchSecretJson('email').catch((e) => ({ __error: e })),
      ]);

      // Database
      if (!db.__error && db) {
        const connectionUrl = `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}${db.ssl ? '?sslmode=require' : ''}`;
        process.env.DATABASE_URL = connectionUrl;
        process.env.DATABASE_HOST = db.host;
        process.env.DATABASE_PORT = String(db.port);
        process.env.DATABASE_NAME = db.database;
        process.env.DATABASE_USER = db.username;
        process.env.DATABASE_PASSWORD = db.password;
        if (db.pool_min != null) process.env.DATABASE_POOL_MIN = String(db.pool_min);
        if (db.pool_max != null) process.env.DATABASE_POOL_MAX = String(db.pool_max);
        console.log('   ✓ Database secrets loaded');
      } else if (db?.__error) {
        console.warn('   ⚠️  Database secrets not configured:', db.__error.message);
      }

      // Redis
      if (!redis.__error && redis) {
        const redisUrl = `redis://:${redis.password}@${redis.host}:${redis.port}/${redis.db}`;
        process.env.REDIS_URL = redisUrl;
        process.env.REDIS_HOST = redis.host;
        process.env.REDIS_PORT = String(redis.port);
        process.env.REDIS_PASSWORD = redis.password;
        process.env.REDIS_DB = String(redis.db);
        console.log('   ✓ Redis secrets loaded');
      } else if (redis?.__error) {
        console.warn('   ⚠️  Redis secrets not configured:', redis.__error.message);
      }

      // App
      if (!app.__error && app) {
        if (app.jwt_secret) process.env.JWT_SECRET = app.jwt_secret;
        if (app.encryption_key) process.env.ENCRYPTION_KEY = app.encryption_key;
        if (app.session_secret) process.env.SESSION_SECRET = app.session_secret;
        console.log('   ✓ App secrets loaded');
      } else if (app?.__error) {
        console.warn('   ⚠️  App secrets not configured:', app.__error.message);
      }

      // Salesforce
      if (!salesforce.__error && salesforce) {
        if (salesforce.client_id) process.env.SALESFORCE_CLIENT_ID = salesforce.client_id;
        if (salesforce.client_secret) process.env.SALESFORCE_CLIENT_SECRET = salesforce.client_secret;
        if (salesforce.username) process.env.SALESFORCE_USERNAME = salesforce.username;
        if (salesforce.password) process.env.SALESFORCE_PASSWORD = salesforce.password;
        if (salesforce.security_token) process.env.SALESFORCE_SECURITY_TOKEN = salesforce.security_token;
        if (salesforce.login_url) process.env.SALESFORCE_LOGIN_URL = salesforce.login_url;
        if (salesforce.api_version) process.env.SALESFORCE_API_VERSION = salesforce.api_version;
        console.log('   ✓ Salesforce secrets loaded');
      } else if (salesforce?.__error) {
        console.warn('   ⚠️  Salesforce secrets not configured:', salesforce.__error.message);
      }

      // CompanyCam
      if (!companycam.__error && companycam) {
        if (companycam.api_key) process.env.COMPANYCAM_API_KEY = companycam.api_key;
        if (companycam.api_secret) process.env.COMPANYCAM_API_SECRET = companycam.api_secret;
        if (companycam.base_url) process.env.COMPANYCAM_BASE_URL = companycam.base_url;
        console.log('   ✓ CompanyCam secrets loaded');
      } else if (companycam?.__error) {
        console.warn('   ⚠️  CompanyCam secrets not configured:', companycam.__error.message);
      }

      // Monitoring
      if (!monitoring.__error && monitoring) {
        if (monitoring.sentry_dsn) process.env.SENTRY_DSN = monitoring.sentry_dsn;
        if (monitoring.datadog_api_key) process.env.DATADOG_API_KEY = monitoring.datadog_api_key;
        if (monitoring.logrocket_app_id) process.env.LOGROCKET_APP_ID = monitoring.logrocket_app_id;
        console.log('   ✓ Monitoring secrets loaded');
      } else if (monitoring?.__error) {
        console.warn('   ⚠️  Monitoring secrets not configured:', monitoring.__error.message);
      }

      // Email
      if (!email.__error && email) {
        if (email.sendgrid_api_key) process.env.SENDGRID_API_KEY = email.sendgrid_api_key;
        if (email.from_email) process.env.SENDGRID_FROM_EMAIL = email.from_email;
        if (email.smtp_host) process.env.SMTP_HOST = email.smtp_host;
        if (email.smtp_port != null) process.env.SMTP_PORT = String(email.smtp_port);
        if (email.smtp_user) process.env.SMTP_USER = email.smtp_user;
        console.log('   ✓ Email secrets loaded');
      } else if (email?.__error) {
        console.warn('   ⚠️  Email secrets not configured:', email.__error.message);
      }

      console.log('✅ AWS secrets initialization complete (decomposed)');
    }
  } catch (err) {
    console.error('❌ Failed to initialize AWS secrets:', err.message);
    // Keep going; child processes may still start with .env defaults
  }
}

const port = process.env.PORT || 3000;
const wsPort = process.env.WEBSOCKET_PORT || 3001;

// Check if WebSocket server build exists
const fs = require('fs');
const wsServerPath = path.join(__dirname, '..', 'dist', 'websocket-server.js');
const wsServerExists = fs.existsSync(wsServerPath);

let processes = [];

// Defer WebSocket spawn until after secrets load

async function start() {
  // Load secrets before spawning child processes so they inherit env
  await loadAwsSecretsIfEnabled();

  // Compute runtime values that may depend on secrets
  const effectiveRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  console.log(`🎨 Starting Paintbox Production Services...`);
  console.log(`   Web Server: http://localhost:${port}`);
  console.log(`   WebSocket:  ws://localhost:${wsPort}`);
  console.log(`   Redis:      ${effectiveRedisUrl}`);
  console.log('');

  // Start WebSocket server if built
  if (wsServerExists) {
    console.log('📡 Starting WebSocket server...');

    const wsProcess = spawn('node', [wsServerPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        WEBSOCKET_PORT: wsPort,
        REDIS_URL: effectiveRedisUrl,
      }
    });

    wsProcess.on('error', (err) => {
      console.error('Failed to start WebSocket server:', err);
      cleanup();
      process.exit(1);
    });

    wsProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`WebSocket server exited with code ${code}`);
        cleanup();
        process.exit(code);
      }
    });

    processes.push(wsProcess);
  } else {
    console.log('⚠️  WebSocket server not built. Run: npm run build:websocket');
  }

  // Start Next.js in production mode
  console.log('🚀 Starting Next.js server...');

  const nextProcess = spawn('npm', ['run', 'start:next'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'production',
      NEXT_PUBLIC_WEBSOCKET_URL: `http://localhost:${wsPort}`,
      REDIS_URL: effectiveRedisUrl,
    }
  });

  nextProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
    cleanup();
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Next.js server exited with code ${code}`);
    }
    cleanup();
    process.exit(code);
  });

  processes.push(nextProcess);

  // Log startup complete
  setTimeout(() => {
    console.log('\n✅ Paintbox Production Services Started Successfully!');
    console.log(`   Web:       http://localhost:${port}`);
    console.log(`   WebSocket: ws://localhost:${wsPort}`);
    console.log(`   Health:    http://localhost:${port}/api/health`);
    console.log('');
  }, 2000);
}

// Cleanup function
function cleanup() {
  console.log('\n🛑 Shutting down services...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
}

// Handle termination signals
process.on('SIGINT', () => {
  console.log('\n⚡ Received SIGINT, shutting down gracefully...');
  cleanup();
  setTimeout(() => {
    console.log('⚠️  Force shutdown after 5 seconds');
    process.exit(0);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('\n⚡ Received SIGTERM, shutting down gracefully...');
  cleanup();
  setTimeout(() => {
    console.log('⚠️  Force shutdown after 5 seconds');
    process.exit(0);
  }, 5000);
});

// Kick off
start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
