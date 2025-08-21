# Creating New OAuth 2.0 Credentials Under patrick@candlefish.ai

## Step 1: Sign In with New Account

1. **Sign out** of Google Cloud Console (if currently signed in as patrick.smith@gmail.com)
2. **Sign in** with `patrick@candlefish.ai`
3. **Navigate to**: [OAuth 2.0 Credentials Page](https://console.cloud.google.com/apis/credentials?project=l0-candlefish)

## Step 2: Create New OAuth 2.0 Client ID

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

2. If prompted about OAuth consent screen:
   - Click **"CONFIGURE CONSENT SCREEN"**
   - Choose **"External"** (unless you have Google Workspace)
   - Fill in:
     - App name: `Paintbox`
     - User support email: `patrick@candlefish.ai`
     - Developer contact: `patrick@candlefish.ai`
   - Save and continue through all steps

3. For the OAuth client:
   - **Application type**: `Web application`
   - **Name**: `Paintbox OAuth - Candlefish Account`
   
4. **Authorized JavaScript origins** - Add ALL of these:
   ```
   https://paintbox.fly.dev
   https://paintbox.candlefish.ai
   http://localhost:3000
   ```

5. **Authorized redirect URIs** - Add ALL of these:
   ```
   https://paintbox.fly.dev/api/auth/callback/google
   https://paintbox.candlefish.ai/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

6. Click **"CREATE"**

## Step 3: Save the New Credentials

You'll see a popup with:
- **Client ID**: Something like `330285944301-xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxx`

**IMPORTANT**: Copy these immediately! We'll add them to AWS Secrets Manager.

## Step 4: Store in AWS Secrets Manager

Save the new credentials by running this command (replace with your actual values):

```bash
# Create a new secret for the Candlefish OAuth credentials
aws secretsmanager create-secret \
  --name "paintbox/google-oauth-candlefish" \
  --secret-string '{
    "client_id": "YOUR_NEW_CLIENT_ID",
    "client_secret": "YOUR_NEW_CLIENT_SECRET",
    "project_id": "l0-candlefish",
    "created_by": "patrick@candlefish.ai"
  }' \
  --description "Google OAuth credentials created under patrick@candlefish.ai"
```

## Step 5: Quick Copy Commands

Once you have the new credentials, I'll help you:
1. Store them in AWS Secrets Manager
2. Set up dual OAuth support (both old and new work)
3. Test the new credentials
4. Gradually migrate to the new ones

## Current vs New Credentials

### Current (patrick.smith@gmail.com):
- Client ID: `641173075272-vu85i613rarruqsfst59qve7bvvrrd2s.apps.googleusercontent.com`
- Created by: patrick.smith@gmail.com
- Status: Working, will keep as backup

### New (patrick@candlefish.ai):
- Client ID: (To be created)
- Created by: patrick@candlefish.ai
- Status: Primary going forward

## Why Keep Both?

During migration, we'll run both OAuth clients in parallel:
- No downtime or authentication failures
- Users can log in with either
- Gradual transition over 48-72 hours
- Easy rollback if issues occur

---

**Let me know once you have the new Client ID and Client Secret, and I'll help you set up the dual OAuth configuration!**