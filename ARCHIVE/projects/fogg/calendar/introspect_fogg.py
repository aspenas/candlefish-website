"""Introspect FOGG calendars and group members"""

import json

from src.introspect import list_all_calendars, list_fogg_calendars, list_group_members

# Constants
FOGG_GROUP_EMAIL = "fogg-leadership@patrick.smith.com"


def main():
    print("=== FOGG Calendar Introspection ===\n")

    # List FOGG calendars
    print("1. Searching for FOGG-related calendars...")
    fogg_calendars = list_fogg_calendars()

    if fogg_calendars:
        print("\nFOGG Calendars found:")
        for cal in fogg_calendars:
            print(f"  - {cal.summary} (ID: {cal.id})")
            print(f"    Access Role: {cal.access_role}")
            if cal.description:
                print(f"    Description: {cal.description}")
    else:
        print("\nNo FOGG-specific calendars found. Listing all calendars:")
        all_calendars = list_all_calendars()
        for cal in all_calendars[:10]:  # Show first 10
            print(f"  - {cal.summary} (ID: {cal.id})")

    # List group members
    print(f"\n2. Listing members of {FOGG_GROUP_EMAIL}...")
    try:
        members = list_group_members(FOGG_GROUP_EMAIL)

        if members:
            print(f"\nGroup members ({len(members)} total):")
            for member in members:
                print(f"  - {member.email} (Role: {member.role}, Type: {member.type})")

            # Save member list for future use
            member_emails = [m.email for m in members]
            with open("fogg_members.json", "w") as f:
                json.dump(member_emails, f, indent=2)
            print("\nMember emails saved to fogg_members.json")
        else:
            print("\nNo members found or unable to access group")

    except Exception as e:
        print(f"\nError accessing group: {e}")
        print("Note: You may need admin permissions to access group membership")

    print("\n✅ introspect complete")


if __name__ == "__main__":
    main()
