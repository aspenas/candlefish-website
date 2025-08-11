# Slack Admin Bot Setup Guide - Maximum Privileges for Autonomous Agent

## Overview
This guide configures a Slack bot with **maximum admin/owner privileges** for autonomous workflow execution. This bot will have full control over your workspace.

## Prerequisites
- Slack Workspace Owner or Admin access
- AWS CLI configured
- Access to candlefish.ai Slack workspace

## Step 1: Create Slack App with Admin Privileges

### 1.1 Create New App
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Name: `Candlefish Admin Agent`
5. Workspace: Select your candlefish.ai workspace
6. Click **"Create App"**

### 1.2 Configure App Settings
Navigate to **Basic Information**:
- Save these values immediately:
  ```
  Client ID: [will appear here]
  Client Secret: [will appear here] 
  Signing Secret: [will appear here]
  Verification Token: [will appear here]
  ```

## Step 2: Configure OAuth & Permissions (Maximum Scopes)

Navigate to **OAuth & Permissions** and add ALL these Bot Token Scopes:

### Admin & Management Scopes
```
admin.analytics:read
admin.apps:read
admin.apps:write
admin.barriers:read
admin.barriers:write
admin.conversations:read
admin.conversations:write
admin.invites:read
admin.invites:write
admin.teams:read
admin.teams:write
admin.usergroups:read
admin.usergroups:write
admin.users:read
admin.users:write
```

### Workspace Management
```
channels:history
channels:join
channels:manage
channels:read
channels:write
groups:history
groups:read
groups:write
im:history
im:read
im:write
mpim:history
mpim:read
mpim:write
```

### User & Team Management
```
users:read
users:read.email
users:write
users.profile:read
users.profile:write
team:read
usergroups:read
usergroups:write
```

### Message & Content Control
```
chat:write
chat:write.customize
chat:write.public
files:read
files:write
pins:read
pins:write
reactions:read
reactions:write
```

### Workflow & Automation
```
workflow.steps:execute
triggers:read
triggers:write
bookmarks:read
bookmarks:write
calls:read
calls:write
```

### Search & Discovery
```
search:read
discovery:read
discovery:write
```

### Presence & Status
```
dnd:read
dnd:write
emoji:read
presence:read
presence:write
```

### Remote Management
```
remote_files:read
remote_files:share
remote_files:write
```

### Metadata Access
```
metadata.message:read
app_configurations:write
authorizations:read
connections:read
connections:write
```

## Step 3: Enable Socket Mode for Real-time Events

1. Navigate to **Socket Mode** in the left sidebar
2. Toggle **Enable Socket Mode** to ON
3. Generate an App-Level Token:
   - Token Name: `admin-socket-token`
   - Add scope: `connections:write`
   - Click **Generate**
   - Save the token (starts with `xapp-`)

## Step 4: Configure Event Subscriptions

Navigate to **Event Subscriptions**:
1. Toggle **Enable Events** to ON
2. Subscribe to bot events:
   ```
   app_home_opened
   app_mention
   app_rate_limited
   app_requested
   app_uninstalled
   channel_archive
   channel_created
   channel_deleted
   channel_rename
   channel_unarchive
   email_domain_changed
   emoji_changed
   file_change
   file_created
   file_deleted
   file_shared
   group_archive
   group_created
   group_deleted
   group_rename
   group_unarchive
   im_created
   link_shared
   member_joined_channel
   member_left_channel
   message.channels
   message.groups
   message.im
   message.mpim
   pin_added
   pin_removed
   reaction_added
   reaction_removed
   team_domain_change
   team_join
   team_rename
   user_change
   user_huddle_changed
   user_profile_changed
   user_status_changed
   workflow_step_execute
   ```

## Step 5: Install App to Workspace

1. Go to **Install App** in the left sidebar
2. Click **Install to Workspace**
3. Review permissions (will show extensive list)
4. Click **Allow**
5. Save the Bot User OAuth Token (starts with `xoxb-`)

