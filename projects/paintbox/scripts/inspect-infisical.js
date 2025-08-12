#!/usr/bin/env node

// Lists candidate Infisical keys for JWT, email, and monitoring without exposing values

(async function main() {
  try {
    if (!process.env.INFISICAL_TOKEN) {
      console.error('Missing INFISICAL_TOKEN');
      process.exit(1);
    }

    // Support both default and named exports
    let Infisical = require('@infisical/sdk');
    Infisical = Infisical.default || Infisical;
    const client = new Infisical({ token: process.env.INFISICAL_TOKEN });
    const secrets = await client.getAllSecrets();
    const keys = secrets.map((s) => s.key);

    const find = (re) => keys.filter((k) => re.test(k)).sort();

    const results = {
      jwtCandidates: find(/JWT|PRIVATE.*KEY|PUBLIC.*KEY|RSA|JW(T|S)/i),
      emailCandidates: find(/SENDGRID|SMTP|MAIL|EMAIL/i),
      monitoringCandidates: find(/SENTRY|DATADOG|DD_API|NEWRELIC|NR_|HONEYBADGER/i),
    };

    console.log(
      JSON.stringify(
        {
          counts: {
            total: keys.length,
            jwt: results.jwtCandidates.length,
            email: results.emailCandidates.length,
            monitoring: results.monitoringCandidates.length,
          },
          candidates: results,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error('Failed to inspect Infisical:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();


