# GitHub Actions Security Audit Report - Candlefish AI

**Audit Date:** 2025-08-12  
**Auditor:** Security Specialist (Claude Opus 4.1)  
**Severity Levels:** CRITICAL | HIGH | MEDIUM | LOW | INFO

## Executive Summary

The security audit of Candlefish AI's GitHub Actions workflows revealed several security vulnerabilities and areas for improvement. While the implementation shows security awareness with OIDC authentication and security scanning tools, there are critical vulnerabilities that require immediate attention.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. Exposed AWS Account ID in Workflow Files
**Severity:** CRITICAL  
**OWASP:** A01:2021 - Broken Access Control  
**Location:** Multiple workflow files  
**Finding:** AWS Account ID is exposed through `${{ secrets.AWS_ACCOUNT_ID }}` in environment variables and IAM role ARNs.

```yaml
# Line 66 in candlefish-orchestrator.yml
AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}

# Lines 101, 255, 561
role-to-assume: arn:aws:iam::${{ env.AWS_ACCOUNT_ID }}:role/github-actions-candlefish
```

**Risk:** While AWS Account IDs are not strictly secret, exposing them increases the attack surface for targeted attacks.

**Remediation:**
1. Store complete IAM role ARNs as secrets:
```yaml
# Instead of:
role-to-assume: arn:aws:iam::${{ env.AWS_ACCOUNT_ID }}:role/github-actions-candlefish

# Use:
role-to-assume: ${{ secrets.AWS_GITHUB_ROLE_ARN }}
```

### 2. Insecure Secrets Handling in secrets-sync.yml
**Severity:** CRITICAL  
**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `.github/workflows/secrets-sync.yml` lines 58-59  
**Finding:** Secrets are written to unencrypted file before processing

```yaml
# Line 58: Storing secrets in plaintext file
echo "${github_key}=${value}" >> secrets.env
```

**Risk:** Secrets exposed in plaintext on runner filesystem, potential for exposure in logs or artifacts.

**Remediation:**
```yaml
# Use environment variables with proper masking
- name: Fetch and sync secrets
  run: |
    # Use process substitution to avoid file storage
    while IFS= read -r secret_name; do
      aws secretsmanager get-secret-value \
        --secret-id "$secret_name" \
        --query SecretString \
        --output text | jq -r 'to_entries[] | "\(.key)=\(.value)"' | \
      while IFS='=' read -r key value; do
        echo "::add-mask::$value"
        echo "${key}=${value}" >> $GITHUB_ENV
      done
    done < <(printf '%s\n' "${SECRETS[@]}")
```

---

## 🟠 HIGH SEVERITY ISSUES

### 3. Overly Broad Workflow Permissions
**Severity:** HIGH  
**OWASP:** A04:2021 - Insecure Design  
**Location:** `candlefish-orchestrator.yml` lines 43-49  
**Finding:** Workflow has write permissions to multiple sensitive areas

```yaml
permissions:
  contents: read
  id-token: write  # AWS OIDC
  checks: write
  pull-requests: write
  actions: write
  packages: write
```

**Risk:** Compromised workflow could modify code, packages, and other workflows.

**Remediation:**
```yaml
# Use minimal permissions per job
jobs:
  build:
    permissions:
      contents: read
      id-token: write  # Only for AWS authentication
  
  deploy:
    permissions:
      id-token: write
      deployments: write
```

### 4. Missing Input Validation for workflow_dispatch
**Severity:** HIGH  
**OWASP:** A03:2021 - Injection  
**Location:** `candlefish-orchestrator.yml` lines 6-25  
**Finding:** Project names from workflow_dispatch are used in shell commands without validation

```yaml
# Line 119: Unvalidated input used in conditions
if [[ "${{ github.event.inputs.projects }}" == "all" ]]; then
```

**Risk:** Command injection vulnerability through malicious project names.

**Remediation:**
```yaml
- name: Validate inputs
  run: |
    # Sanitize and validate project input
    PROJECT_INPUT="${{ github.event.inputs.projects }}"
    
    # Allow only alphanumeric, comma, hyphen
    if [[ ! "$PROJECT_INPUT" =~ ^[a-zA-Z0-9,-]+$ ]]; then
      echo "Error: Invalid project input"
      exit 1
    fi
    
    # Validate against allowed projects
    ALLOWED_PROJECTS="website,analytics,collab,paintbox,promoter"
    for project in ${PROJECT_INPUT//,/ }; do
      if [[ ! "$ALLOWED_PROJECTS" =~ "$project" ]]; then
        echo "Error: Unknown project: $project"
        exit 1
      fi
    done
```

### 5. Insufficient IAM Role Trust Policy Restrictions
**Severity:** HIGH  
**OWASP:** A01:2021 - Broken Access Control  
**Issue:** IAM roles lack branch and environment restrictions

**Current Trust Policy (Inferred):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:patricksmith/candlefish-ai:*"
      }
    }
  }]
}
```

**Remediation:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": [
          "repo:patricksmith/candlefish-ai:ref:refs/heads/main",
          "repo:patricksmith/candlefish-ai:environment:production"
        ]
      }
    }
  }]
}
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 6. Third-Party Actions Without Version Pinning
**Severity:** MEDIUM  
**OWASP:** A06:2021 - Vulnerable and Outdated Components  
**Finding:** Actions use major version tags instead of commit SHAs

```yaml
uses: actions/checkout@v4
uses: aws-actions/configure-aws-credentials@v4
uses: aquasecurity/trivy-action@master  # Especially dangerous
```

**Risk:** Supply chain attacks through compromised actions.

**Remediation:**
```yaml
# Pin to specific commit SHA
uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502  # v4.0.2
uses: aquasecurity/trivy-action@2b6a709cf9c4025c5438e98b5a3e583f0e89a9cc  # v0.16.1
```

### 7. Secrets in Environment Variables
**Severity:** MEDIUM  
**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** Multiple workflows  
**Finding:** Secrets exposed as environment variables

```yaml
# Line 60
TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

