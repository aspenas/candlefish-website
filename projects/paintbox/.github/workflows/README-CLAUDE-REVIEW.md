# Claude Auto Review for GitHub Actions

This repository includes three different Claude review workflows, each with increasing sophistication:

## Workflows

### 1. `claude-auto-review.yml` - Basic Implementation

- Simple Claude review using Python script
- AWS Secrets Manager integration
- Posts review as PR comment
- Good for basic code review needs

### 2. `claude-pr-review-advanced.yml` - Advanced Implementation

- Multiple review types (comprehensive, security, performance, quick)
- Retry logic and error handling
- Rich formatting with severity ratings
- Commit status updates
- Supports manual triggers via comments

### 3. `claude-official-review.yml` - Official Anthropic Action (Recommended)

- Uses official `anthropics/claude-code-action@beta`
- Most reliable and maintained
- Direct integration with Claude API
- Inline code review comments
- Best performance and features

## Setup Instructions

### Prerequisites

1. **AWS Account** with:
   - Access to AWS Secrets Manager
   - IAM permissions to create roles and policies
   - OIDC provider configured for GitHub Actions

2. **Anthropic API Key**
   - Get from: <https://console.anthropic.com/account/keys>
   - Requires active Claude API subscription

3. **GitHub Repository** with:
   - Actions enabled
   - Permissions to add secrets

### Quick Setup

1. **Run the setup script:**

   ```bash
   ./.github/scripts/setup-claude-review.sh
   ```

   This will:
   - Create AWS Secrets Manager secret for your API key
   - Set up IAM role for GitHub Actions
   - Configure GitHub repository secrets

2. **Choose and enable a workflow:**
   - For production use: Use `claude-official-review.yml`
   - For customization: Use `claude-pr-review-advanced.yml`
   - For simplicity: Use `claude-auto-review.yml`

3. **Test the setup:**
   - Create a test PR
   - The review should run automatically
   - Or comment `/claude-review` on any PR

### Manual Setup

If you prefer manual setup or the script fails:

#### 1. Store API Key in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "candlefish-ai/anthropic/api-key" \
  --secret-string '{"ANTHROPIC_API_KEY":"your-api-key-here"}' \
  --region us-east-1
```

#### 2. Create IAM Role for GitHub Actions

Create a role with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
      }
    }
  }]
}
```

Attach this policy to the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ],
    "Resource": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:candlefish-ai/anthropic/api-key*"
  }]
}
```

#### 3. Add GitHub Secret

Add the role ARN as a repository secret:

- Name: `AWS_ROLE_ARN`
- Value: `arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-claude-review`

## Usage

### Automatic Reviews

Reviews run automatically on:

- New pull requests
- Updates to existing PRs
- When PRs are reopened

### Manual Triggers

Comment on any PR with:

- `/claude-review` - Comprehensive review (default)
- `/claude-review security` - Security-focused review
- `/claude-review performance` - Performance optimization review
- `/claude-review quick` - Quick review for urgent PRs

### Workflow Dispatch

Manually trigger via GitHub Actions UI:

1. Go to Actions tab
2. Select the workflow
3. Click "Run workflow"
4. Enter PR number

## Configuration

### Review Types

#### Comprehensive (Default)

- Code quality and best practices
- Bug detection
- Performance analysis
- Security review
- Test coverage
- Documentation

#### Security Focus

- Input validation
- Authentication/authorization
- Common vulnerabilities
- Dependency security
- Data protection

#### Performance Focus

- Algorithm efficiency
- Database optimization
- Frontend performance
- Caching opportunities
- Memory management

#### Quick Review

- Critical bugs only
- Major security issues
- Obvious problems
- Minimal feedback

### Customization

Edit the `direct_prompt` in workflows to customize:

- Review focus areas
- Severity ratings
- Output format
- Language/framework specific checks

## Troubleshooting

### Common Issues

1. **"Failed to retrieve API key"**
   - Check AWS credentials configuration
   - Verify secret exists in Secrets Manager
   - Ensure IAM role has correct permissions

2. **"Rate limit exceeded"**
   - Claude API has rate limits
   - Reduce review frequency
   - Use quick reviews for minor changes

3. **"Review not posting"**
   - Check GitHub token permissions
   - Verify PR number is correct
   - Check workflow logs for errors

### Debug Commands

Check AWS secret:

```bash
aws secretsmanager get-secret-value \
  --secret-id "candlefish-ai/anthropic/api-key" \
  --region us-east-1
```

Test IAM role:

```bash
aws sts assume-role \
  --role-arn "arn:aws:iam::YOUR_ACCOUNT_ID:role/github-actions-claude-review" \
  --role-session-name test-session \
  --web-identity-token "test-token"
```

## Best Practices

1. **Use appropriate review types**
   - Don't use comprehensive reviews for typo fixes
   - Use security reviews for auth/API changes
   - Quick reviews for urgent hotfixes

2. **Manage costs**
   - Claude API usage has costs
   - Consider PR size before reviewing
   - Skip reviews for documentation-only changes

3. **Review the reviews**
   - Claude suggestions should be validated
   - Not all feedback may be applicable
   - Use as a supplementary tool, not replacement

## Security Considerations

- API keys are stored in AWS Secrets Manager
- GitHub Actions uses OIDC for AWS authentication
- No credentials are exposed in logs (masked)
- Reviews are public PR comments

## Support

- Issues: Create a GitHub issue
- Updates: Watch for workflow updates
- Anthropic: Check API status at status.anthropic.com

## License

These workflows are provided as-is under the same license as the repository.