## Step 6: Store Credentials in AWS Secrets Manager

Create a comprehensive secret with all tokens:

```bash
# Create the secret JSON
cat > /tmp/slack-admin-bot.json << 'EOF'
{
  "bot_token": "xoxb-YOUR-BOT-TOKEN",
  "app_token": "xapp-YOUR-APP-TOKEN",
  "client_id": "YOUR-CLIENT-ID",
  "client_secret": "YOUR-CLIENT-SECRET",
  "signing_secret": "YOUR-SIGNING-SECRET",
  "verification_token": "YOUR-VERIFICATION-TOKEN",
  "workspace_id": "YOUR-WORKSPACE-ID",
  "workspace_name": "candlefish.ai",
  "permissions": "admin",
  "created_date": "2025-08-08",
  "app_name": "Candlefish Admin Agent"
}
EOF

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "slack-admin-bot-tokens" \
  --description "Slack Admin Bot with full workspace permissions for autonomous agent" \
  --secret-string file:///tmp/slack-admin-bot.json \
  --region us-west-2

# Clean up temp file
rm /tmp/slack-admin-bot.json
```

## Step 7: Additional Admin Configuration

### 7.1 Add to Admin User Group
1. In Slack, go to **Settings & administration** → **Manage members**
2. Click on **User groups**
3. Add the bot to any admin groups

### 7.2 Configure Workspace Settings
1. Go to **Settings & administration** → **Workspace settings**
2. Under **Permissions** → **Channel Management**:
   - Who can create public channels: **Everyone** (including bots)
   - Who can create private channels: **Everyone** (including bots)
   - Who can archive channels: **Everyone** (including bots)
   - Who can remove members: **Everyone** (including bots)
   - Who can invite: **Everyone** (including bots)

### 7.3 Enable Admin Features
1. Navigate to **Settings & administration** → **Organization settings**
2. Under **Apps**:
   - App approval: Set to **"Members can install any app"**
   - Allow members to install apps via OAuth

## Step 8: Test Admin Capabilities

Create test script to verify all permissions:

```python
#!/usr/bin/env python3
# Save as: test_slack_admin.py

import json
import boto3
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

def get_slack_tokens():
    """Retrieve tokens from AWS Secrets Manager"""
    client = boto3.client('secretsmanager', region_name='us-west-2')
    response = client.get_secret_value(SecretId='slack-admin-bot-tokens')
    return json.loads(response['SecretString'])

def test_admin_capabilities():
    """Test all admin capabilities"""
    tokens = get_slack_tokens()
    client = WebClient(token=tokens['bot_token'])
    
    tests = {
        "Auth Test": lambda: client.auth_test(),
        "List Users": lambda: client.users_list(),
        "List Channels": lambda: client.conversations_list(types="public_channel,private_channel"),
        "List Admin Teams": lambda: client.admin_teams_list(),
        "List Apps": lambda: client.admin_apps_approved_list(),
        "Get Workspace Info": lambda: client.team_info(),
        "List User Groups": lambda: client.usergroups_list(),
        "Get Analytics": lambda: client.admin_analytics_getFile(type="public_channel"),
    }
    
    results = {}
    for test_name, test_func in tests.items():
        try:
            result = test_func()
            results[test_name] = "✅ Success"
            print(f"{test_name}: ✅ Success")
        except SlackApiError as e:
            results[test_name] = f"❌ Failed: {e.response['error']}"
            print(f"{test_name}: ❌ Failed: {e.response['error']}")
    
    return results

if __name__ == "__main__":
    print("Testing Slack Admin Bot Capabilities...")
    print("=" * 50)
    test_admin_capabilities()
```

## Step 9: Security Considerations

