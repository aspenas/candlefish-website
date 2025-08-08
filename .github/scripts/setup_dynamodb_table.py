#!/usr/bin/env python3
"""
Setup DynamoDB table for Claude review cost tracking

This script creates the necessary DynamoDB table with proper indexes
for cost tracking and reporting.
"""

import boto3
import sys
from botocore.exceptions import ClientError


def create_cost_tracking_table():
    """Create the DynamoDB table for cost tracking"""

    dynamodb = boto3.client("dynamodb", region_name="us-east-1")
    table_name = "claude-review-usage"

    try:
        # Check if table already exists
        dynamodb.describe_table(TableName=table_name)
        print(f"✅ Table '{table_name}' already exists!")
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            print(f"❌ Error checking table: {e}")
            return False

    # Table doesn't exist, create it
    print(f"📦 Creating DynamoDB table '{table_name}'...")

    try:
        dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {
                    "AttributeName": "review_id",
                    "KeyType": "HASH",  # Partition key
                },
                {
                    "AttributeName": "timestamp",
                    "KeyType": "RANGE",  # Sort key
                },
            ],
            AttributeDefinitions=[
                {"AttributeName": "review_id", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "S"},
                {"AttributeName": "pr_number", "AttributeType": "N"},
                {"AttributeName": "month", "AttributeType": "S"},
                {"AttributeName": "repository", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "pr-index",
                    "KeySchema": [
                        {"AttributeName": "pr_number", "KeyType": "HASH"},
                        {"AttributeName": "timestamp", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "month-index",
                    "KeySchema": [
                        {"AttributeName": "month", "KeyType": "HASH"},
                        {"AttributeName": "timestamp", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "repository-month-index",
                    "KeySchema": [
                        {"AttributeName": "repository", "KeyType": "HASH"},
                        {"AttributeName": "month", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            BillingMode="PAY_PER_REQUEST",  # On-demand billing
            Tags=[
                {"Key": "Project", "Value": "candlefish-ai"},
                {"Key": "Purpose", "Value": "claude-review-cost-tracking"},
                {"Key": "Environment", "Value": "production"},
            ],
        )

        print("⏳ Waiting for table to be created...")

        # Wait for table to be created
        waiter = dynamodb.get_waiter("table_exists")
        waiter.wait(TableName=table_name, WaiterConfig={"Delay": 5, "MaxAttempts": 25})

        print(f"✅ Table '{table_name}' created successfully!")

        # Enable point-in-time recovery
        try:
            dynamodb.update_continuous_backups(
                TableName=table_name,
                PointInTimeRecoverySpecification={"PointInTimeRecoveryEnabled": True},
            )
            print("✅ Point-in-time recovery enabled!")
        except Exception as e:
            print(f"⚠️  Warning: Could not enable point-in-time recovery: {e}")

        return True

    except Exception as e:
        print(f"❌ Error creating table: {e}")
        return False


def verify_table_setup():
    """Verify the table is properly configured"""

    dynamodb = boto3.client("dynamodb", region_name="us-east-1")
    table_name = "claude-review-usage"

    try:
        response = dynamodb.describe_table(TableName=table_name)
        table = response["Table"]

        print("\n📊 Table Configuration:")
        print(f"  - Name: {table['TableName']}")
        print(f"  - Status: {table['TableStatus']}")
        print(f"  - Item Count: {table.get('ItemCount', 0)}")
        print(
            f"  - Billing Mode: {'On-Demand' if table.get('BillingModeSummary', {}).get('BillingMode') == 'PAY_PER_REQUEST' else 'Provisioned'}"
        )

        print("\n🔍 Indexes:")
        for gsi in table.get("GlobalSecondaryIndexes", []):
            print(f"  - {gsi['IndexName']}: {gsi['IndexStatus']}")

        # Check continuous backups
        try:
            backup_response = dynamodb.describe_continuous_backups(TableName=table_name)
            pitr_status = backup_response["ContinuousBackupsDescription"][
                "PointInTimeRecoveryDescription"
            ]["PointInTimeRecoveryStatus"]
            print(f"\n💾 Point-in-Time Recovery: {pitr_status}")
        except Exception:
            print("\n💾 Point-in-Time Recovery: Unknown")

        return True

    except Exception as e:
        print(f"❌ Error verifying table: {e}")
        return False


def main():
    print("🚀 Setting up DynamoDB table for Claude review cost tracking\n")

    # Check AWS credentials
    try:
        sts = boto3.client("sts")
        identity = sts.get_caller_identity()
        print(f"🔐 AWS Account: {identity['Account']}")
        print(f"👤 User/Role: {identity['Arn']}\n")
    except Exception as e:
        print(f"❌ AWS credentials not configured: {e}")
        print("\nPlease configure AWS credentials using one of:")
        print("  - aws configure")
        print("  - Export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        print("  - Use IAM role if running on EC2")
        return 1

    # Create table
    if not create_cost_tracking_table():
        return 1

    # Verify setup
    if not verify_table_setup():
        return 1

    print("\n✅ DynamoDB table setup complete!")
    print("\n📝 Next steps:")
    print("  1. The table is ready for use by the Claude review workflows")
    print("  2. Cost tracking will start automatically on next PR review")
    print("  3. Run the cost report workflow to generate reports")

    return 0


if __name__ == "__main__":
    sys.exit(main())
