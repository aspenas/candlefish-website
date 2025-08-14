#!/usr/bin/env node

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function main() {
  const region = process.env.AWS_REGION || 'us-west-2';
  const prefix = process.env.AWS_SECRETS_PREFIX || 'paintbox/production';

  console.log('🔐 Verifying AWS Secrets Manager integration...');
  console.log(`   Region: ${region}`);
  console.log(`   Prefix: ${prefix}`);

  const client = new SecretsManagerClient({ region });

  async function fetchJson(name) {
    try {
      const id = `${prefix}/${name}`;
      const resp = await client.send(new GetSecretValueCommand({ SecretId: id }));
      if (!resp.SecretString) throw new Error(`Secret has no string value: ${id}`);
      return JSON.parse(resp.SecretString);
    } catch (e) {
      return { __error: e };
    }
  }

  // Try aggregated secret first: `${prefix}/secrets`
  const aggregated = await fetchJson('secrets');
  let summary;
  if (!aggregated.__error && aggregated && typeof aggregated === 'object') {
    const a = aggregated;
    summary = {
      database: !!(a.database && (a.database.url || (a.database.host && a.database.password))),
      redis: !!(a.redis && (a.redis.url || a.redis.password)),
      jwt: !!(a.jwt && (a.jwt.publicKey || a.jwt_private || a.jwt_secret)),
      encryption: !!(a.encryption && (a.encryption.key || a.encryption_key)),
      salesforce: !!(a.salesforce && (a.salesforce.clientId || a.salesforce.client_id)),
      companycam: !!(a.companyCam && (a.companyCam.apiToken || a.companyCam.api_key)),
      email: !!(a.email && (a.email.sendgrid_api_key || a.email.smtp_host)),
      monitoring: !!(a.sentry?.dsn || a.monitoring?.sentry_dsn || a.monitoring?.datadog_api_key),
    };
  } else {
    // Fallback to decomposed secrets
    const [db, redis, app, salesforce, companycam, monitoring, email] = await Promise.all([
      fetchJson('database'),
      fetchJson('redis'),
      fetchJson('app'),
      fetchJson('salesforce'),
      fetchJson('companycam'),
      fetchJson('monitoring'),
      fetchJson('email'),
    ]);
    summary = {
      database: !db.__error,
      redis: !redis.__error,
      jwt: !app.__error && !!app.jwt_secret,
      encryption: !app.__error && !!app.encryption_key,
      salesforce: !salesforce.__error && !!salesforce.client_id,
      companycam: !companycam.__error && !!companycam.api_key,
      email: !email.__error && (!!email.sendgrid_api_key || !!email.smtp_host),
      monitoring: !monitoring.__error && (!!monitoring.sentry_dsn || !!monitoring.datadog_api_key),
    };
  }

  console.log('✅ Secrets summary (non-sensitive):');
  console.log(JSON.stringify(summary, null, 2));

  const criticalOk = summary.database && summary.redis && summary.jwt && summary.encryption;
  if (!criticalOk) {
    console.warn('⚠️  Some critical secrets are missing');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('❌ Failed to verify secrets:', err && err.message ? err.message : err);
  process.exit(1);
});
