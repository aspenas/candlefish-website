#!/usr/bin/env python3
"""
Test script for Slack Admin Bot implementation
Comprehensive testing of all bot capabilities
"""

import asyncio
import json
import sys
from typing import Dict, Any

import structlog
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from config import config_manager
from monitoring import get_monitoring_service

# Configure logging for tests
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class SlackBotTester:
    """Comprehensive test suite for Slack Admin Bot"""

    def __init__(self):
        self.config = config_manager.load_from_secrets_manager()
        self.client = None
        self.test_results: Dict[str, Any] = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": [],
        }

    async def initialize(self):
        """Initialize the Slack client"""
        try:
            primary_token = config_manager.get_primary_token()
            self.client = WebClient(token=primary_token)

            # Test authentication
            auth_response = self.client.auth_test()
            logger.info(
                "Test client initialized",
                user=auth_response.get("user"),
                team=auth_response.get("team"),
            )
            return True

        except Exception as e:
            logger.error("Failed to initialize test client", error=str(e))
            return False

    def record_test(self, test_name: str, passed: bool, details: str = "", data: Any = None):
        """Record test result"""
        self.test_results["total_tests"] += 1
        if passed:
            self.test_results["passed_tests"] += 1
            logger.info("Test passed", test=test_name, details=details)
        else:
            self.test_results["failed_tests"] += 1
            logger.error("Test failed", test=test_name, details=details)

        self.test_results["test_details"].append(
            {"name": test_name, "passed": passed, "details": details, "data": data}
        )

    async def test_authentication(self):
        """Test Slack authentication"""
        try:
            response = self.client.auth_test()

            required_fields = ["ok", "user", "team", "user_id", "team_id"]
            missing_fields = [field for field in required_fields if field not in response]

            if missing_fields:
                self.record_test("authentication", False, f"Missing fields: {missing_fields}")
            else:
                self.record_test(
                    "authentication", True, f"Authenticated as {response['user']}", response
                )

        except SlackApiError as e:
            self.record_test("authentication", False, f"API error: {e.response['error']}")

    async def test_token_permissions(self):
        """Test token permissions and scopes"""
        try:
            # Test various API endpoints to check permissions
            permissions_tests = [
                ("users_list", lambda: self.client.users_list(limit=1)),
                ("conversations_list", lambda: self.client.conversations_list(limit=1)),
                ("team_info", lambda: self.client.team_info()),
            ]

            permission_results = {}

            for perm_name, test_func in permissions_tests:
                try:
                    result = test_func()
                    permission_results[perm_name] = "✅ Available"
                except SlackApiError as e:
                    permission_results[perm_name] = f"❌ Error: {e.response['error']}"

            # Check for admin-specific endpoints (may fail if not admin)
            admin_tests = [
                ("admin_teams_list", lambda: self.client.admin_teams_list()),
                ("admin_users_list", lambda: self.client.admin_users_list(limit=1)),
            ]

            for admin_name, test_func in admin_tests:
                try:
                    result = test_func()
                    permission_results[admin_name] = "✅ Available (Admin)"
                except SlackApiError as e:
                    if e.response["error"] == "missing_scope":
                        permission_results[admin_name] = "⚠️ Missing admin scope"
                    else:
                        permission_results[admin_name] = f"❌ Error: {e.response['error']}"

            has_basic_perms = all(
                "✅" in result for result in list(permission_results.values())[:3]
            )
            self.record_test(
                "token_permissions",
                has_basic_perms,
                "Permission check completed",
                permission_results,
            )

        except Exception as e:
            self.record_test("token_permissions", False, f"Permission test failed: {str(e)}")

    async def test_workspace_access(self):
        """Test workspace information access"""
        try:
            team_info = self.client.team_info()["team"]

            workspace_data = {
                "name": team_info.get("name"),
                "domain": team_info.get("domain"),
                "id": team_info.get("id"),
                "plan": team_info.get("plan"),
            }

            expected_workspace = "candlefish"
            if "candlefish" in workspace_data.get("domain", "").lower():
                self.record_test(
                    "workspace_access", True, "Connected to correct workspace", workspace_data
                )
            else:
                self.record_test(
                    "workspace_access",
                    False,
                    f"Connected to unexpected workspace: {workspace_data.get('domain')}",
                )

        except SlackApiError as e:
            self.record_test(
                "workspace_access", False, f"Cannot access workspace info: {e.response['error']}"
            )

    async def test_channel_operations(self):
        """Test channel management capabilities"""
        try:
            # Test channel listing
            channels = self.client.conversations_list(types="public_channel,private_channel")
            channel_count = len(channels["channels"])

            if channel_count > 0:
                self.record_test("channel_listing", True, f"Can access {channel_count} channels")

                # Test channel details for first channel
                first_channel = channels["channels"][0]
                try:
                    channel_info = self.client.conversations_info(channel=first_channel["id"])
                    self.record_test(
                        "channel_details",
                        True,
                        f"Can access channel details for #{first_channel.get('name')}",
                    )
                except SlackApiError as e:
                    self.record_test(
                        "channel_details",
                        False,
                        f"Cannot access channel details: {e.response['error']}",
                    )
            else:
                self.record_test("channel_listing", False, "No channels accessible")

        except SlackApiError as e:
            self.record_test(
                "channel_operations", False, f"Channel operations failed: {e.response['error']}"
            )

    async def test_user_operations(self):
        """Test user management capabilities"""
        try:
            # Test user listing
            users = self.client.users_list()
            user_count = len(users["members"])
            active_users = [u for u in users["members"] if not u.get("deleted")]

            self.record_test(
                "user_listing", True, f"Can access {user_count} users ({len(active_users)} active)"
            )

            # Test getting user info for the bot itself
            auth_info = self.client.auth_test()
            try:
                user_info = self.client.users_info(user=auth_info["user_id"])
                self.record_test("user_details", True, "Can access user details")
            except SlackApiError as e:
                self.record_test(
                    "user_details", False, f"Cannot access user details: {e.response['error']}"
                )

        except SlackApiError as e:
            self.record_test(
                "user_operations", False, f"User operations failed: {e.response['error']}"
            )

    async def test_message_capabilities(self):
        """Test message posting capabilities"""
        try:
            # Find a suitable channel for testing (look for #general or #random)
            channels = self.client.conversations_list()["channels"]
            test_channel = None

            for channel in channels:
                if channel["name"] in ["general", "random", "testing"] and not channel.get(
                    "is_archived"
                ):
                    test_channel = channel
                    break

            if test_channel:
                # Test if bot can post messages (don't actually post in this test)
                # Instead, test if we can get channel history
                try:
                    history = self.client.conversations_history(channel=test_channel["id"], limit=1)
                    self.record_test(
                        "message_access",
                        True,
                        f"Can access message history in #{test_channel['name']}",
                    )
                except SlackApiError as e:
                    self.record_test(
                        "message_access", False, f"Cannot access messages: {e.response['error']}"
                    )
            else:
                self.record_test("message_capabilities", False, "No suitable test channel found")

        except SlackApiError as e:
            self.record_test(
                "message_capabilities",
                False,
                f"Message capability test failed: {e.response['error']}",
            )

    async def test_monitoring_integration(self):
        """Test monitoring service integration"""
        try:
            monitoring = get_monitoring_service()

            # Test health checks
            health_status = await monitoring.get_health_status()

            if health_status and "overall_healthy" in health_status:
                self.record_test(
                    "monitoring_health", True, "Monitoring service operational", health_status
                )
            else:
                self.record_test("monitoring_health", False, "Monitoring service not responding")

        except Exception as e:
            self.record_test("monitoring_integration", False, f"Monitoring test failed: {str(e)}")

    async def test_aws_secrets_integration(self):
        """Test AWS Secrets Manager integration"""
        try:
            # Test loading configuration from secrets
            config = config_manager.load_from_secrets_manager()

            if config.user_token or config.bot_token:
                self.record_test(
                    "aws_secrets", True, "Successfully loaded tokens from AWS Secrets Manager"
                )
            else:
                self.record_test("aws_secrets", False, "No tokens found in AWS Secrets Manager")

        except Exception as e:
            self.record_test("aws_secrets_integration", False, f"AWS Secrets test failed: {str(e)}")

    async def run_all_tests(self):
        """Run complete test suite"""
        logger.info("Starting Slack Admin Bot test suite")

        # Initialize client
        if not await self.initialize():
            logger.error("Failed to initialize - aborting tests")
            return self.test_results

        # Run all tests
        test_functions = [
            self.test_authentication,
            self.test_token_permissions,
            self.test_workspace_access,
            self.test_channel_operations,
            self.test_user_operations,
            self.test_message_capabilities,
            self.test_monitoring_integration,
            self.test_aws_secrets_integration,
        ]

        for test_func in test_functions:
            try:
                await test_func()
            except Exception as e:
                test_name = test_func.__name__
                self.record_test(test_name, False, f"Test execution failed: {str(e)}")

        return self.test_results

    def generate_test_report(self) -> str:
        """Generate comprehensive test report"""
        results = self.test_results

        report = f"""
🧪 SLACK ADMIN BOT TEST REPORT
{'=' * 50}

SUMMARY:
  Total Tests: {results['total_tests']}
  Passed: ✅ {results['passed_tests']}
  Failed: ❌ {results['failed_tests']}
  Success Rate: {(results['passed_tests'] / results['total_tests'] * 100):.1f}%

DETAILED RESULTS:
"""

        for test in results["test_details"]:
            status = "✅ PASS" if test["passed"] else "❌ FAIL"
            report += f"\n  {status} {test['name']}"
            if test["details"]:
                report += f"\n    └─ {test['details']}"

        report += f"\n\n{'=' * 50}\n"

        if results["failed_tests"] == 0:
            report += "🎉 ALL TESTS PASSED! Bot is ready for deployment.\n"
        else:
            report += (
                f"⚠️  {results['failed_tests']} test(s) failed. Please review before deployment.\n"
            )

        return report


async def main():
    """Main test execution"""
    tester = SlackBotTester()

    print("🚀 Starting Slack Admin Bot Implementation Test")
    print("=" * 60)

    results = await tester.run_all_tests()

    # Generate and display report
    report = tester.generate_test_report()
    print(report)

    # Save detailed results to file
    with open("test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)

    print("📝 Detailed test results saved to: test_results.json")

    # Exit with appropriate code
    if results["failed_tests"] == 0:
        print("✅ All tests passed - bot implementation is ready!")
        sys.exit(0)
    else:
        print(f"❌ {results['failed_tests']} test(s) failed - please review issues")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
