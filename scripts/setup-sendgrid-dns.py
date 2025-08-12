#!/usr/bin/env python3

"""
SendGrid DNS Setup for candlefish.ai via Porkbun API
This script adds the required DNS records for SendGrid email authentication
"""

import json
import sys
import time
import requests
import boto3
from typing import Dict, List, Tuple

# ANSI color codes
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
NC = '\033[0m'  # No Color

# Domain configuration
DOMAIN = "candlefish.ai"
PORKBUN_API_BASE = "https://api.porkbun.com/api/json/v3/dns"

# DNS records to create for SendGrid
DNS_RECORDS = [
    ("CNAME", "url8641.www", "sendgrid.net"),
    ("CNAME", "55107103.www", "sendgrid.net"),
    ("CNAME", "em5699.www", "u55107103.wl104.sendgrid.net"),
    ("CNAME", "s1._domainkey.www", "s1.domainkey.u55107103.wl104.sendgrid.net"),
    ("CNAME", "s2._domainkey.www", "s2.domainkey.u55107103.wl104.sendgrid.net"),
    ("TXT", "_dmarc.www", "v=DMARC1; p=quarantine; rua=mailto:reports@candlefish.ai;"),
]


def get_porkbun_credentials() -> Tuple[str, str]:
    """Fetch Porkbun API credentials from AWS Secrets Manager"""
    print(f"{YELLOW}Fetching Porkbun API credentials...{NC}")
    
    try:
        client = boto3.client('secretsmanager')
        response = client.get_secret_value(SecretId='porkbun/api-credentials')
        secret = json.loads(response['SecretString'])
        
        api_key = secret.get('api_key')
        secret_key = secret.get('secret_key')
        
        if not api_key or not secret_key:
            print(f"{RED}Error: Invalid credentials format in AWS Secrets Manager{NC}")
            sys.exit(1)
            
        print(f"{GREEN}✓ API credentials retrieved{NC}")
        return api_key, secret_key
        
    except Exception as e:
        print(f"{RED}Error fetching credentials: {e}{NC}")
        sys.exit(1)


def check_record_exists(api_key: str, secret_key: str, record_type: str, name: str) -> bool:
    """Check if a DNS record already exists"""
    try:
        response = requests.post(
            f"{PORKBUN_API_BASE}/retrieve/{DOMAIN}",
            json={
                "apikey": api_key,
                "secretapikey": secret_key
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'SUCCESS':
                records = data.get('records', [])
                for record in records:
                    if record.get('type') == record_type and record.get('name') == name:
                        return True
        return False
        
    except Exception:
        return False


def create_dns_record(api_key: str, secret_key: str, record_type: str, name: str, content: str, ttl: int = 600) -> bool:
    """Create a DNS record via Porkbun API"""
    print(f"{YELLOW}Creating {record_type} record: {name}.{DOMAIN} -> {content}{NC}")
    
    try:
        # First, let's try to ping the API to check if credentials work
        ping_response = requests.post(
            "https://api.porkbun.com/api/json/v3/ping",
            json={
                "apikey": api_key,
                "secretapikey": secret_key
            }
        )
        
        if ping_response.status_code != 200 or ping_response.json().get('status') != 'SUCCESS':
            print(f"{RED}✗ API authentication failed{NC}")
            print(f"Ping response: {ping_response.text}")
            return False
        
        # Create the DNS record
        response = requests.post(
            f"{PORKBUN_API_BASE}/create/{DOMAIN}",
            json={
                "apikey": api_key,
                "secretapikey": secret_key,
                "type": record_type,
                "name": name,
                "content": content,
                "ttl": str(ttl)
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'SUCCESS':
                print(f"{GREEN}✓ {record_type} record created successfully{NC}")
                return True
            else:
                message = data.get('message', 'Unknown error')
                print(f"{RED}✗ Failed to create {record_type} record: {message}{NC}")
                return False
        else:
            print(f"{RED}✗ HTTP {response.status_code}: {response.text}{NC}")
            return False
            
    except Exception as e:
        print(f"{RED}✗ Exception creating record: {e}{NC}")
        return False


def main():
    """Main function to set up SendGrid DNS records"""
    print(f"{GREEN}SendGrid DNS Setup for candlefish.ai{NC}")
    print("=" * 40)
    
    # Get credentials
    api_key, secret_key = get_porkbun_credentials()
    
    print()
    print(f"{GREEN}Adding SendGrid DNS Records{NC}")
    print("=" * 30)
    
    failed_records = 0
    
    for record_type, name, content in DNS_RECORDS:
        # Check if record already exists
        if check_record_exists(api_key, secret_key, record_type, name):
            print(f"{YELLOW}⚠ {record_type} record for {name}.{DOMAIN} already exists, skipping...{NC}")
        else:
            if not create_dns_record(api_key, secret_key, record_type, name, content):
                failed_records += 1
        
        # Small delay to avoid rate limiting
        time.sleep(1)
    
    print()
    print("=" * 40)
    
    if failed_records == 0:
        print(f"{GREEN}✓ All DNS records processed successfully!{NC}")
        print()
        print("Next steps:")
        print("1. DNS propagation may take up to 48 hours")
        print(f"2. You can verify DNS records at: https://porkbun.com/account/domainsSpeedy/{DOMAIN}")
        print("3. Check SendGrid domain authentication status in your SendGrid account")
        print("4. Use 'dig' or 'nslookup' to verify individual records:")
        print(f"   Example: dig CNAME url8641.www.{DOMAIN}")
    else:
        print(f"{RED}✗ {failed_records} record(s) failed to create. Please check the errors above.{NC}")
        sys.exit(1)


if __name__ == "__main__":
    main()