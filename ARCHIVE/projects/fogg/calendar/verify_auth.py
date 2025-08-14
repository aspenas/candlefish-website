"""Verify Google authentication is working"""

import sys

from src.auth import build_calendar_service, build_directory_service, get_credentials, verify_scopes

try:
    print("Attempting to get credentials...")
    creds = get_credentials()
    print("✓ Credentials obtained successfully")

    print("\nVerifying scopes...")
    if verify_scopes(creds):
        print("✓ All required scopes are present")
    else:
        print("✗ Missing required scopes")

    print("\nBuilding Calendar service...")
    calendar_service = build_calendar_service()
    print("✓ Calendar service built successfully")

    print("\nBuilding Directory service...")
    directory_service = build_directory_service()
    print("✓ Directory service built successfully")

    print("\n✅ auth complete")

except Exception as e:
    print(f"\n✗ Authentication failed: {e}")
    print("\nPlease ensure:")
    print("1. You have run: gcloud auth application-default login")
    print("2. Your account has access to Google Calendar and Directory APIs")
    print("3. The required APIs are enabled in your GCP project")
    sys.exit(1)
