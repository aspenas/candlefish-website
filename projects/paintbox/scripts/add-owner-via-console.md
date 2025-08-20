# Adding patrick@candlefish.ai as Owner - Manual Steps

## Option 1: Via Google Cloud Console (Easiest)

1. **Open IAM Page**: 
   [Click here to open IAM for l0-candlefish](https://console.cloud.google.com/iam-admin/iam?project=l0-candlefish)

2. **Grant Access**:
   - Click the **"+ GRANT ACCESS"** button at the top
   - In "New principals" field, enter: `patrick@candlefish.ai`
   - In "Select a role" dropdown, choose: **Owner** (under Basic)
   - Click **SAVE**

3. **Verify**:
   - You should see patrick@candlefish.ai listed with Owner role
   - The account will receive an email notification

## Option 2: Via gcloud CLI (After Authentication)

Once you've authenticated with gcloud using patrick.smith@gmail.com:

```bash
# Set the project
gcloud config set project l0-candlefish

# Add the new owner
gcloud projects add-iam-policy-binding l0-candlefish \
  --member="user:patrick@candlefish.ai" \
  --role="roles/owner"

# Verify the change
gcloud projects get-iam-policy l0-candlefish \
  --flatten="bindings[].members" \
  --format="table(bindings.role,bindings.members)" \
  --filter="bindings.members:patrick@candlefish.ai"
```

## Option 3: Using Authentication Code

If you received an authentication code from the browser:

```bash
# Complete the authentication with the code
gcloud auth login --no-launch-browser
# Then paste the code when prompted

# Switch to the correct account
gcloud config set account patrick.smith@gmail.com
gcloud config set project l0-candlefish

# Then add the owner
gcloud projects add-iam-policy-binding l0-candlefish \
  --member="user:patrick@candlefish.ai" \
  --role="roles/owner"
```

## What Happens Next

After adding patrick@candlefish.ai as owner:

1. **Email Notification**: patrick@candlefish.ai will receive an invitation email
2. **Accept Invitation**: Click the link in the email to accept the role
3. **Access Granted**: Full owner permissions will be active immediately

## Important Notes

- Both accounts will have full owner access (this is safe and normal during migration)
- You can have multiple owners on a Google Cloud project
- The original owner (patrick.smith@gmail.com) remains an owner until explicitly removed
- No services will be disrupted by adding a new owner

## Next Steps After Adding Owner

1. Sign in to Google Cloud Console as patrick@candlefish.ai
2. Verify access to the l0-candlefish project
3. Create new OAuth 2.0 credentials under the new account
4. Update application configuration with new credentials
5. Test both old and new OAuth clients work
6. After verification period (48-72 hours), remove old owner if desired