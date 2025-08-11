#!/usr/bin/env python3
"""Store the provided Slack token in AWS Secrets Manager"""

import json
import boto3
from datetime import datetime
from botocore.exceptions import ClientError


def store_slack_token():
    """Store the provided Slack token in AWS Secrets Manager"""

    # The provided token
    user_token = "xoxe.xoxp-1-Mi0yLTkyODg5ODg3ODA4NjktOTI5MzM3NTgzNDQ2OC05MjkxMjkxMjIxMjk5LTkzMjU5MjYwMDA1MzAtZGEwZmE4MjgwNmVjZjM4NTY2NGQ1YTAyMjNmMjg5YzRiZDFjMWI1ZGZlZGM1OTQ1MDcxYjYxNTMzYTNjOTJmZA"

    # Create the secret payload
    secret_data = {
        "user_token": user_token,
        "bot_token": None,  # Will be populated if/when bot token is created
        "app_token": None,  # Will be populated if/when Socket Mode is enabled
        "client_id": None,
        "client_secret": None,
        "signing_secret": None,
        "verification_token": None,
        "workspace_id": None,
        "workspace_name": "candlefish.ai",
        "permissions": "admin",
        "token_type": "user_oauth_token",
        "created_date": datetime.now().isoformat(),
        "app_name": "Candlefish Admin Agent",
        "notes": "Initial token provided for admin bot setup",
    }

    # Initialize AWS Secrets Manager client
    client = boto3.client("secretsmanager", region_name="us-west-2")
    secret_name = "slack-admin-bot-tokens"

    try:
        # Try to create new secret
        response = client.create_secret(
            Name=secret_name,
            Description="Slack Admin Bot with full workspace permissions for autonomous agent",
            SecretString=json.dumps(secret_data, indent=2),
        )
        print(f"✅ Successfully created secret: {secret_name}")
        print(f"   Secret ARN: {response['ARN']}")

    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceExistsException":
            # Update existing secret
            response = client.update_secret(
                SecretId=secret_name, SecretString=json.dumps(secret_data, indent=2)
            )
            print(f"✅ Successfully updated existing secret: {secret_name}")
            print(f"   Secret ARN: {response['ARN']}")
        else:
            print(f"❌ Error storing secret: {e}")
            raise e

    # Verify the storage
    try:
        response = client.get_secret_value(SecretId=secret_name)
        stored_data = json.loads(response["SecretString"])
        print("\n📋 Stored token information:")
        print(f"   Token Type: {stored_data.get('token_type')}")
        print(f"   Workspace: {stored_data.get('workspace_name')}")
        print(f"   Created: {stored_data.get('created_date')}")
        print(
            f"   User Token: {stored_data.get('user_token', 'Not set')[:20]}..."
            if stored_data.get("user_token")
            else "   User Token: Not set"
        )
        print(f"   Bot Token: {stored_data.get('bot_token', 'Not set')}")
        print(f"   App Token: {stored_data.get('app_token', 'Not set')}")

    except ClientError as e:
        print(f"❌ Error verifying secret: {e}")

    print("\n🚀 Token successfully stored in AWS Secrets Manager!")
    print(f"   Secret Name: {secret_name}")
    print("   Region: us-west-2")
    print("   Ready for use by the Slack admin bot")


if __name__ == "__main__":
    store_slack_token()
