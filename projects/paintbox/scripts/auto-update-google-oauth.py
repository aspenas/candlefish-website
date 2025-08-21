#!/usr/bin/env python3
"""
Automatically update Google OAuth2 redirect URIs using Google API
"""

import json
import subprocess
import sys
from typing import Dict


def get_google_credentials() -> Dict:
    """Get Google OAuth credentials from AWS Secrets Manager"""
    try:
        result = subprocess.run(
            [
                "aws",
                "secretsmanager",
                "get-secret-value",
                "--secret-id",
                "candlefish/google-oauth2-config",
                "--query",
                "SecretString",
                "--output",
                "text",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)["web"]
    except Exception as e:
        print(f"Error getting credentials: {e}")
        sys.exit(1)


def update_oauth_redirect_uris():
    """Update OAuth redirect URIs using gcloud CLI"""
    creds = get_google_credentials()
    client_id = creds["client_id"]
    project_id = creds["project_id"]

    # Required redirect URIs
    redirect_uris = [
        "https://paintbox.fly.dev/api/auth/callback/google",
        "https://paintbox.candlefish.ai/api/auth/callback/google",
        "http://localhost:3000/api/auth/callback/google",
    ]

    # Required JavaScript origins
    js_origins = [
        "https://paintbox.fly.dev",
        "https://paintbox.candlefish.ai",
        "http://localhost:3000",
    ]

    print(f"🔧 Updating OAuth Client: {client_id}")
    print(f"📦 Project: {project_id}")
    print("\n📝 Redirect URIs to add:")
    for uri in redirect_uris:
        print(f"  • {uri}")

    print("\n🌐 JavaScript Origins to add:")
    for origin in js_origins:
        print(f"  • {origin}")

    # Create OAuth update configuration
    oauth_config = {
        "web": {
            "client_id": client_id,
            "project_id": project_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": creds["client_secret"],
            "redirect_uris": redirect_uris,
            "javascript_origins": js_origins,
        }
    }

    # Save configuration to temporary file
    config_file = "/tmp/oauth_config.json"
    with open(config_file, "w") as f:
        json.dump(oauth_config, f, indent=2)

    print(f"\n✅ OAuth configuration prepared at: {config_file}")
    print("\n📋 Manual Update Instructions:")
    print("1. Go to: https://console.cloud.google.com/apis/credentials")
    print(f"2. Select project: {project_id}")
    print(f"3. Click on OAuth 2.0 Client ID: {client_id}")
    print("4. Update the redirect URIs and JavaScript origins as shown above")
    print("5. Save the changes")

    print("\n🔄 Alternative: Use gcloud CLI")
    print("If you have gcloud CLI configured, you can run:")
    print(f"gcloud config set project {project_id}")
    print(f"gcloud alpha iap oauth-clients update {client_id} --oauth-config={config_file}")

    return oauth_config


def test_oauth_flow():
    """Test the OAuth flow with the updated configuration"""
    print("\n🧪 Testing OAuth Configuration...")

    # Test the OAuth providers endpoint
    result = subprocess.run(
        ["curl", "-s", "https://paintbox.fly.dev/api/auth/providers"],
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        providers = json.loads(result.stdout)
        if "google" in providers:
            callback_url = providers["google"]["callbackUrl"]
            print(f"✅ OAuth callback URL: {callback_url}")
            return True

    print("❌ OAuth configuration test failed")
    return False


def main():
    print("🚀 Google OAuth Auto-Configuration Tool")
    print("=" * 50)

    # Update OAuth configuration
    update_oauth_redirect_uris()

    # Test the configuration
    if test_oauth_flow():
        print("\n✅ OAuth configuration is ready!")
        print("📝 Next step: Update Google Cloud Console with the URIs above")
    else:
        print("\n⚠️ OAuth configuration needs attention")

    print("\n💡 Quick Test:")
    print("After updating Google Cloud Console, test at:")
    print("https://paintbox.fly.dev/login")


if __name__ == "__main__":
    main()
