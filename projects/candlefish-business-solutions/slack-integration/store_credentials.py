#!/usr/bin/env python3
"""
Store Slack App Credentials in AWS Secrets Manager
Created: August 8, 2025
"""

import json
import boto3


def store_slack_credentials():
    """Store the new Slack app credentials"""

    # Credentials from the screenshot
    credentials = {
        "app_id": "A099MHWMRCN",
        "client_id": "9288988780869.9327608739430",
        "client_secret": "118911c0799aeaf44f14cc5d9475b3e0",
        "signing_secret": "2be2eb4ce13386978ec72ad0e22e5b02",
        "verification_token": "kmtAK2qLk94TyT3T1zJU52QF",
        "bot_token": "",  # Will be added after OAuth installation
        "app_token": "",  # Will be added if Socket Mode is enabled
        "workspace_id": "T099D1FQGAA",  # Candlefish workspace
        "workspace_name": "candlefish.ai",
        "created_date": "2025-08-08",
        "permissions": "admin",
        "app_name": "Candlefish Workspace Manager",
        "authorized_users": ["patrick@candlefish.ai", "tyler@candlefish.ai", "aaron@candlefish.ai"],
        "integrations": {
            "aws": True,
            "fly_io": True,
            "vercel": True,
            "netlify": True,
            "github": True,
        },
        "services": [
            "paintbox",
            "fogg-calendar",
            "promoteros",
            "brewkit",
            "crown-trophy",
            "bart-core",
            "bart-pwa",
            "excel-tools",
        ],
    }

    try:
        client = boto3.client("secretsmanager", region_name="us-west-2")

        # Check if secret exists
        try:
            client.describe_secret(SecretId="slack-workspace-manager")
            # Update existing secret
            response = client.update_secret(
                SecretId="slack-workspace-manager", SecretString=json.dumps(credentials)
            )
            print("✅ Updated existing secret: slack-workspace-manager")
        except client.exceptions.ResourceNotFoundException:
            # Create new secret
            response = client.create_secret(
                Name="slack-workspace-manager",
                Description="Candlefish Slack Workspace Manager - Full Admin Bot",
                SecretString=json.dumps(credentials),
                Tags=[
                    {"Key": "Project", "Value": "Candlefish"},
                    {"Key": "Component", "Value": "SlackWorkspaceManager"},
                    {"Key": "Environment", "Value": "Production"},
                    {"Key": "CreatedBy", "Value": "Patrick"},
                ],
            )
            print("✅ Created new secret: slack-workspace-manager")

        print(f"ARN: {response.get('ARN', 'Updated')}")
        return True

    except Exception as e:
        print(f"❌ Error storing credentials: {e}")
        return False


if __name__ == "__main__":
    if store_slack_credentials():
        print("\n📝 Next steps:")
        print("1. Install the Slack app to your workspace")
        print("2. Get the Bot User OAuth Token (xoxb-...)")
        print("3. Enable Socket Mode and get App Token (xapp-...)")
        print("4. Update the secret with these tokens")
