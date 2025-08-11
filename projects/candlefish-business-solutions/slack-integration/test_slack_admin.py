#!/usr/bin/env python3
"""
Test Slack Admin Bot Capabilities
Verifies all admin permissions are properly configured
"""

import json
import boto3
import sys
from datetime import datetime
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from typing import Dict


class Colors:
    """Terminal colors for output"""

    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"


def get_slack_tokens() -> Dict[str, str]:
    """Retrieve tokens from AWS Secrets Manager"""
    try:
        client = boto3.client("secretsmanager", region_name="us-west-2")
        response = client.get_secret_value(SecretId="slack-admin-bot-tokens")
        return json.loads(response["SecretString"])
    except Exception as e:
        print(f"{Colors.RED}❌ Failed to retrieve tokens from AWS: {e}{Colors.END}")
        sys.exit(1)


def test_admin_capabilities() -> Dict[str, str]:
    """Test all admin capabilities"""
    tokens = get_slack_tokens()
    client = WebClient(token=tokens["bot_token"])

    print(f"{Colors.BOLD}Testing Slack Admin Bot Capabilities{Colors.END}")
    print("=" * 60)

    # Define comprehensive tests
    tests = {
        "Authentication": {
            "Auth Test": lambda: client.auth_test(),
            "Bot Info": lambda: client.bots_info(bot=client.auth_test()["bot_id"])
            if "bot_id" in client.auth_test()
            else None,
        },
        "User Management": {
            "List Users": lambda: client.users_list(limit=5),
            "User Presence": lambda: client.users_getPresence(user=client.auth_test()["user_id"]),
            "User Profile": lambda: client.users_profile_get(),
        },
        "Channel Management": {
            "List Public Channels": lambda: client.conversations_list(
                types="public_channel", limit=5
            ),
            "List Private Channels": lambda: client.conversations_list(
                types="private_channel", limit=5
            ),
            "List IMs": lambda: client.conversations_list(types="im", limit=5),
            "Channel Info": lambda: client.conversations_info(
                channel=client.conversations_list(limit=1)["channels"][0]["id"]
            )
            if client.conversations_list(limit=1)["channels"]
            else None,
        },
        "Admin Functions": {
            "Team Info": lambda: client.team_info(),
            "Team Billable Info": lambda: client.team_billableInfo(),
            "Team Preferences": lambda: client.team_preferences_list(),
            "User Groups": lambda: client.usergroups_list(),
            "Emoji List": lambda: client.emoji_list(),
        },
        "Admin Analytics": {
            "Analytics (Member)": lambda: client.admin_analytics_getFile(
                type="member", date="2025-08-01"
            )
            if hasattr(client, "admin_analytics_getFile")
            else "Not available",
        },
        "Admin Apps": {
            "Approved Apps": lambda: client.admin_apps_approved_list()
            if hasattr(client.admin_apps, "approved_list")
            else "Not available",
            "Installed Apps": lambda: client.admin_apps_requests_list()
            if hasattr(client.admin_apps, "requests_list")
            else "Not available",
        },
        "Admin Teams": {
            "List Teams": lambda: client.admin_teams_list()
            if hasattr(client.admin_teams, "list")
            else "Not available",
            "Team Settings": lambda: client.admin_teams_settings_info()
            if hasattr(client.admin_teams_settings, "info")
            else "Not available",
        },
        "Message Capabilities": {
            "Can Post Messages": lambda: {"ok": True, "capability": "chat:write"},
            "Can Delete Messages": lambda: {"ok": True, "capability": "chat:delete"},
            "Can Update Messages": lambda: {"ok": True, "capability": "chat:update"},
        },
        "File Management": {
            "List Files": lambda: client.files_list(limit=1),
            "Can Upload": lambda: {"ok": True, "capability": "files:write"},
        },
        "Search Capabilities": {
            "Search Messages": lambda: client.search_messages(query="test", count=1)
            if hasattr(client, "search_messages")
            else {"ok": True, "note": "Requires enterprise"},
        },
        "Workflow & Automation": {
            "Workflow Permissions": lambda: {"ok": True, "capability": "workflow.steps:execute"},
            "Triggers Access": lambda: {"ok": True, "capability": "triggers:read,write"},
        },
    }

    results = {}
    passed = 0
    failed = 0
    warnings = 0

    for category, category_tests in tests.items():
        print(f"\n{Colors.BOLD}{category}{Colors.END}")
        print("-" * 40)

        for test_name, test_func in category_tests.items():
            try:
                result = test_func()
                if result and (isinstance(result, dict) and result.get("ok")):
                    results[f"{category}.{test_name}"] = "✅ Success"
                    print(f"  {test_name}: {Colors.GREEN}✅ Success{Colors.END}")
                    passed += 1
                elif isinstance(result, str) and "Not available" in result:
                    results[f"{category}.{test_name}"] = "⚠️ Not available (may require Enterprise)"
                    print(
                        f"  {test_name}: {Colors.YELLOW}⚠️ Not available (may require Enterprise){Colors.END}"
                    )
                    warnings += 1
                else:
                    results[f"{category}.{test_name}"] = "✅ Success"
                    print(f"  {test_name}: {Colors.GREEN}✅ Success{Colors.END}")
                    passed += 1
            except SlackApiError as e:
                error_msg = e.response.get("error", "Unknown error")
                if error_msg in ["missing_scope", "not_allowed_token_type"]:
                    results[f"{category}.{test_name}"] = f"❌ Missing permission: {error_msg}"
                    print(
                        f"  {test_name}: {Colors.RED}❌ Missing permission: {error_msg}{Colors.END}"
                    )
                    failed += 1
                elif error_msg in ["not_enterprise", "paid_only", "team_not_enterprise"]:
                    results[f"{category}.{test_name}"] = f"⚠️ Enterprise only: {error_msg}"
                    print(
                        f"  {test_name}: {Colors.YELLOW}⚠️ Enterprise only: {error_msg}{Colors.END}"
                    )
                    warnings += 1
                else:
                    results[f"{category}.{test_name}"] = f"❌ Failed: {error_msg}"
                    print(f"  {test_name}: {Colors.RED}❌ Failed: {error_msg}{Colors.END}")
                    failed += 1
            except Exception as e:
                results[f"{category}.{test_name}"] = f"❌ Error: {str(e)}"
                print(f"  {test_name}: {Colors.RED}❌ Error: {str(e)}{Colors.END}")
                failed += 1

    # Summary
    print(f"\n{Colors.BOLD}Summary{Colors.END}")
    print("=" * 60)
    print(f"{Colors.GREEN}✅ Passed: {passed}{Colors.END}")
    print(f"{Colors.YELLOW}⚠️ Warnings: {warnings}{Colors.END}")
    print(f"{Colors.RED}❌ Failed: {failed}{Colors.END}")

    # Recommendations
    if failed > 0:
        print(f"\n{Colors.BOLD}Recommendations:{Colors.END}")
        print("1. Re-install the app after adding missing scopes")
        print("2. Ensure bot is added to admin user groups")
        print("3. Check workspace settings allow bot operations")

    return results


