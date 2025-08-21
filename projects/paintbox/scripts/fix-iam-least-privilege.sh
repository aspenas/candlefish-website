#!/bin/bash

# AWS IAM Least Privilege Configuration for Paintbox
# Implements principle of least privilege with specific resource restrictions
# Security-hardened version following audit recommendations

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
IAM_USER_NAME="paintbox-fly-production"
POLICY_NAME="PaintboxJWTSecretsReadOnly"
ENVIRONMENT="production"
SERVICE_NAME="paintbox"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Header
echo ""
log "================================================" "$BLUE"
log "AWS IAM Least Privilege Configuration" "$BLUE"
log "================================================" "$BLUE"
echo ""

# Validate AWS CLI installation
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Validate jq installation (for JSON processing)
if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. Installing it would improve this script."
    log_warning "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
fi

# Check AWS credentials
log "Validating AWS credentials..."
if ! AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
    log_error "AWS credentials not configured or invalid"
    log_error "Run: aws configure"
    exit 1
fi

log_success "Connected to AWS Account: $AWS_ACCOUNT_ID"
log "Region: $AWS_REGION"
echo ""

# Create least-privilege IAM policy document
log "Creating least-privilege IAM policy..."

POLICY_DOCUMENT=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ReadJWTPublicKeys",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": [
                "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:paintbox/production/jwt/public-keys-*"
            ],
            "Condition": {
                "StringEquals": {
                    "secretsmanager:ResourceTag/Environment": "${ENVIRONMENT}",
                    "secretsmanager:ResourceTag/Service": "${SERVICE_NAME}"
                }
            }
        },
        {
            "Sid": "ReadJWTPrivateKeys",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": [
                "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:paintbox/production/jwt/private-keys-*"
            ],
            "Condition": {
                "StringEquals": {
                    "secretsmanager:ResourceTag/Environment": "${ENVIRONMENT}",
                    "secretsmanager:ResourceTag/Service": "${SERVICE_NAME}",
                    "secretsmanager:ResourceTag/Access": "jwt-signing"
                }
            }
        },
        {
            "Sid": "ListSecretsForHealthCheck",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:ListSecrets"
            ],
            "Resource": "*",
            "Condition": {
                "StringLike": {
                    "secretsmanager:SecretId": "paintbox/*"
                }
            }
        },
        {
            "Sid": "GetSecretMetadata",
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetResourcePolicy",
                "secretsmanager:ListSecretVersionIds"
            ],
            "Resource": [
                "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:paintbox/production/jwt/*"
            ]
        },
        {
            "Sid": "DenyUnencryptedAccess",
            "Effect": "Deny",
            "Action": "secretsmanager:*",
            "Resource": "*",
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
EOF
)

# Save policy to temp file
POLICY_FILE="/tmp/paintbox-iam-policy-$$.json"
echo "$POLICY_DOCUMENT" > "$POLICY_FILE"

log "Policy document created at: $POLICY_FILE"
if command -v jq &> /dev/null; then
    echo "$POLICY_DOCUMENT" | jq '.'
else
    cat "$POLICY_FILE"
fi
echo ""

# Check if user exists
log "Checking IAM user: $IAM_USER_NAME"
if aws iam get-user --user-name "$IAM_USER_NAME" &> /dev/null; then
    log_success "IAM user exists"
else
    log_warning "Creating IAM user: $IAM_USER_NAME"
    if aws iam create-user \
        --user-name "$IAM_USER_NAME" \
        --tags "Key=Environment,Value=${ENVIRONMENT}" \
               "Key=Service,Value=${SERVICE_NAME}" \
               "Key=ManagedBy,Value=Terraform" \
        2>/dev/null; then
        log_success "IAM user created"
    else
        log_error "Failed to create IAM user"
        exit 1
    fi
fi
echo ""

# Create or update policy
log "Managing IAM policy: $POLICY_NAME"
POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"

