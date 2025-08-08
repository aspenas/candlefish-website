# Claude Review System - User Guide

## Overview

The enhanced Claude review system provides intelligent, cost-effective PR reviews with multiple modes and configurations.

## Quick Start

### Basic Review Commands

Add these comments to any PR to trigger a review:

- `/claude-review` - Standard comprehensive review
- `/claude-review quick` - Fast review for obvious issues only
- `/claude-review deep` - In-depth analysis including architecture
- `/claude-review security` - Security-focused review
- `/claude-review performance` - Performance optimization review
- `/claude-review incremental` - Only review changes since last Claude review

### Combining Options

You can combine multiple options:

- `/claude-review quick incremental` - Quick review of new changes only
- `/claude-review deep security` - Deep security-focused review
- `/claude-review quick skip:*.test.js,*.spec.ts` - Skip test files

## Review Depths Explained

### Quick Review

- **Max files**: 20
- **Focus**: Critical bugs, security issues, syntax errors
- **Skips**: Tests and documentation
- **Use when**: You need a fast sanity check

### Standard Review (Default)

- **Max files**: 50
- **Focus**: Bugs, security, performance, best practices
- **Includes**: Source code and tests
- **Use when**: Regular PR reviews

### Deep Review

- **Max files**: 200
- **Focus**: Everything including architecture and design
- **Includes**: All files including documentation
- **Use when**: Major features or refactoring

## Cost Management

### Viewing Costs

Each review shows:

- Input/output token counts
- Estimated cost
- Review duration

### Cost Reports

- **Daily reports**: Automated issues with cost breakdowns
- **On-demand**: Run the "Claude Cost Report" workflow
- **Slack integration**: Get daily summaries in Slack

### Cost Optimization Tips

1. **Use incremental reviews** for PR updates
2. **Use quick reviews** for small changes
3. **Skip generated files** with patterns
4. **Batch reviews** for multiple small PRs

## Advanced Features

### File Filtering

Skip files by pattern:

```
/claude-review skip:*.generated.ts,dist/*,*.min.js
```

Default skip patterns include:

- Lock files (`*.lock`, `package-lock.json`)
- Minified files (`*.min.js`, `*.min.css`)
- Build outputs (`dist/*`, `build/*`)
- Generated files (`*.generated.*`)
- Binary files (images, fonts)

### Incremental Reviews

When a PR is updated after a review:

```
/claude-review incremental
```

This only reviews files changed since the last Claude review, saving tokens and cost.

### Batch Reviews

Review multiple PRs efficiently:

1. Go to Actions → "Claude Batch PR Review"
2. Enter PR numbers: `123,124,125`
3. Select review type and depth
4. Run workflow

The system will:

- Review PRs concurrently (respecting rate limits)
- Skip recently reviewed PRs
- Generate a cost summary
- Create individual review comments

## Review Types

### Comprehensive (Default)

- Code quality and best practices
- Bug detection
- Security analysis
- Performance considerations
- Test coverage
- Documentation needs

### Security

- Input validation
- Authentication/authorization
- Data exposure
- Common vulnerabilities
- Dependency security

### Performance

- Algorithm efficiency
- Database optimization
- Memory management
- Caching opportunities
- Bundle size impact

### Architecture

- Design patterns
- SOLID principles
- Code organization
- API design
- Dependency management

## Workflow Triggers

### Automatic

- New PR opened (comprehensive review)
- PR marked ready for review
- PR synchronized (if significant changes)

### Manual

- PR comments with `/claude-review`
- GitHub Actions workflow dispatch
- Batch review workflow

## Best Practices

1. **For new features**: Use standard or deep review
2. **For bug fixes**: Use quick review with security focus
3. **For updates**: Use incremental review
4. **For refactoring**: Use deep review with architecture focus
5. **For dependencies**: Use security review

## Monitoring & Limits

### Rate Limits (Tier 4)

- **Input**: 2M tokens/minute
- **Output**: 400K tokens/minute
- **Per request**: 32K output tokens max

### Monitoring

- Cost tracking in DynamoDB
- Daily cost reports
- Per-PR cost attribution
- Monthly summaries

## Troubleshooting

### Review not triggering?

- Check PR is not in draft mode
- Ensure comment contains `/claude-review`
- Verify GitHub Actions are enabled

### Review incomplete?

- Check if file count exceeds depth limit
- Large files may be truncated
- Use deep review for comprehensive analysis

### High costs?

- Use incremental reviews
- Apply file filters
- Use appropriate review depth
- Consider batching small PRs

## Examples

### Quick security check for hotfix

```
/claude-review quick security
```

### Deep review for new feature

```
/claude-review deep incremental
```

### Skip all test files

```
/claude-review skip:*.test.js,*.spec.ts,__tests__/*
```

### Architecture review for refactoring

```
/claude-review architecture deep
```

## Cost Estimates

| Review Type | Typical Cost | Files | Tokens |
|------------|--------------|-------|---------|
| Quick | $0.10-0.30 | <20 | ~50K |
| Standard | $0.30-1.00 | <50 | ~200K |
| Deep | $1.00-3.00 | <200 | ~500K |
| Incremental | 50% of full | Varies | Varies |

*Costs based on Opus-4 pricing: $15/1M input, $75/1M output tokens*
