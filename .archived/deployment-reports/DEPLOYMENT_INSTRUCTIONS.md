# Autonomous Deployment Instructions

## Prerequisites Completed
✅ GitHub Actions workflow created at `.github/workflows/autonomous-deployment.yml`
✅ Monitoring script ready at `scripts/monitor-autonomous-deployment.sh`
✅ All production secrets configured in AWS Secrets Manager
✅ Workflow configured for Claude Opus 4.1 with 2M/400K token limits

## Manual Steps Required

### 1. Add AWS Credentials to GitHub Secrets
Go to: https://github.com/candlefish-ai/candlefish-ai/settings/secrets/actions

Add these repository secrets:
- **Name**: `AWS_ACCESS_KEY_ID`
  **Value**: `AKIAZ5G4HRQHZIBGMDNM`

- **Name**: `AWS_SECRET_ACCESS_KEY`
  **Value**: `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`

### 2. Trigger Deployment Manually
Go to: https://github.com/candlefish-ai/candlefish-ai/actions/workflows/autonomous-deployment.yml

Click "Run workflow" and set:
- Platform: `all`
- Deployment Mode: `autonomous`
- Use Max Tokens: `true` (checked)

### 3. Monitor Deployment
Once triggered, run the monitoring script:
```bash
./scripts/monitor-autonomous-deployment.sh
```

## Automated Deployment Features

The workflow will:
1. **Validate AWS Secrets** - Verify all required secrets exist
2. **Configure Monitoring** - Set up DataDog and health checks
3. **Deploy Web Platform** - Deploy frontend to Netlify
4. **Deploy Mobile Platform** - Build and deploy mobile apps
5. **Deploy API Platform** - Deploy GraphQL federation to AWS
6. **Run Integration Tests** - Validate all deployments
7. **Generate Reports** - Create comprehensive deployment documentation

## Expected Outcomes

### Platform Endpoints
- **Web**: https://prompt-engineering.netlify.app
- **API**: https://api.prompt-engineering.candlefish.ai
- **Mobile**: App Store and Play Store releases

### Monitoring Dashboards
- **DataDog**: Real-time metrics and alerts
- **CloudWatch**: AWS infrastructure monitoring
- **Netlify Analytics**: Web platform analytics

### Token Usage (with Max Tokens enabled)
- **Input**: Up to 2,000,000 tokens per minute
- **Output**: Up to 400,000 tokens per minute
- **Model**: Claude Opus 4.1 (claude-opus-4-1-20250805)

## Validation Checklist

After deployment completes:
- [ ] Web platform accessible and responsive
- [ ] API endpoints returning valid GraphQL responses
- [ ] Mobile apps successfully built and deployed
- [ ] All health checks passing
- [ ] Monitoring dashboards showing green status
- [ ] Integration tests passing (>95% success rate)
- [ ] Performance metrics within targets (<2s load time)

## Rollback Procedure

If deployment fails:
1. Check workflow logs for specific errors
2. Run rollback script: `./scripts/rollback-deployment.sh`
3. Restore previous version from backups
4. Investigate and fix issues before retry

## Support

For issues or questions:
- Check workflow logs in GitHub Actions
- Review monitoring dashboard for alerts
- Check AWS CloudWatch for infrastructure issues
- Review deployment report at `reports/deployment-<timestamp>.md`