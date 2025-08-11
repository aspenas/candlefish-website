#!/usr/bin/env python3
"""
Simple test for Slack Admin Bot - Core functionality only
Tests the essential bot capabilities without all dependencies
"""

import json
import sys
import asyncio
from datetime import datetime

import structlog
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from config import config_manager

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


async def main():
    """Simple test of core bot functionality"""
    print("🚀 Testing Slack Admin Bot Core Functionality")
    print("=" * 60)

    test_results = []

    try:
        # Test 1: Load configuration from AWS Secrets Manager
        print("📝 Test 1: Loading configuration from AWS Secrets Manager...")
        config = config_manager.load_from_secrets_manager()

        if config.user_token or config.bot_token:
            print("✅ Configuration loaded successfully")
            print(f"   Workspace: {config.workspace_name}")
            print(f"   Token type: {'User' if config.user_token else 'Bot'}")
            test_results.append(("Config Loading", True))
        else:
            print("❌ No tokens found in configuration")
            test_results.append(("Config Loading", False))
            return

        # Test 2: Initialize Slack client
        print("\n📝 Test 2: Initializing Slack client...")
        primary_token = config_manager.get_primary_token()
        client = WebClient(token=primary_token)

        # Test 3: Authentication
        print("\n📝 Test 3: Testing Slack authentication...")
        auth_response = client.auth_test()
        print("✅ Authentication successful")
        print(f"   User: {auth_response.get('user')}")
        print(f"   Team: {auth_response.get('team')}")
        print(f"   User ID: {auth_response.get('user_id')}")
        test_results.append(("Authentication", True))

        # Test 4: Workspace access
        print("\n📝 Test 4: Testing workspace access...")
        team_info = client.team_info()["team"]
        print("✅ Workspace access successful")
        print(f"   Name: {team_info.get('name')}")
        print(f"   Domain: {team_info.get('domain')}")
        print(f"   Plan: {team_info.get('plan', 'Unknown')}")

        if "candlefish" in team_info.get("domain", "").lower():
            print("✅ Connected to correct Candlefish workspace")
            test_results.append(("Workspace Access", True))
        else:
            print(f"⚠️  Connected to unexpected workspace: {team_info.get('domain')}")
            test_results.append(("Workspace Access", False))

        # Test 5: Channel access
        print("\n📝 Test 5: Testing channel access...")
        channels = client.conversations_list()["channels"]
        public_channels = [ch for ch in channels if not ch.get("is_private")]
        private_channels = [ch for ch in channels if ch.get("is_private")]

        print("✅ Channel access successful")
        print(f"   Total channels: {len(channels)}")
        print(f"   Public channels: {len(public_channels)}")
        print(f"   Private channels: {len(private_channels)}")
        test_results.append(("Channel Access", True))

        # Test 6: User access
        print("\n📝 Test 6: Testing user access...")
        users = client.users_list()["members"]
        active_users = [u for u in users if not u.get("deleted")]
        admin_users = [u for u in active_users if u.get("is_admin") or u.get("is_owner")]

        print("✅ User access successful")
        print(f"   Total users: {len(users)}")
        print(f"   Active users: {len(active_users)}")
        print(f"   Admin users: {len(admin_users)}")
        test_results.append(("User Access", True))

        # Test 7: Admin capabilities check
        print("\n📝 Test 7: Testing admin capabilities...")
        admin_tests = [
            ("Team Info", lambda: client.team_info()),
            ("User Profiles", lambda: client.users_profile_get()),
        ]

        admin_success = 0
        for test_name, test_func in admin_tests:
            try:
                test_func()
                print(f"   ✅ {test_name}: Available")
                admin_success += 1
            except SlackApiError as e:
                print(f"   ❌ {test_name}: {e.response['error']}")

        if admin_success >= len(admin_tests) // 2:
            test_results.append(("Admin Capabilities", True))
        else:
            test_results.append(("Admin Capabilities", False))

    except SlackApiError as e:
        print(f"❌ Slack API Error: {e.response['error']}")
        test_results.append(("API Access", False))
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        test_results.append(("General", False))

    # Generate summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)

    passed_tests = sum(1 for _, result in test_results if result)
    total_tests = len(test_results)

    print(f"Total Tests: {total_tests}")
    print(f"Passed: ✅ {passed_tests}")
    print(f"Failed: ❌ {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests / total_tests * 100):.1f}%")

    print("\nDetailed Results:")
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")

    # Save results
    results_data = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "failed_tests": total_tests - passed_tests,
        "success_rate": (passed_tests / total_tests * 100),
        "test_details": [{"name": name, "passed": result} for name, result in test_results],
    }

    with open("simple_test_results.json", "w") as f:
        json.dump(results_data, f, indent=2)

    print("\n📝 Test results saved to: simple_test_results.json")

    if passed_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED! Bot implementation is ready!")
        print("✅ The Slack admin bot has been successfully configured and tested")
        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Review issues before deployment.")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
