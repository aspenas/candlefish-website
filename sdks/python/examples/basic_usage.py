#!/usr/bin/env python3
"""
Basic usage example for the Candlefish Claude Config Python SDK.

This example demonstrates:
- Client initialization
- Creating, reading, updating, and deleting configuration profiles
- Error handling
- Basic analytics

For more examples, visit: https://docs.candlefish.ai/sdks/python/examples
"""

import os
from candlefish_claude_config import (
    CandlefishClaudeConfigClient,
    ConfigProfile,
    ValidationError,
    NotFoundError,
    AuthenticationError
)


def main():
    """Main example function."""
    
    # Initialize the client
    # Get API key from environment variable or replace with your key
    api_key = os.getenv("CANDLEFISH_API_KEY", "your-api-key-here")
    
    if api_key == "your-api-key-here":
        print("⚠️  Please set your API key in the CANDLEFISH_API_KEY environment variable")
        print("   or replace 'your-api-key-here' in this example")
        return
    
    try:
        # Create client instance
        client = CandlefishClaudeConfigClient(
            api_key=api_key,
            tier="Pro"  # Or "Free" or "Enterprise"
        )
        
        print("🔍 Testing API connection...")
        if not client.health_check():
            print("❌ API health check failed")
            return
        
        print("✅ API connection successful")
        
        # Get API version info
        version_info = client.get_api_version()
        print(f"📊 API Version: {version_info.get('version', 'unknown')}")
        
        # List existing profiles
        print("\n📋 Listing existing profiles...")
        existing_profiles = client.list_profiles()
        print(f"Found {len(existing_profiles)} existing profiles:")
        
        for profile in existing_profiles[:3]:  # Show first 3
            print(f"  - {profile.name} (v{profile.version}) - {profile.profile_id}")
        
        # Create a new configuration profile
        print("\n✨ Creating a new configuration profile...")
        new_profile = ConfigProfile(
            name="Example DevOps Configuration",
            description="Sample configuration for demonstration purposes",
            settings={
                "languages": ["python", "javascript", "go"],
                "tools": {
                    "package_managers": ["poetry", "npm", "go mod"],
                    "containerization": "docker",
                    "orchestration": "kubernetes"
                },
                "environment": {
                    "development": {
                        "auto_reload": True,
                        "debug": True
                    },
                    "production": {
                        "auto_reload": False,
                        "debug": False,
                        "monitoring": True
                    }
                }
            },
            metadata={
                "created_by": "sdk-example",
                "team": "platform-engineering",
                "purpose": "demonstration"
            }
        )
        
        created_profile = client.create_profile(new_profile)
        print(f"✅ Created profile: {created_profile.name}")
        print(f"   Profile ID: {created_profile.profile_id}")
        
        # Retrieve the profile we just created
        print(f"\n🔍 Retrieving profile {created_profile.profile_id}...")
        retrieved_profile = client.get_profile(created_profile.profile_id)
        print(f"✅ Retrieved profile: {retrieved_profile.name}")
        print(f"   Description: {retrieved_profile.description}")
        print(f"   Languages: {retrieved_profile.settings.get('languages', [])}")
        
        # Update the profile
        print(f"\n📝 Updating profile {created_profile.profile_id}...")
        retrieved_profile.description = "Updated sample configuration (modified by SDK example)"
        retrieved_profile.settings["tools"]["ci_cd"] = ["github-actions", "jenkins"]
        retrieved_profile.metadata["last_modified_by"] = "sdk-example-update"
        
        updated_profile = client.update_profile(retrieved_profile)
        print(f"✅ Updated profile: {updated_profile.name}")
        print(f"   New description: {updated_profile.description}")
        
        # Get analytics (if available for your tier)
        print("\n📈 Getting analytics...")
        try:
            analytics = client.get_analytics()
            total_requests = analytics.get('total_requests', 'N/A')
            print(f"   Total API requests: {total_requests}")
            
            if 'top_profile' in analytics:
                print(f"   Most used profile: {analytics['top_profile']}")
                
        except Exception as e:
            print(f"   Analytics not available: {e}")
        
        # Check rate limiting status
        rate_limit = client.get_rate_limit_status()
        if rate_limit:
            print(f"\n⚡ Rate limit status:")
            print(f"   Tier: {rate_limit.tier}")
            print(f"   Requests remaining: {rate_limit.remaining}/{rate_limit.requests_per_minute}")
            if rate_limit.max_profiles:
                print(f"   Max profiles: {rate_limit.max_profiles}")
        
        # Clean up - delete the example profile
        print(f"\n🗑️  Cleaning up - deleting profile {created_profile.profile_id}...")
        success = client.delete_profile(created_profile.profile_id)
        
        if success:
            print("✅ Profile deleted successfully")
        else:
            print("❌ Failed to delete profile")
        
        print("\n🎉 Example completed successfully!")
        
    except AuthenticationError as e:
        print(f"🔐 Authentication failed: {e}")
        print("   Please check your API key and permissions")
        
    except ValidationError as e:
        print(f"❌ Validation error: {e}")
        if e.validation_errors:
            print("   Validation errors:")
            for error in e.validation_errors:
                print(f"     - {error}")
                
    except NotFoundError as e:
        print(f"🔍 Resource not found: {e}")
        
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        print("   Please check the logs for more details")


if __name__ == "__main__":
    main()