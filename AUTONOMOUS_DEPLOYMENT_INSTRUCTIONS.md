# Autonomous Prompt Engineering Deployment - Instructions

## ✅ Deployment System Successfully Implemented

The autonomous deployment system has been successfully created and committed to your repository. The workflow is now active and ready to use.

## 📋 Components Created

1. **GitHub Actions Workflow**: `.github/workflows/autonomous-deployment.yml`
2. **Deployment Script**: `brand/website/scripts/autonomous-deploy.sh`
3. **API Documentation**: `brand/website/api-docs/` and `brand/website/docs/api/`

## 🚀 How to Trigger the Deployment

### Option 1: GitHub Web Interface (Recommended)

1. Navigate to your repository: https://github.com/candlefish-ai/candlefish-ai
2. Click on the **Actions** tab
3. Select **"Autonomous Prompt Engineering Deployment"** from the left sidebar
4. Click **"Run workflow"** button
5. Select the following options:
   - **Platform**: `all` (deploys web, mobile, and API)
   - **Deployment mode**: `autonomous`
   - **Use maximum tokens**: `true`
6. Click **"Run workflow"** to start

### Option 2: GitHub CLI (After Token Update)

If you need to update your GitHub token with workflow permissions:

```bash
# Update GitHub token with workflow scope
gh auth refresh -s workflow

# Then trigger the deployment
gh workflow run "Autonomous Prompt Engineering Deployment" \
  -f platform=all \
  -f deployment-mode=autonomous \
  -f use-max-tokens=true
```

### Option 3: Direct API Call

```bash
# Using curl with a personal access token that has workflow permissions
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/candlefish-ai/candlefish-ai/actions/workflows/184638683/dispatches \
  -d '{"ref":"main","inputs":{"platform":"all","deployment-mode":"autonomous","use-max-tokens":"true"}}'
```

## 📊 Monitoring the Deployment

### View Workflow Progress

```bash
# Check latest runs
gh run list --workflow="Autonomous Prompt Engineering Deployment"

# Watch a specific run
gh run watch [RUN_ID]

# View run logs
gh run view [RUN_ID] --log
```

### View in GitHub UI

1. Go to https://github.com/candlefish-ai/candlefish-ai/actions
2. Click on the running workflow
3. Monitor real-time logs and progress

## 🔧 AWS Secrets Required

Ensure these secrets exist in AWS Secrets Manager (Region: us-east-1):

### Deployment Credentials
- `candlefish/deployment/vercel-api`
- `candlefish/deployment/netlify-api`
- `candlefish/deployment/github-pat`

### Database Credentials
- `candlefish/database/postgres-primary`
- `candlefish/database/redis-cluster`

### Mobile App Credentials
- `candlefish/mobile/expo-token`
- `candlefish/mobile/apple-id`
- `candlefish/mobile/apple-app-password`

### Monitoring
- `candlefish/monitoring/datadog-key`
- `candlefish/monitoring/sentry-dsn`

### Certificates (S3 Bucket)
- `s3://candlefish-certificates/ios/dist.p12`
- `s3://candlefish-certificates/android/release.keystore`

## ✅ Validation Checklist

After deployment, the system automatically validates:

- [ ] Web platform accessible at https://app.candlefish.ai
- [ ] API health endpoint at https://api.candlefish.ai/health
- [ ] WebSocket connection at wss://ws.candlefish.ai
- [ ] Mobile builds submitted to TestFlight/Play Console
- [ ] CloudWatch dashboards created
- [ ] DataDog monitoring active
- [ ] CDN distribution configured
- [ ] SSL certificates valid

## 📈 Expected Timeline

- **Credential Validation**: ~30 seconds
- **Web Deployment**: 3-5 minutes
- **Mobile Build**: 10-15 minutes
- **API Deployment**: 5-7 minutes
- **Monitoring Setup**: 1-2 minutes
- **Total Time**: ~20-30 minutes

## 🔍 Troubleshooting

### If Deployment Fails

1. Check GitHub Actions logs for specific errors
2. Verify AWS credentials are correctly set
3. Ensure all required secrets exist in AWS Secrets Manager
4. Check AWS service quotas aren't exceeded

### Manual Rollback

```bash
# Rollback web deployment
vercel rollback --token=$VERCEL_TOKEN

# Rollback API Gateway
aws apigatewayv2 update-stage \
  --api-id [API_ID] \
  --stage-name production \
  --deployment-id [PREVIOUS_DEPLOYMENT_ID]

# Rollback Lambda functions
for function in $(aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'candlefish-')].FunctionName" --output text); do
  aws lambda update-function-code \
    --function-name $function \
    --s3-bucket candlefish-lambda-artifacts \
    --s3-key ${function}-previous.zip
done
```

## 📞 Support

- **Logs**: Check CloudWatch Logs group `/aws/candlefish/deployments`
- **Metrics**: View DataDog dashboard at https://app.datadoghq.com
- **Reports**: Deployment reports stored in `s3://candlefish-deployments/reports/`

## 🎯 Next Immediate Step

**Go to GitHub Actions and manually trigger the workflow:**
https://github.com/candlefish-ai/candlefish-ai/actions/workflows/184638683

Click "Run workflow" and select the options as described above.

---

The autonomous deployment system is ready and waiting to be triggered! 🚀