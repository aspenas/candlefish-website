#!/bin/bash

# Get Porkbun API credentials from AWS Secrets Manager
CREDS=$(aws secretsmanager get-secret-value --secret-id "candlefish/porkbun-api-credentials" --query SecretString --output text)
API_KEY=$(echo "$CREDS" | jq -r '.apikey')
SECRET_KEY=$(echo "$CREDS" | jq -r '.secretapikey')
DOMAIN="candlefish.ai"

echo "Adding Resend DNS records to candlefish.ai..."

# 1. Add MX record for send.candlefish.ai
echo "Adding MX record..."
curl -X POST https://api.porkbun.com/api/json/v3/dns/create/$DOMAIN \
  -H "Content-Type: application/json" \
  -d "{
    \"apikey\": \"$API_KEY\",
    \"secretapikey\": \"$SECRET_KEY\",
    \"type\": \"MX\",
    \"name\": \"send\",
    \"content\": \"feedback-smtp.us-east-1.amazonses.com\",
    \"ttl\": \"600\",
    \"prio\": \"10\"
  }"
echo ""

# 2. Add SPF TXT record for send.candlefish.ai
echo "Adding SPF record..."
curl -X POST https://api.porkbun.com/api/json/v3/dns/create/$DOMAIN \
  -H "Content-Type: application/json" \
  -d "{
    \"apikey\": \"$API_KEY\",
    \"secretapikey\": \"$SECRET_KEY\",
    \"type\": \"TXT\",
    \"name\": \"send\",
    \"content\": \"v=spf1 include:amazonses.com ~all\",
    \"ttl\": \"600\"
  }"
echo ""

# 3. Add DKIM TXT record
echo "Adding DKIM record..."
curl -X POST https://api.porkbun.com/api/json/v3/dns/create/$DOMAIN \
  -H "Content-Type: application/json" \
  -d "{
    \"apikey\": \"$API_KEY\",
    \"secretapikey\": \"$SECRET_KEY\",
    \"type\": \"TXT\",
    \"name\": \"resend._domainkey\",
    \"content\": \"p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMeIZmcIP4F+hJ6bGFVhzBnNB8UTYEwbQ1n5LREg/9fcqf329QqSG9OxNaLgQqRcKsptiAJHUBlJHNDDy78zrmJ2Rtp9mRKbe8cE+2EHU6E/clfA57MmJQQ5YmFH1uTub3q6ldt+ZlQKtJZ5SlHC5um5ScSQLnZnCDOARfziVbGQIDAQAB\",
    \"ttl\": \"600\"
  }"
echo ""

# 4. Add DMARC TXT record
echo "Adding DMARC record..."
curl -X POST https://api.porkbun.com/api/json/v3/dns/create/$DOMAIN \
  -H "Content-Type: application/json" \
  -d "{
    \"apikey\": \"$API_KEY\",
    \"secretapikey\": \"$SECRET_KEY\",
    \"type\": \"TXT\",
    \"name\": \"_dmarc\",
    \"content\": \"v=DMARC1; p=none;\",
    \"ttl\": \"600\"
  }"
echo ""

echo "✅ All Resend DNS records have been added!"
echo ""
echo "Please wait 5-10 minutes for DNS propagation, then:"
echo "1. Go to https://resend.com/domains"
echo "2. Click on candlefish.ai"
echo "3. Click 'Verify DNS Records'"
echo ""
echo "Once verified, emails will be delivered to hello@candlefish.ai"
