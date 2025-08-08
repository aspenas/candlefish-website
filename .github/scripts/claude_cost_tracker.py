#!/usr/bin/env python3
"""
Claude API Cost Tracking Module

Tracks API usage and costs for Claude reviews.
Pricing as of August 2025 (Opus-4):
- Input: $0.015 per 1K tokens
- Output: $0.075 per 1K tokens
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
import boto3
from decimal import Decimal


class ClaudeCostTracker:
    """Track and report Claude API usage costs"""

    # Pricing per 1K tokens (as of August 2025)
    PRICING = {
        "claude-opus-4-20250514": {
            "input": 0.015,  # $15 per 1M tokens
            "output": 0.075,  # $75 per 1M tokens
        },
        "claude-3-5-sonnet": {
            "input": 0.003,  # $3 per 1M tokens
            "output": 0.015,  # $15 per 1M tokens
        },
    }

    def __init__(self, table_name: str = "claude-review-usage"):
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = table_name
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """Create DynamoDB table if it doesn't exist"""
        try:
            self.table = self.dynamodb.Table(self.table_name)
            self.table.load()
        except Exception:
            # Create table
            self.table = self.dynamodb.create_table(
                TableName=self.table_name,
                KeySchema=[
                    {"AttributeName": "review_id", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "review_id", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "S"},
                    {"AttributeName": "pr_number", "AttributeType": "N"},
                    {"AttributeName": "month", "AttributeType": "S"},
                ],
                GlobalSecondaryIndexes=[
                    {
                        "IndexName": "pr-index",
                        "Keys": [
                            {"AttributeName": "pr_number", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    },
                    {
                        "IndexName": "month-index",
                        "Keys": [
                            {"AttributeName": "month", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"},
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                    },
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            self.table.wait_until_exists()

    def track_usage(
        self,
        pr_number: int,
        repository: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        review_type: str,
        duration_seconds: float,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """Track API usage for a review"""

        # Calculate costs
        pricing = self.PRICING.get(model, self.PRICING["claude-opus-4-20250514"])
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        total_cost = input_cost + output_cost

        # Generate IDs
        timestamp = datetime.utcnow()
        review_id = f"{repository}#{pr_number}#{timestamp.strftime('%Y%m%d%H%M%S')}"

        # Prepare item
        item = {
            "review_id": review_id,
            "timestamp": timestamp.isoformat(),
            "month": timestamp.strftime("%Y-%m"),
            "pr_number": pr_number,
            "repository": repository,
            "model": model,
            "review_type": review_type,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "input_cost": Decimal(str(round(input_cost, 4))),
            "output_cost": Decimal(str(round(output_cost, 4))),
            "total_cost": Decimal(str(round(total_cost, 4))),
            "duration_seconds": Decimal(str(round(duration_seconds, 2))),
            "metadata": metadata or {},
        }

        # Store in DynamoDB
        self.table.put_item(Item=item)

        return {
            "review_id": review_id,
            "total_cost": float(total_cost),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_breakdown": {
                "input": float(input_cost),
                "output": float(output_cost),
            },
        }

    def get_pr_costs(self, pr_number: int, repository: str) -> Dict:
        """Get total costs for a specific PR"""
        response = self.table.query(
            IndexName="pr-index",
            KeyConditionExpression="pr_number = :pr",
            FilterExpression="repository = :repo",
            ExpressionAttributeValues={":pr": pr_number, ":repo": repository},
        )

        items = response.get("Items", [])
        total_cost = sum(float(item["total_cost"]) for item in items)
        total_reviews = len(items)

        return {
            "pr_number": pr_number,
            "repository": repository,
            "total_reviews": total_reviews,
            "total_cost": round(total_cost, 4),
            "reviews": items,
        }

    def get_monthly_costs(self, year_month: str) -> Dict:
        """Get costs for a specific month (format: YYYY-MM)"""
        response = self.table.query(
            IndexName="month-index",
            KeyConditionExpression="month = :month",
            ExpressionAttributeValues={":month": year_month},
        )

        items = response.get("Items", [])
        total_cost = sum(float(item["total_cost"]) for item in items)
        total_reviews = len(items)

        # Group by repository
        by_repo = {}
        for item in items:
            repo = item["repository"]
            if repo not in by_repo:
                by_repo[repo] = {"count": 0, "cost": 0}
            by_repo[repo]["count"] += 1
            by_repo[repo]["cost"] += float(item["total_cost"])

        return {
            "month": year_month,
            "total_reviews": total_reviews,
            "total_cost": round(total_cost, 4),
            "by_repository": by_repo,
            "average_cost_per_review": round(total_cost / total_reviews, 4)
            if total_reviews > 0
            else 0,
        }

    def get_cost_report(self, repository: str, days: int = 30) -> Dict:
        """Generate a cost report for the last N days"""
        # This would require a more complex query with date filtering
        # For now, returning a simplified version
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        # Scan with filter (not efficient for large datasets)
        response = self.table.scan(
            FilterExpression="repository = :repo AND timestamp > :cutoff",
            ExpressionAttributeValues={":repo": repository, ":cutoff": cutoff_date},
        )

        items = response.get("Items", [])
        total_cost = sum(float(item["total_cost"]) for item in items)

        # Calculate daily average
        daily_costs = {}
        for item in items:
            date = item["timestamp"][:10]  # YYYY-MM-DD
            if date not in daily_costs:
                daily_costs[date] = 0
            daily_costs[date] += float(item["total_cost"])

        return {
            "repository": repository,
            "period_days": days,
            "total_cost": round(total_cost, 4),
            "total_reviews": len(items),
            "average_daily_cost": round(total_cost / days, 4),
            "daily_breakdown": daily_costs,
        }


if __name__ == "__main__":
    # Example usage for testing
    tracker = ClaudeCostTracker()

    # Track a sample review
    result = tracker.track_usage(
        pr_number=123,
        repository="aspenas/candlefish-ai",
        model="claude-opus-4-20250514",
        input_tokens=150000,  # 150K tokens
        output_tokens=25000,  # 25K tokens
        review_type="comprehensive",
        duration_seconds=45.2,
        metadata={"files_reviewed": 15, "issues_found": 8},
    )

    print(f"Review tracked: ${result['total_cost']:.2f}")
    print(
        f"Cost breakdown: Input=${result['cost_breakdown']['input']:.2f}, Output=${result['cost_breakdown']['output']:.2f}"
    )
