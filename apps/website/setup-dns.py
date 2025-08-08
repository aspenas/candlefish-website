#!/usr/bin/env python3
"""
Setup DNS records for api-test.candlefish.ai subdomain
"""

import requests
import os

# Porkbun API configuration
PORKBUN_API_KEY = os.getenv("PORKBUN_API_KEY")
PORKBUN_SECRET_KEY = os.getenv("PORKBUN_SECRET_KEY")
DOMAIN = "candlefish.ai"
SUBDOMAIN = "api-test"


def create_dns_record():
    """Create DNS record for subdomain pointing to Netlify"""

    if not PORKBUN_API_KEY or not PORKBUN_SECRET_KEY:
        print("❌ Porkbun API credentials not found in environment variables")
        print("   Set PORKBUN_API_KEY and PORKBUN_SECRET_KEY")
        return False

    # Porkbun API endpoint
    url = f"https://porkbun.com/api/json/v3/dns/create/{DOMAIN}"

    # Request payload
    payload = {
        "apikey": PORKBUN_API_KEY,
        "secretapikey": PORKBUN_SECRET_KEY,
        "name": SUBDOMAIN,
        "type": "CNAME",
        "content": "candlefish.ai",
        "ttl": "300",
    }

    try:
        response = requests.post(url, json=payload)
        result = response.json()

        if result.get("status") == "SUCCESS":
            print(f"✅ Successfully created DNS record for {SUBDOMAIN}.{DOMAIN}")
            print(f"   Record ID: {result.get('id')}")
            return True
        print(f"❌ Failed to create DNS record: {result.get('message')}")
        return False

    except Exception as e:
        print(f"❌ Error creating DNS record: {e}")
        return False


def check_existing_records():
    """Check existing DNS records for the domain"""

    url = f"https://porkbun.com/api/json/v3/dns/retrieve/{DOMAIN}"

    payload = {"apikey": PORKBUN_API_KEY, "secretapikey": PORKBUN_SECRET_KEY}

    try:
        response = requests.post(url, json=payload)
        result = response.json()

        if result.get("status") == "SUCCESS":
            records = result.get("records", [])
            print(f"📋 Current DNS records for {DOMAIN}:")
            for record in records:
                print(f"   {record['name']}.{DOMAIN} -> {record['content']} ({record['type']})")

            # Check if subdomain already exists
            existing = [r for r in records if r["name"] == SUBDOMAIN]
            if existing:
                print(f"⚠️  {SUBDOMAIN}.{DOMAIN} already exists:")
                for record in existing:
                    print(f"   Points to: {record['content']} ({record['type']})")
                return existing
            print(f"✅ {SUBDOMAIN}.{DOMAIN} is available")
            return []
        print(f"❌ Failed to retrieve DNS records: {result.get('message')}")
        return None

    except Exception as e:
        print(f"❌ Error checking DNS records: {e}")
        return None


def main():
    print(f"🌐 Setting up DNS for {SUBDOMAIN}.{DOMAIN}")
    print("   Target: Netlify site (candlefish.ai)")
    print()

    # Check existing records
    existing = check_existing_records()

    if existing is None:
        return

    if existing:
        print("\n❓ Subdomain already exists. Update instructions:")
        print(f"   1. Go to https://porkbun.com/account/dns/{DOMAIN}")
        print(f"   2. Update {SUBDOMAIN} record to point to: candlefish.ai")
        print("   3. Set record type to: CNAME")
        print("   4. Set TTL to: 300")
    else:
        # Create the DNS record
        print("\n🔧 Creating DNS record...")
        if create_dns_record():
            print("\n🎉 DNS setup complete!")
            print(f"   {SUBDOMAIN}.{DOMAIN} now points to candlefish.ai")
            print("   It may take a few minutes to propagate")
            print("\n🔗 Access your test page at:")
            print(f"   https://{SUBDOMAIN}.{DOMAIN}")
        else:
            print("\n❌ DNS setup failed")


if __name__ == "__main__":
    main()
