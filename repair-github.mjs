#!/usr/bin/env node
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { execSync } from 'child_process';
import { InfisicalSDK } from '@infisical/sdk';

const secretName = 'candlefish/github/pat';
const infisicalKey = 'GITHUB_PAT';
const repo = 'candlefish-ai';

async function getToken() {
  try {
    const sm = new SecretsManagerClient({});
    const { SecretString } = await sm.send(new GetSecretValueCommand({ SecretId: secretName }));
    return JSON.parse(SecretString).token;
  } catch (awsError) {
    console.log('AWS Secrets Manager failed, trying Infisical...');
    try {
      const infisical = new InfisicalSDK();
      await infisical.auth().universalAuth({
        clientId: process.env.INFISICAL_CLIENT_ID,
        clientSecret: process.env.INFISICAL_CLIENT_SECRET
      });
      const secret = await infisical.secrets().getSecret({
        environment: 'prod',
        secretPath: '/',
        secretName: infisicalKey
      });
      return secret.secretValue;
    } catch (infisicalError) {
      throw new Error('Failed to retrieve token from both AWS and Infisical');
    }
  }
}

async function main() {
  try {
    console.log('1. Retrieving GitHub PAT...');
    const token = await getToken();
    console.log('   ✓ Token retrieved (masked: ***' + token.slice(-4) + ')');

    console.log('2. Unsetting GITHUB_TOKEN env var...');
    delete process.env.GITHUB_TOKEN;

    console.log('3. Re-authenticating gh CLI...');
    execSync(`printf "%s" "${token}" | gh auth login --with-token --hostname github.com`, {
      stdio: 'pipe',
      encoding: 'utf8'
    });

    console.log('4. Verifying authentication...');
    const authStatus = execSync('gh auth status --hostname github.com', { encoding: 'utf8' });
    console.log(authStatus);

    console.log('5. Creating repository...');
    try {
      execSync(`gh repo create ${repo} --public --source=. --remote=origin --push`, {
        cwd: '/Users/patricksmith/candlefish-ai',
        stdio: 'inherit'
      });
      console.log('   ✓ Repository created and code pushed');
    } catch (createError) {
      console.log('   gh create failed, falling back to git...');
      execSync('git remote remove origin || true', { cwd: '/Users/patricksmith/candlefish-ai' });
      execSync(`git remote add origin https://${token}@github.com/patricksmith/${repo}.git`, {
        cwd: '/Users/patricksmith/candlefish-ai'
      });
      execSync('git branch -M main', { cwd: '/Users/patricksmith/candlefish-ai' });
      execSync('git push -u origin main', { cwd: '/Users/patricksmith/candlefish-ai' });
      console.log('   ✓ Code pushed via git fallback');
    }

    console.log('6. Final status:');
    const sha = execSync('git rev-parse HEAD', {
      cwd: '/Users/patricksmith/candlefish-ai',
      encoding: 'utf8'
    }).trim();
    console.log(`   - Latest commit SHA: ${sha}`);
    console.log(`   - Repository URL: https://github.com/patricksmith/${repo}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
