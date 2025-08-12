#!/usr/bin/env node

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { execSync } = require('child_process');

const REQUIRED = {
  database: ['DATABASE_URL'],
  redis: ['REDIS_URL'],
  jwtKeys: ['JWT_PUBLIC_KEY', 'JWT_PRIVATE_KEY'],
  encryption: ['ENCRYPTION_KEY'],
  salesforce: [
    'SALESFORCE_CLIENT_ID',
    'SALESFORCE_CLIENT_SECRET',
    'SALESFORCE_USERNAME',
    'SALESFORCE_PASSWORD',
    'SALESFORCE_SECURITY_TOKEN',
  ],
  companycam: ['COMPANYCAM_API_KEY'],
  email: ['SENDGRID_API_KEY'],
  monitoring: ['SENTRY_DSN'],
};

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

async function fetchAwsAggregated(region, secretName) {
  const client = new SecretsManagerClient({ region });
  try {
    const resp = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    if (!resp.SecretString) return {};
    const a = JSON.parse(resp.SecretString);
    const env = {};
    if (a.database?.url) env.DATABASE_URL = a.database.url;
    if (a.redis?.url) env.REDIS_URL = a.redis.url;
    if (a.salesforce) {
      env.SALESFORCE_CLIENT_ID = a.salesforce.clientId || a.salesforce.client_id;
      env.SALESFORCE_CLIENT_SECRET = a.salesforce.clientSecret || a.salesforce.client_secret;
      env.SALESFORCE_USERNAME = a.salesforce.username;
      env.SALESFORCE_PASSWORD = a.salesforce.password;
      env.SALESFORCE_SECURITY_TOKEN = a.salesforce.securityToken || a.salesforce.security_token;
      if (a.salesforce.instanceUrl) env.SALESFORCE_INSTANCE_URL = a.salesforce.instanceUrl;
      if (a.salesforce.apiVersion) env.SALESFORCE_API_VERSION = a.salesforce.apiVersion;
    }
    if (a.companyCam?.apiToken) env.COMPANYCAM_API_KEY = a.companyCam.apiToken;
    if (a.sentry?.dsn) env.SENTRY_DSN = a.sentry.dsn;
    if (a.jwt?.publicKey) env.JWT_PUBLIC_KEY = a.jwt.publicKey;
    if (a.jwt?.privateKey) env.JWT_PRIVATE_KEY = a.jwt.privateKey;
    if (a.encryption?.key) env.ENCRYPTION_KEY = a.encryption.key;
    if (a.email?.sendgrid_api_key) env.SENDGRID_API_KEY = a.email.sendgrid_api_key;
    return env;
  } catch {
    return {};
  }
}

async function fetchAwsDecomposed(region, prefix) {
  const client = new SecretsManagerClient({ region });
  const env = {};
  async function get(name) {
    try {
      const resp = await client.send(new GetSecretValueCommand({ SecretId: `${prefix}/${name}` }));
      return resp.SecretString ? JSON.parse(resp.SecretString) : null;
    } catch {
      return null;
    }
  }
  const [db, redis, app, salesforce, companycam, monitoring, email] = await Promise.all([
    get('database'),
    get('redis'),
    get('app'),
    get('salesforce'),
    get('companycam'),
    get('monitoring'),
    get('email'),
  ]);
  if (db?.host) env.DATABASE_URL = `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}${db.ssl ? '?sslmode=require' : ''}`;
  if (redis?.host) env.REDIS_URL = `redis://:${redis.password}@${redis.host}:${redis.port}/${redis.db ?? 0}`;
  if (app?.jwt_secret) env.JWT_SECRET = app.jwt_secret;
  if (app?.encryption_key) env.ENCRYPTION_KEY = app.encryption_key;
  if (salesforce?.client_id) {
    env.SALESFORCE_CLIENT_ID = salesforce.client_id;
    env.SALESFORCE_CLIENT_SECRET = salesforce.client_secret;
    env.SALESFORCE_USERNAME = salesforce.username;
    env.SALESFORCE_PASSWORD = salesforce.password;
    env.SALESFORCE_SECURITY_TOKEN = salesforce.security_token;
    env.SALESFORCE_LOGIN_URL = salesforce.login_url;
    env.SALESFORCE_API_VERSION = salesforce.api_version;
  }
  if (companycam?.api_key) env.COMPANYCAM_API_KEY = companycam.api_key;
  if (monitoring?.sentry_dsn) env.SENTRY_DSN = monitoring.sentry_dsn;
  if (email?.sendgrid_api_key) env.SENDGRID_API_KEY = email.sendgrid_api_key;
  return env;
}

async function fetchInfisicalViaToken() {
  try {
    if (!process.env.INFISICAL_TOKEN) return {};
    // Lazy import to avoid requiring package if not needed
    const { InfisicalClient } = require('@infisical/sdk');
    const client = new InfisicalClient({ token: process.env.INFISICAL_TOKEN });
    const all = await client.getAllSecrets();
    const env = {};
    for (const s of all) env[s.key] = s.value;
    return env;
  } catch {
    return {};
  }
}

function fetchInfisicalViaCli() {
  try {
    execSync('command -v infisical', { stdio: 'ignore' });
  } catch {
    return {};
  }
  try {
    const json = execSync('infisical run --env=prod -- node -e "console.log(JSON.stringify(process.env))"', { encoding: 'utf8' });
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function mergeEnvs(...sources) {
  const out = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src || {})) {
      if (v !== undefined && v !== null && v !== '' && out[k] === undefined) out[k] = v;
    }
  }
  return out;
}

function summarize(env) {
  return {
    database: !!env.DATABASE_URL,
    redis: !!env.REDIS_URL,
    jwtKeys: !!(env.JWT_PUBLIC_KEY && env.JWT_PRIVATE_KEY) || !!env.JWT_SECRET,
    encryption: !!env.ENCRYPTION_KEY,
    salesforce: REQUIRED.salesforce.every((k) => !!env[k]),
    companycam: !!env.COMPANYCAM_API_KEY,
    email: !!env.SENDGRID_API_KEY || (!!env.SMTP_HOST && !!env.SMTP_PORT && !!env.SMTP_USER),
    monitoring: !!env.SENTRY_DSN,
  };
}

(async () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const aggregatedName = process.env.AWS_SECRETS_MANAGER_SECRET_NAME || `${process.env.AWS_SECRETS_PREFIX || 'paintbox'}/secrets`;

  const fromAwsAgg = await fetchAwsAggregated(region, aggregatedName);
  const fromAwsDec = await fetchAwsDecomposed(region, process.env.AWS_SECRETS_PREFIX || 'paintbox');
  const fromInfisicalToken = await fetchInfisicalViaToken();
  const fromInfisicalCli = fetchInfisicalViaCli();

  const merged = mergeEnvs(fromAwsAgg, fromAwsDec, fromInfisicalToken, fromInfisicalCli, process.env);
  const coverage = summarize(merged);

  console.log(JSON.stringify({ coverage, hints: {
    needInfisicalToken: Object.values(coverage).some(v => v === false) && !process.env.INFISICAL_TOKEN,
    suggestEnv: {
      AWS_REGION: region,
      AWS_SECRETS_PREFIX: process.env.AWS_SECRETS_PREFIX || 'paintbox',
      AWS_SECRETS_MANAGER_SECRET_NAME: aggregatedName,
      INFISICAL_TOKEN: '<paste_service_token_here_if_using_Infisical>'
    }
  } }, null, 2));
})();