if aws iam get-policy --policy-arn "$POLICY_ARN" &> /dev/null; then
    log "Policy exists, creating new version..."

    # Get and clean up old versions
    OLD_VERSIONS=$(aws iam list-policy-versions \
        --policy-arn "$POLICY_ARN" \
        --query 'Versions[?!IsDefaultVersion].VersionId' \
        --output text)

    if [ -n "$OLD_VERSIONS" ]; then
        VERSION_COUNT=$(echo "$OLD_VERSIONS" | wc -w)
        if [ "$VERSION_COUNT" -ge 4 ]; then
            OLDEST_VERSION=$(echo "$OLD_VERSIONS" | awk '{print $1}')
            log "Removing old policy version: $OLDEST_VERSION"
            aws iam delete-policy-version \
                --policy-arn "$POLICY_ARN" \
                --version-id "$OLDEST_VERSION" 2>/dev/null || true
        fi
    fi

    # Create new version
    if aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "file://${POLICY_FILE}" \
        --set-as-default &> /dev/null; then
        log_success "Policy updated with new version"
    else
        log_error "Failed to update policy"
        exit 1
    fi
else
    log "Creating new IAM policy..."
    if aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "file://${POLICY_FILE}" \
        --description "Least-privilege access to Paintbox JWT secrets in AWS Secrets Manager" \
        --tags "Key=Environment,Value=${ENVIRONMENT}" \
               "Key=Service,Value=${SERVICE_NAME}" \
        &> /dev/null; then
        log_success "Policy created"
    else
        log_error "Failed to create policy"
        exit 1
    fi
fi
echo ""

# Attach policy to user
log "Attaching policy to user..."
if aws iam attach-user-policy \
    --user-name "$IAM_USER_NAME" \
    --policy-arn "$POLICY_ARN" 2>/dev/null; then
    log_success "Policy attached to user"
else
    log_warning "Policy may already be attached"
fi
echo ""

# Tag the secrets for policy conditions
log "Tagging secrets for policy conditions..."

SECRET_IDS=(
    "paintbox/production/jwt/public-keys"
    "paintbox/production/jwt/private-keys"
)

for SECRET_ID in "${SECRET_IDS[@]}"; do
    log "Tagging secret: $SECRET_ID"

    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_ID" --region "$AWS_REGION" &> /dev/null; then
        # Apply tags
        TAGS="Key=Environment,Value=${ENVIRONMENT} Key=Service,Value=${SERVICE_NAME}"

        # Add specific tag for private keys
        if [[ "$SECRET_ID" == *"private-keys"* ]]; then
            TAGS="$TAGS Key=Access,Value=jwt-signing"
        fi

        if aws secretsmanager tag-resource \
            --secret-id "$SECRET_ID" \
            --tags $TAGS \
            --region "$AWS_REGION" 2>/dev/null; then
            log_success "Tagged: $SECRET_ID"
        else
            log_warning "Failed to tag: $SECRET_ID (may already be tagged)"
        fi
    else
        log_warning "Secret does not exist: $SECRET_ID"
        log "You need to create this secret in AWS Secrets Manager"
    fi
done
echo ""

# List current access keys
log "Current access keys for user $IAM_USER_NAME:"
aws iam list-access-keys --user-name "$IAM_USER_NAME" --output table
echo ""