**Risk:** Secrets may be exposed in process listings or debug logs.

**Remediation:**
```yaml
# Pass secrets only to specific steps that need them
- name: Build with Turbo
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  run: pnpm turbo build
```

### 8. Weak Chaos Engineering Controls
**Severity:** MEDIUM  
**Location:** `candlefish-orchestrator.yml` lines 405-535  
**Finding:** Chaos experiments run with minimal safety controls

**Remediation:**
```yaml
- name: Run chaos experiment with safety controls
  run: |
    # Set blast radius limits
    export CHAOS_MAX_PODS=2
    export CHAOS_DURATION="30s"
    export CHAOS_NAMESPACE="chaos-testing"
    
    # Implement circuit breaker
    if [ $(kubectl get pods -n production | grep -c "Running") -lt 3 ]; then
      echo "Insufficient healthy pods, skipping chaos test"
      exit 0
    fi
```

---

## 🟢 LOW SEVERITY ISSUES

### 9. Missing CODEOWNERS File
**Severity:** LOW  
**Finding:** No CODEOWNERS file for workflow approval requirements

**Remediation:**
Create `.github/CODEOWNERS`:
```
# GitHub Actions workflows require security team approval
.github/workflows/ @patricksmith/security-team
.github/actions/ @patricksmith/security-team

# Infrastructure changes
terraform/ @patricksmith/infrastructure-team
```

### 10. Insufficient Logging for Security Events
**Severity:** LOW  
**Finding:** No structured logging for security-relevant events

**Remediation:**
```yaml
- name: Log security event
  run: |
    echo "::notice title=Security Event::Deployment to ${{ matrix.environment }} by ${{ github.actor }}"
    
    # Send to SIEM
    curl -X POST "${{ secrets.SIEM_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{
        "event": "deployment",
        "environment": "${{ matrix.environment }}",
        "actor": "${{ github.actor }}",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }'
```

---

## ✅ POSITIVE SECURITY FINDINGS

1. **OIDC Authentication:** Proper use of GitHub OIDC for AWS authentication
2. **Security Scanning:** Integration of Trivy, TruffleHog, and Semgrep
3. **Environment Separation:** Clear separation between dev/staging/production
4. **Automated Rollback:** Deployment rollback on failure
5. **Cost Controls:** Budget tracking and limits

---

## 📋 SECURITY CHECKLIST

### Immediate Actions (Complete within 48 hours)
- [ ] Remove AWS Account ID from workflow files
- [ ] Fix secrets handling in secrets-sync.yml
- [ ] Implement input validation for workflow_dispatch
- [ ] Restrict IAM trust policies to specific branches

### Short-term Actions (Complete within 1 week)
- [ ] Pin all third-party actions to commit SHAs
- [ ] Implement job-level permission restrictions
- [ ] Add CODEOWNERS file with security team approval
- [ ] Limit environment variable exposure for secrets

### Long-term Actions (Complete within 1 month)
- [ ] Implement structured security logging
- [ ] Add workflow security testing in CI
- [ ] Implement secret rotation automation
- [ ] Add security policy compliance checks

---

## 🔒 RECOMMENDED SECURITY HEADERS

Add to all deployed applications:
```nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

---

## 🧪 SECURITY TEST CASES

### Test 1: OIDC Token Validation
```bash
# Verify OIDC token contains expected claims
- name: Validate OIDC token
  run: |
    TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
      "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r '.value')
    
    # Decode and validate token claims
    PAYLOAD=$(echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null)
    
    # Verify repository claim
    if [[ $(echo $PAYLOAD | jq -r '.repository') != "patricksmith/candlefish-ai" ]]; then
      echo "Invalid repository in token"
      exit 1
    fi
```

### Test 2: Secret Masking Verification
```yaml
- name: Test secret masking
  run: |
    # This should not appear in logs
    echo "::add-mask::${{ secrets.TEST_SECRET }}"
    
    # Verify masking works
    echo "Secret value: ${{ secrets.TEST_SECRET }}"  # Should show ***
```

### Test 3: Permission Boundary Test
```yaml
- name: Test permission boundaries
  run: |
    # Should fail if permissions are correctly restricted
    aws iam create-user --user-name test-unauthorized 2>&1 | \
      grep -q "AccessDenied" || exit 1
```

---

## 📊 RISK MATRIX

| Vulnerability | Likelihood | Impact | Risk Score | Priority |
|--------------|------------|--------|------------|----------|
| Exposed AWS Account ID | High | Medium | HIGH | P1 |
| Insecure Secrets Handling | Medium | Critical | CRITICAL | P0 |
| Broad Permissions | Medium | High | HIGH | P1 |
| Input Validation | Low | High | MEDIUM | P2 |
| IAM Trust Policy | Medium | High | HIGH | P1 |
| Action Pinning | High | Medium | MEDIUM | P2 |

---

## 🔄 CONTINUOUS SECURITY IMPROVEMENTS

1. **Weekly Security Reviews:** Review workflow changes for security implications
2. **Monthly Dependency Updates:** Update and audit action dependencies
3. **Quarterly Security Assessments:** Full security audit of CI/CD pipeline
4. **Automated Security Testing:** Add security checks to PR validation

---

## 📚 REFERENCES

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [AWS IAM OIDC Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Contact

For questions about this security audit, please contact the security team.

**Audit Completed:** 2025-08-12  
**Next Review Date:** 2025-09-12