#!/bin/bash

# Configure DNS records for AWS SES on candlefish.ai via Porkbun API
# This script sets up all required DNS records for email sending

set -e

echo "🔧 Configuring DNS records for AWS SES on candlefish.ai"

# Get Porkbun API credentials from AWS Secrets Manager
echo "📦 Retrieving Porkbun API credentials..."
PORKBUN_CREDS=$(aws secretsmanager get-secret-value --secret-id "candlefish/porkbun-api-credentials" --query SecretString --output text)
API_KEY=$(echo $PORKBUN_CREDS | jq -r '.apikey')
SECRET_KEY=$(echo $PORKBUN_CREDS | jq -r '.secretapikey')

DOMAIN="candlefish.ai"
PORKBUN_API="https://api.porkbun.com/api/json/v3"

# Function to create DNS record
create_dns_record() {
    local type="$1"
    local name="$2"
    local content="$3"
    local ttl="${4:-300}"
    local priority="${5:-}"
    
    echo "➕ Creating $type record: $name"
    
    # Build the JSON payload
    local payload="{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\",
        \"type\": \"$type\",
        \"content\": \"$content\",
        \"ttl\": \"$ttl\""
    
    if [ -n "$name" ] && [ "$name" != "@" ]; then
        payload="$payload,\"name\": \"$name\""
    fi
    
    if [ -n "$priority" ]; then
        payload="$payload,\"prio\": \"$priority\""
    fi
    
    payload="$payload}"
    
    response=$(curl -s -X POST "$PORKBUN_API/dns/create/$DOMAIN" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | jq -e '.status == "SUCCESS"' > /dev/null 2>&1; then
        echo "✅ $type record created successfully"
    else
        echo "⚠️  Warning: $type record creation may have failed or already exists"
        echo "   Response: $response"
    fi
}

# Function to delete existing DNS records of a specific type and name
delete_dns_records() {
    local type="$1"
    local name="$2"
    
    echo "🗑️  Checking for existing $type records for $name..."
    
    # Get all DNS records
    local records=$(curl -s -X POST "$PORKBUN_API/dns/retrieve/$DOMAIN" \
        -H "Content-Type: application/json" \
        -d "{
            \"apikey\": \"$API_KEY\",
            \"secretapikey\": \"$SECRET_KEY\"
        }")
    
    # Filter and delete matching records
    echo "$records" | jq -r ".records[] | select(.type == \"$type\" and .name == \"$name\") | .id" | while read -r record_id; do
        if [ -n "$record_id" ]; then
            echo "  Deleting record ID: $record_id"
            curl -s -X POST "$PORKBUN_API/dns/delete/$DOMAIN/$record_id" \
                -H "Content-Type: application/json" \
                -d "{
                    \"apikey\": \"$API_KEY\",
                    \"secretapikey\": \"$SECRET_KEY\"
                }" > /dev/null
        fi
    done
}

echo ""
echo "📋 Setting up DNS records for AWS SES..."
echo ""

# 1. Domain Verification TXT Record
echo "1️⃣  Domain Verification"
VERIFICATION_TOKEN="liicSomu3mFbN6Ax02kB1pQ9pb8V8LIwXtsRUs7hfUo="
delete_dns_records "TXT" "_amazonses.$DOMAIN"
create_dns_record "TXT" "_amazonses" "$VERIFICATION_TOKEN"

echo ""
echo "2️⃣  DKIM Records"
# DKIM CNAME Records
DKIM_TOKENS=("6gdr23zgrmihk4albjcz3dmezm732rcl" "zcuwunlejthh3d4jr3r4unxt73ynqi7i" "hylzjwsxrzuqzxsyylqjeio4xfqqf23w")
for token in "${DKIM_TOKENS[@]}"; do
    delete_dns_records "CNAME" "${token}._domainkey.$DOMAIN"
    create_dns_record "CNAME" "${token}._domainkey" "${token}.dkim.amazonses.com"
done

echo ""
echo "3️⃣  SPF Record"
# SPF TXT Record - we need to check if there's an existing TXT record for the root domain
echo "   Checking for existing SPF records..."
existing_spf=$(curl -s -X POST "$PORKBUN_API/dns/retrieve/$DOMAIN" \
    -H "Content-Type: application/json" \
    -d "{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\"
    }" | jq -r '.records[] | select(.type == "TXT" and .name == "candlefish.ai" and (.content | contains("v=spf1"))) | .content')

if [ -n "$existing_spf" ]; then
    echo "   ⚠️  Existing SPF record found: $existing_spf"
    echo "   Note: You may need to merge SPF records manually to avoid conflicts"
else
    create_dns_record "TXT" "" "v=spf1 include:amazonses.com ~all"
fi

echo ""
echo "4️⃣  DMARC Record"
delete_dns_records "TXT" "_dmarc.$DOMAIN"
create_dns_record "TXT" "_dmarc" "v=DMARC1; p=quarantine; rua=mailto:dmarc@candlefish.ai; ruf=mailto:dmarc@candlefish.ai; fo=1"

echo ""
echo "5️⃣  MX Record (for receiving bounce/complaint emails)"
# Check for existing MX records
existing_mx=$(curl -s -X POST "$PORKBUN_API/dns/retrieve/$DOMAIN" \
    -H "Content-Type: application/json" \
    -d "{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\"
    }" | jq -r '.records[] | select(.type == "MX") | .content')

if [ -n "$existing_mx" ]; then
    echo "   ⚠️  Existing MX records found. Not modifying to avoid disrupting email delivery."
    echo "   Current MX: $existing_mx"
else
    create_dns_record "MX" "" "inbound-smtp.us-east-1.amazonaws.com" "300" "10"
fi

echo ""
echo "✅ DNS configuration complete!"
echo ""
echo "📊 Next steps:"
echo "1. Wait 5-10 minutes for DNS propagation"
echo "2. Check verification status with: aws ses get-identity-verification-attributes --identities candlefish.ai patrick@candlefish.ai --region us-east-1"
echo "3. Once verified, request production access (exit sandbox mode)"
echo ""
echo "🔍 To verify DNS propagation:"
echo "   dig TXT _amazonses.candlefish.ai @8.8.8.8"
echo "   dig TXT _dmarc.candlefish.ai @8.8.8.8"
echo "   dig CNAME 6gdr23zgrmihk4albjcz3dmezm732rcl._domainkey.candlefish.ai @8.8.8.8"