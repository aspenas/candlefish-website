#!/bin/bash

# Configure DNS records for AWS SES on candlefish.ai via Porkbun API
# Fixed version with correct credential keys

set -e

echo "🔧 Configuring DNS records for AWS SES on candlefish.ai"

# Get Porkbun API credentials from AWS Secrets Manager
echo "📦 Retrieving Porkbun API credentials..."
PORKBUN_CREDS=$(aws secretsmanager get-secret-value --secret-id "candlefish/porkbun-api-credentials" --query SecretString --output text)
API_KEY=$(echo $PORKBUN_CREDS | jq -r '.api_key')
SECRET_KEY=$(echo $PORKBUN_CREDS | jq -r '.secret_key')

if [ -z "$API_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo "❌ Failed to retrieve Porkbun API credentials"
    exit 1
fi

echo "✅ Credentials retrieved successfully"

DOMAIN="candlefish.ai"
PORKBUN_API="https://api.porkbun.com/api/json/v3"

# Test API connectivity first
echo "🔍 Testing Porkbun API connectivity..."
test_response=$(curl -s -X POST "$PORKBUN_API/ping" \
    -H "Content-Type: application/json" \
    -d "{
        \"apikey\": \"$API_KEY\",
        \"secretapikey\": \"$SECRET_KEY\"
    }")

if echo "$test_response" | grep -q "SUCCESS"; then
    echo "✅ API connection successful"
else
    echo "❌ API connection failed. Response: $test_response"
    exit 1
fi

# Function to create DNS record
create_dns_record() {
    local type="$1"
    local name="$2"
    local content="$3"
    local ttl="${4:-300}"
    local priority="${5:-}"

    echo "➕ Creating $type record: ${name:-root}"

    # Build the JSON payload
    local payload="{
        \"secretapikey\": \"$SECRET_KEY\",
        \"apikey\": \"$API_KEY\",
        \"type\": \"$type\",
        \"content\": \"$content\",
        \"ttl\": \"$ttl\""

    if [ -n "$name" ] && [ "$name" != "@" ] && [ "$name" != "" ]; then
        payload="$payload,\"name\": \"$name\""
    fi

    if [ -n "$priority" ]; then
        payload="$payload,\"prio\": \"$priority\""
    fi

    payload="$payload}"

    response=$(curl -s -X POST "$PORKBUN_API/dns/create/$DOMAIN" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if echo "$response" | grep -q "SUCCESS"; then
        echo "✅ $type record created successfully"
        return 0
    elif echo "$response" | grep -q "already exists"; then
        echo "ℹ️  $type record already exists"
        return 0
    else
        echo "⚠️  Warning: $type record creation may have failed"
        echo "   Response: $response"
        return 1
    fi
}

# Function to list existing DNS records
list_dns_records() {
    echo "📋 Fetching existing DNS records..."

    local response=$(curl -s -X POST "$PORKBUN_API/dns/retrieve/$DOMAIN" \
        -H "Content-Type: application/json" \
        -d "{
            \"secretapikey\": \"$SECRET_KEY\",
            \"apikey\": \"$API_KEY\"
        }")

    if echo "$response" | grep -q "SUCCESS"; then
        echo "$response" | jq -r '.records[] | "\(.type) \(.name) -> \(.content)"' 2>/dev/null || echo "No records found"
    else
        echo "Failed to retrieve records: $response"
    fi
}

# Function to delete a specific DNS record
delete_dns_record() {
    local record_id="$1"

    echo "  🗑️  Deleting record ID: $record_id"

    local response=$(curl -s -X POST "$PORKBUN_API/dns/delete/$DOMAIN/$record_id" \
        -H "Content-Type: application/json" \
        -d "{
            \"secretapikey\": \"$SECRET_KEY\",
            \"apikey\": \"$API_KEY\"
        }")

    if echo "$response" | grep -q "SUCCESS"; then
        echo "  ✅ Record deleted"
        return 0
    else
        echo "  ⚠️  Failed to delete: $response"
        return 1
    fi
}

echo ""
echo "📋 Current DNS records:"
list_dns_records

echo ""
echo "📋 Setting up DNS records for AWS SES..."
echo ""

# 1. Domain Verification TXT Record
echo "1️⃣  Domain Verification"
VERIFICATION_TOKEN="liicSomu3mFbN6Ax02kB1pQ9pb8V8LIwXtsRUs7hfUo="
create_dns_record "TXT" "_amazonses" "$VERIFICATION_TOKEN"

echo ""
echo "2️⃣  DKIM Records"
# DKIM CNAME Records
DKIM_TOKENS=("6gdr23zgrmihk4albjcz3dmezm732rcl" "zcuwunlejthh3d4jr3r4unxt73ynqi7i" "hylzjwsxrzuqzxsyylqjeio4xfqqf23w")
for token in "${DKIM_TOKENS[@]}"; do
    create_dns_record "CNAME" "${token}._domainkey" "${token}.dkim.amazonses.com"
done

echo ""
echo "3️⃣  SPF Record"
# Note: If you already have an SPF record, you'll need to merge them
create_dns_record "TXT" "" "v=spf1 include:amazonses.com ~all" || echo "   Note: You may need to merge this with existing SPF records"

echo ""
echo "4️⃣  DMARC Record"
create_dns_record "TXT" "_dmarc" "v=DMARC1; p=quarantine; rua=mailto:dmarc@candlefish.ai; ruf=mailto:dmarc@candlefish.ai; fo=1"

echo ""
echo "5️⃣  MX Record (optional - only if you want to receive emails)"
echo "   ⚠️  Skipping MX record to avoid disrupting existing email routing"
echo "   If you need to receive bounce emails, manually add:"
echo "   MX priority 10: inbound-smtp.us-east-1.amazonaws.com"

echo ""
echo "✅ DNS configuration attempt complete!"
echo ""
echo "📊 Next steps:"
echo "1. Wait 5-10 minutes for DNS propagation"
echo "2. Check verification status:"
echo "   aws ses get-identity-verification-attributes --identities candlefish.ai patrick@candlefish.ai --region us-east-1"
echo ""
echo "3. Verify DNS records are live:"
echo "   dig TXT _amazonses.candlefish.ai @8.8.8.8"
echo "   dig TXT candlefish.ai @8.8.8.8 | grep spf"
echo "   dig TXT _dmarc.candlefish.ai @8.8.8.8"
echo "   dig CNAME ${DKIM_TOKENS[0]}._domainkey.candlefish.ai @8.8.8.8"
echo ""
echo "4. Once domain is verified, request production access:"
echo "   Go to: https://console.aws.amazon.com/ses/home?region=us-east-1#/account"
echo "   Click 'Request production access' and fill out the form"
echo ""
echo "📝 For production request details, see: docs/ses-production-request.md"
