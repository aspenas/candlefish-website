#!/usr/bin/env node

/**
 * Script to check AWS IAM permissions for the credentials used in Fly.io
 * This helps diagnose why AWS Secrets Manager access is failing
 */

const { 
  STSClient, 
  GetCallerIdentityCommand 
} = require('@aws-sdk/client-sts');
const {
  IAMClient,
  GetUserCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand,
  ListAccessKeysCommand
} = require('@aws-sdk/client-iam');
const { 
  SecretsManagerClient, 
  GetSecretValueCommand,
  ListSecretsCommand 
} = require('@aws-sdk/client-secrets-manager');

async function checkAWSPermissions() {
  console.log('🔍 AWS Permissions Checker for Fly.io Deployment\n');
  console.log('=' .repeat(60));

  // Get credentials from environment (simulating Fly.io environment)
  const accessKeyId = process.env.FLY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.FLY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials not found in environment');
    console.log('\nUsage: Set FLY_AWS_ACCESS_KEY_ID and FLY_AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  const credentials = {
    accessKeyId,
    secretAccessKey
  };

  // Initialize clients
  const stsClient = new STSClient({ region, credentials });
  const iamClient = new IAMClient({ region, credentials });
  const secretsClient = new SecretsManagerClient({ region, credentials });

  try {
    // 1. Check identity
    console.log('\n1️⃣ Checking AWS Identity...');
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    console.log('✅ Identity:', JSON.stringify(identity, null, 2));

    const userName = identity.Arn.split('/').pop();
    
    // 2. Check user details
    console.log('\n2️⃣ Checking IAM User Details...');
    try {
      const getUserCommand = new GetUserCommand({ UserName: userName });
      const user = await iamClient.send(getUserCommand);
      console.log('✅ User:', userName);
      console.log('   Created:', user.User.CreateDate);
      console.log('   ARN:', user.User.Arn);
    } catch (err) {
      console.log('⚠️  Could not get user details (might be using assumed role)');
    }

    // 3. Check attached policies
    console.log('\n3️⃣ Checking Attached Policies...');
    try {
      const policiesCommand = new ListAttachedUserPoliciesCommand({ UserName: userName });
      const policies = await iamClient.send(policiesCommand);
      
      if (policies.AttachedPolicies.length > 0) {
        console.log('✅ Attached Policies:');
        for (const policy of policies.AttachedPolicies) {
          console.log(`   - ${policy.PolicyName} (${policy.PolicyArn})`);
        }
      } else {
        console.log('⚠️  No attached policies found');
      }
    } catch (err) {
      console.log('⚠️  Could not list attached policies:', err.message);
    }

    // 4. Check inline policies
    console.log('\n4️⃣ Checking Inline Policies...');
    try {
      const inlinePoliciesCommand = new ListUserPoliciesCommand({ UserName: userName });
      const inlinePolicies = await iamClient.send(inlinePoliciesCommand);
      
      if (inlinePolicies.PolicyNames.length > 0) {
        console.log('✅ Inline Policies:');
        for (const policyName of inlinePolicies.PolicyNames) {
          console.log(`   - ${policyName}`);
        }
      } else {
        console.log('⚠️  No inline policies found');
      }
    } catch (err) {
      console.log('⚠️  Could not list inline policies:', err.message);
    }

    // 5. Test Secrets Manager access
    console.log('\n5️⃣ Testing Secrets Manager Access...');
    
    // Test listing secrets
    console.log('\n   Testing ListSecrets permission...');
    try {
      const listCommand = new ListSecretsCommand({ MaxResults: 5 });
      const secrets = await secretsClient.send(listCommand);
      console.log(`   ✅ Can list secrets (found ${secrets.SecretList.length} secrets)`);
    } catch (err) {
      console.log(`   ❌ Cannot list secrets: ${err.message}`);
    }

    // Test getting the specific secret
    console.log('\n   Testing GetSecretValue for paintbox/production/jwt/public-keys...');
    try {
      const getSecretCommand = new GetSecretValueCommand({
        SecretId: 'paintbox/production/jwt/public-keys'
      });
      const secret = await secretsClient.send(getSecretCommand);
      console.log('   ✅ Can retrieve paintbox/production/jwt/public-keys');
      
      // Parse and validate the secret
      const publicKeys = JSON.parse(secret.SecretString);
      const keyCount = Object.keys(publicKeys).length;
      console.log(`   ✅ Secret contains ${keyCount} key(s)`);
    } catch (err) {
      console.log(`   ❌ Cannot retrieve secret: ${err.message}`);
      console.log(`      Error Code: ${err.Code || err.name}`);
      
      // Check if it's a permissions issue
      if (err.name === 'AccessDeniedException') {
        console.log('\n   🔴 PERMISSION DENIED - User lacks GetSecretValue permission');
        console.log('      Required Action: secretsmanager:GetSecretValue');
        console.log('      Required Resource: arn:aws:secretsmanager:*:*:secret:paintbox/*');
      }
    }

    // 6. Test other paintbox secrets
    console.log('\n6️⃣ Testing Access to Other Paintbox Secrets...');
    const secretsToTest = [
      'paintbox/production/app',
      'paintbox/production/database',
      'paintbox/production/redis'
    ];

    for (const secretId of secretsToTest) {
      try {
        const command = new GetSecretValueCommand({ SecretId: secretId });
        await secretsClient.send(command);
        console.log(`   ✅ ${secretId}`);
      } catch (err) {
        console.log(`   ❌ ${secretId}: ${err.message}`);
      }
    }

    // 7. Check access keys
    console.log('\n7️⃣ Checking Access Keys...');
    try {
      const keysCommand = new ListAccessKeysCommand({ UserName: userName });
      const keys = await iamClient.send(keysCommand);
      console.log(`✅ Found ${keys.AccessKeyMetadata.length} access key(s)`);
      for (const key of keys.AccessKeyMetadata) {
        console.log(`   - ${key.AccessKeyId} (Status: ${key.Status}, Created: ${key.CreateDate})`);
      }
    } catch (err) {
      console.log('⚠️  Could not list access keys:', err.message);
    }

  } catch (error) {
    console.error('\n❌ Error checking permissions:', error);
    console.error('Error details:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📋 Summary of Issues:\n');
  console.log('If the user cannot access Secrets Manager, you need to:');
  console.log('1. Create or update an IAM policy with secretsmanager:GetSecretValue permission');
  console.log('2. Attach the policy to the user');
  console.log('3. Ensure the policy includes the resource: arn:aws:secretsmanager:*:*:secret:paintbox/*');
  console.log('\nExample policy:');
  console.log(JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      Resource: "arn:aws:secretsmanager:*:*:secret:paintbox/*"
    }]
  }, null, 2));
}

// Run the checker
checkAWSPermissions().catch(console.error);