# Setting up Resend for Email Notifications

The consideration form is now deployed and working, but needs a proper Resend API key to send emails to hello@candlefish.ai.

## Steps to Complete Setup:

1. **Create Resend Account**
   - Go to https://resend.com
   - Sign up with the candlefish.ai email
   - Verify the domain candlefish.ai for sending emails

2. **Get API Key**
   - In Resend dashboard, go to API Keys
   - Create a new API key with "Send emails" permission
   - Copy the API key (starts with `re_`)

3. **Update Environment Variable**
   ```bash
   # In the website directory, run:
   netlify env:set RESEND_API_KEY "your_actual_resend_api_key_here" --context production --secret
   
   # Or update via AWS Secrets Manager:
   aws secretsmanager update-secret --secret-id "candlefish/resend-api-key" --secret-string '{"api_key": "your_actual_resend_api_key_here"}'
   ```

4. **Test the Setup**
   ```bash
   curl -X POST https://test.candlefish.ai/.netlify/functions/consideration \
     -H "Content-Type: application/json" \
     -d '{
       "yearsInOperation": "5",
       "operationalChallenge": "Test with real email",
       "manualHours": "20",
       "investmentRange": "125-200",
       "name": "Test User",
       "role": "Developer",
       "email": "test@example.com",
       "company": "Test Company"
     }'
   ```

## Current Status:

✅ Netlify Function deployed and working  
✅ Form updated to call Netlify Function endpoint  
✅ Rate limiting and validation implemented  
✅ Environment variable placeholder created  
⏳ Needs real Resend API key for email sending  

## Form Location:
https://test.candlefish.ai/consideration

The form is fully functional and will log all submissions. Once the Resend API key is configured, it will automatically start sending emails to hello@candlefish.ai.