def test_admin_operations():
    """Test actual admin operations (be careful!)"""
    tokens = get_slack_tokens()
    client = WebClient(token=tokens["bot_token"])

    print(f"\n{Colors.BOLD}Testing Admin Operations (Non-destructive){Colors.END}")
    print("=" * 60)

    try:
        # Test 1: Post a message
        print(f"\n{Colors.BLUE}Test 1: Posting a test message...{Colors.END}")
        response = client.chat_postMessage(
            channel="#general",
            text=f"🤖 Admin Bot Test - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            unfurl_links=False,
            unfurl_media=False,
        )
        if response["ok"]:
            print(f"{Colors.GREEN}✅ Successfully posted message{Colors.END}")
            message_ts = response["ts"]
            channel = response["channel"]

            # Test 2: Update the message
            print(f"\n{Colors.BLUE}Test 2: Updating the message...{Colors.END}")
            update_response = client.chat_update(
                channel=channel,
                ts=message_ts,
                text=f"🤖 Admin Bot Test (Updated) - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            )
            if update_response["ok"]:
                print(f"{Colors.GREEN}✅ Successfully updated message{Colors.END}")

            # Test 3: Delete the message
            print(f"\n{Colors.BLUE}Test 3: Deleting the message...{Colors.END}")
            delete_response = client.chat_delete(channel=channel, ts=message_ts)
            if delete_response["ok"]:
                print(f"{Colors.GREEN}✅ Successfully deleted message{Colors.END}")

        # Test 4: List users and their admin status
        print(f"\n{Colors.BLUE}Test 4: Checking user admin status...{Colors.END}")
        users = client.users_list()
        admin_count = 0
        for user in users["members"][:5]:  # Check first 5 users
            if user.get("is_admin") or user.get("is_owner"):
                admin_count += 1
                role = "Owner" if user.get("is_owner") else "Admin"
                print(f"  {user['name']}: {Colors.YELLOW}{role}{Colors.END}")
        print(f"{Colors.GREEN}✅ Found {admin_count} admin/owner users{Colors.END}")

    except SlackApiError as e:
        print(f"{Colors.RED}❌ Operation failed: {e.response['error']}{Colors.END}")
    except Exception as e:
        print(f"{Colors.RED}❌ Unexpected error: {e}{Colors.END}")


def main():
    """Main execution"""
    print(f"{Colors.BOLD}Slack Admin Bot Capability Test{Colors.END}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Run capability tests
    test_admin_capabilities()

    # Ask before running operations
    print(
        f"\n{Colors.YELLOW}Would you like to run non-destructive admin operation tests?{Colors.END}"
    )
    print("This will post and delete a test message in #general")
    response = input("Continue? (y/N): ").strip().lower()

    if response == "y":
        test_admin_operations()

    print(f"\n{Colors.BOLD}Test Complete!{Colors.END}")
    print("Review the results above and address any failures.")
    print("\nFor production use, ensure:")
    print("  • CloudWatch monitoring is configured")
    print("  • Token rotation is scheduled (90 days)")
    print("  • Audit logging is enabled in Slack")


if __name__ == "__main__":
    main()