### Critical Warnings
⚠️ **This bot has FULL ADMIN ACCESS** to your Slack workspace
⚠️ Can delete channels, remove users, access all messages
⚠️ Can modify workspace settings and configurations
⚠️ Should ONLY be used by trusted autonomous agents

### Best Practices
1. **Audit Logging**: Enable comprehensive audit logs in Slack
2. **Regular Review**: Review bot actions weekly
3. **Rotation**: Rotate tokens every 90 days
4. **Monitoring**: Set up CloudWatch alerts for unusual activity
5. **Restrictions**: Consider IP allowlisting if possible

## Step 10: Integration with Autonomous Agent

### Environment Variables for Agent
```bash
export SLACK_BOT_TOKEN=$(aws secretsmanager get-secret-value --secret-id slack-admin-bot-tokens --region us-west-2 --query SecretString --output text | jq -r .bot_token)
export SLACK_APP_TOKEN=$(aws secretsmanager get-secret-value --secret-id slack-admin-bot-tokens --region us-west-2 --query SecretString --output text | jq -r .app_token)
export SLACK_SIGNING_SECRET=$(aws secretsmanager get-secret-value --secret-id slack-admin-bot-tokens --region us-west-2 --query SecretString --output text | jq -r .signing_secret)
```

### Python SDK Usage Example
```python
from slack_sdk import WebClient
from slack_sdk.socket_mode import SocketModeClient

# Initialize with admin bot token
web_client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])
socket_client = SocketModeClient(
    app_token=os.environ["SLACK_APP_TOKEN"],
    web_client=web_client
)

# Example: Create private channel and add users
response = web_client.conversations_create(
    name="admin-operations",
    is_private=True
)
channel_id = response["channel"]["id"]

# Add all users to channel
users = web_client.users_list()
for user in users["members"]:
    if not user["is_bot"]:
        web_client.conversations_invite(
            channel=channel_id,
            users=user["id"]
        )
```

## Available Admin Actions

With these permissions, your autonomous agent can:

### Channel Management
- Create/delete any channel (public or private)
- Archive/unarchive channels
- Rename channels
- Set channel topics and descriptions
- Manage channel permissions

### User Management
- Invite/remove users from workspace
- Modify user profiles
- Set user statuses
- Manage user groups
- Deactivate accounts

### Message Control
- Post as the app with custom username/icon
- Delete any message
- Pin/unpin messages
- Add reactions
- Thread management

### Workspace Administration
- Access analytics and metrics
- Manage workspace settings
- Control app installations
- Set workspace policies
- Access audit logs

### Automation
- Create workflows
- Set up triggers
- Execute workflow steps
- Manage scheduled messages

## Verification Checklist

- [ ] App created with admin name
- [ ] All OAuth scopes added
- [ ] Socket Mode enabled with app token
- [ ] Event subscriptions configured
- [ ] App installed to workspace
- [ ] Tokens stored in AWS Secrets Manager
- [ ] Bot added to admin user groups
- [ ] Workspace permissions configured
- [ ] Test script confirms all capabilities
- [ ] Audit logging enabled

## Support & Troubleshooting

### Common Issues
1. **"missing_scope" errors**: Re-install app after adding new scopes
2. **"not_allowed_token_type"**: Use bot token, not user token
3. **"channel_not_found"**: Bot needs to be member of private channels
4. **"not_admin"**: Workspace owner must approve admin scopes

### Token Types
- **Bot Token** (`xoxb-`): Primary token for API calls
- **App Token** (`xapp-`): Socket Mode connections
- **User Token** (`xoxp-`): Not needed for bot operations
- **Webhook URL**: For incoming webhooks only

## Next Steps

1. Run the test script to verify all permissions
2. Configure CloudWatch monitoring
3. Set up token rotation schedule
4. Document specific workflows for agent
5. Create rate limit handling strategy

---

**Created**: August 8, 2025  
**Purpose**: Maximum admin privileges for autonomous Slack agent  
**Security Level**: CRITICAL - Full workspace access granted