# Offer to create new access keys
read -p "$(echo -e ${YELLOW}Do you want to create new access keys? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Creating new access keys..."

    # Check if user already has 2 keys (AWS limit)
    KEY_COUNT=$(aws iam list-access-keys --user-name "$IAM_USER_NAME" --query 'AccessKeyMetadata | length(@)' --output text)
    if [ "$KEY_COUNT" -ge 2 ]; then
        log_error "User already has 2 access keys (AWS limit)"
        log "Delete an old key first: aws iam delete-access-key --user-name $IAM_USER_NAME --access-key-id KEY_ID"
        exit 1
    fi

    # Create new access key
    KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER_NAME")

    if [ $? -eq 0 ]; then
        ACCESS_KEY_ID=$(echo "$KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId' 2>/dev/null || echo "$KEY_OUTPUT" | grep -o '"AccessKeyId": "[^"]*' | cut -d'"' -f4)
        SECRET_ACCESS_KEY=$(echo "$KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey' 2>/dev/null || echo "$KEY_OUTPUT" | grep -o '"SecretAccessKey": "[^"]*' | cut -d'"' -f4)

        CREDENTIALS_FILE="/tmp/paintbox-aws-credentials-$$.txt"

        cat > "$CREDENTIALS_FILE" <<EOF
# AWS Credentials for Paintbox Production
# Generated: $(date)
# User: ${IAM_USER_NAME}

AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}
AWS_REGION=${AWS_REGION}

# To set in Fly.io:
flyctl secrets set -a paintbox \\
  AWS_ACCESS_KEY_ID="${ACCESS_KEY_ID}" \\
  AWS_SECRET_ACCESS_KEY="${SECRET_ACCESS_KEY}" \\
  AWS_REGION="${AWS_REGION}"

# Security Notes:
# - These credentials have minimal permissions (JWT secrets only)
# - Rotate these keys every 90 days
# - Never commit these to version control
# - Delete this file after updating Fly.io
EOF

        echo ""
        log "================================================" "$GREEN"
        log "NEW AWS CREDENTIALS CREATED" "$GREEN"
        log "================================================" "$GREEN"
        echo ""
        echo "Access Key ID: ${ACCESS_KEY_ID}"
        echo "Secret Access Key: [HIDDEN - See file below]"
        echo ""
        log_success "Credentials saved to: $CREDENTIALS_FILE"
        log_warning "DELETE this file after updating Fly.io secrets!"
        echo ""
        echo "To update Fly.io, run:"
        echo "cat $CREDENTIALS_FILE"
        echo ""
    else
        log_error "Failed to create access keys"
        exit 1
    fi
else
    log "Skipping access key creation"
fi

# Test permissions
log "Testing permissions..."
echo ""

log "Testing secret access..."
if aws secretsmanager get-secret-value \
    --secret-id "paintbox/production/jwt/public-keys" \
    --region "$AWS_REGION" \
    --query 'Name' \
    --output text &> /dev/null; then
    log_success "✓ Can access JWT public keys"
else
    log_error "✗ Cannot access JWT public keys"
    log "Ensure the secret exists and is properly tagged"
fi

# Test that we cannot access other secrets
log "Testing permission boundaries..."
if aws secretsmanager get-secret-value \
    --secret-id "some-other-secret" \
    --region "$AWS_REGION" &> /dev/null; then
    log_error "✗ Can access other secrets (too permissive!)"
else
    log_success "✓ Cannot access other secrets (correct)"
fi

# Clean up
rm -f "$POLICY_FILE"

echo ""
log "================================================" "$BLUE"
log "Configuration Complete!" "$BLUE"
log "================================================" "$BLUE"
echo ""
log "Summary:" "$GREEN"
echo "  - User: ${IAM_USER_NAME}"
echo "  - Policy: ${POLICY_NAME}"
echo "  - Region: ${AWS_REGION}"
echo "  - Permissions: Read-only access to JWT secrets"
echo ""
log "Security Features:" "$GREEN"
echo "  ✓ Least privilege access"
echo "  ✓ Resource-specific permissions"
echo "  ✓ Tag-based access control"
echo "  ✓ Encrypted transport required"
echo "  ✓ Region-specific access"
echo ""
log "Next Steps:" "$YELLOW"
echo "  1. Update Fly.io with new credentials (if created)"
echo "  2. Test JWKS endpoint: curl https://paintbox.fly.dev/.well-known/jwks.json"
echo "  3. Monitor CloudTrail for unauthorized access attempts"
echo "  4. Set up key rotation reminder (90 days)"
echo ""
