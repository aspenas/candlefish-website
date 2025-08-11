# Authentication Setup Guide

This guide walks you through setting up Google OAuth authentication for the Paintbox application.

## Overview

The Paintbox app uses NextAuth.js with Google OAuth for authentication. Users can sign in with their Google accounts, and the system automatically handles:

- ✅ User registration and login
- ✅ Session management
- ✅ Route protection
- ✅ First-time user onboarding
- ✅ User profile management
- ✅ Secure logout

## Prerequisites

1. Google Cloud Console access
2. A domain for your application (e.g., `paintbox.app`)
3. Database access (PostgreSQL with Prisma)

## Step 1: Google Cloud Console Setup

### 1.1 Create a New Project (or use existing)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** and **Gmail API**

### 1.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (or Internal for Google Workspace)
3. Fill out the required fields:
   - **App name**: KindHome Paint Estimator
   - **User support email**: Your support email
   - **Developer contact information**: Your email
   - **App domain**: `https://paintbox.app` (your domain)
   - **Authorized domains**: Add your domain (e.g., `paintbox.app`)

4. Add scopes:
   - `email`
   - `profile`
   - `openid`

5. Add test users if needed (for development)

### 1.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Select **Web application**
4. Configure:
   - **Name**: Paintbox Web App
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://paintbox.app` (production)
     - `https://www.paintbox.app` (production with www)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://paintbox.app/api/auth/callback/google` (production)
     - `https://www.paintbox.app/api/auth/callback/google` (production with www)

5. Save and copy the **Client ID** and **Client Secret**

## Step 2: Environment Configuration

### 2.1 Create Environment File

Copy `.env.example` to `.env.local` for development:

```bash
cp .env.example .env.local
```

### 2.2 Configure Authentication Variables

Add these variables to your `.env.local` file:

```env
# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-generated-secret-here

# For production, set this to your domain
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials from Step 1.3
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Restrict to specific domains
ALLOWED_EMAIL_DOMAINS=kindhomepaint.com,candlefish.ai

# Database URL for user storage
DATABASE_URL=postgresql://username:password@localhost:5432/paintbox
```

### 2.3 Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

## Step 3: Database Setup

### 3.1 Run Prisma Migrations

The authentication system requires database tables. Run:

```bash
npx prisma generate
npx prisma db push
```

This creates the necessary tables:
- `User` - User profiles and preferences
- `Account` - OAuth account linking
- `Session` - Active user sessions
- `VerificationToken` - Email verification (if needed)

### 3.2 Verify Database Schema

Check that the tables were created correctly:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('User', 'Account', 'Session', 'VerificationToken');
```

## Step 4: Testing the Authentication Flow

### 4.1 Start the Development Server

```bash
npm run dev
```

### 4.2 Test the Login Flow

1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Google"
3. Complete the OAuth flow
4. Verify you're redirected to the onboarding flow (for first-time users)
5. Complete onboarding
6. Verify you land on the estimate creation page

### 4.3 Test Route Protection

1. Log out
2. Try to access `http://localhost:3000/estimate/new`
3. Verify you're redirected to the login page
4. Log in and verify you're redirected back to the estimate page

## Step 5: Production Deployment

### 5.1 Update Environment Variables

For production, update these variables:

```env
NEXTAUTH_URL=https://paintbox.app
NEXTAUTH_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
DATABASE_URL=your-production-database-url
```

### 5.2 Update Google OAuth Settings

1. In Google Cloud Console, update your OAuth credentials
2. Add production domains to authorized origins and redirects
3. Update the consent screen with production URLs

### 5.3 Database Migration

Run Prisma migrations in production:

```bash
npx prisma migrate deploy
```

## Step 6: Advanced Configuration

### 6.1 Email Domain Restrictions

To restrict authentication to specific email domains, set:

```env
ALLOWED_EMAIL_DOMAINS=kindhomepaint.com,candlefish.ai,yourcompany.com
```

### 6.2 Custom User Roles

The system supports user roles:
- `USER` - Standard user
- `ADMIN` - Admin access to admin panel
- `MANAGER` - Enhanced permissions

Roles are automatically assigned based on email domain or can be manually updated in the database.

### 6.3 Session Configuration

Sessions are configured to:
- Auto-refresh every 5 minutes
- Refresh on window focus
- Expire after inactivity

You can modify these settings in `/app/api/auth/[...nextauth]/route.ts`.

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Verify redirect URIs in Google Console match exactly
   - Check for trailing slashes or missing protocols

2. **"Invalid client ID"**
   - Verify the Client ID is correct and not the Client Secret
   - Check for extra spaces or characters

3. **Database connection errors**
   - Verify DATABASE_URL is correct
   - Ensure database is running and accessible
   - Run `npx prisma db push` to sync schema

4. **Session not persisting**
   - Check NEXTAUTH_SECRET is set and consistent
   - Verify cookies are enabled in browser
   - Check NEXTAUTH_URL matches your domain

5. **Onboarding flow not showing**
   - Verify user `isFirstLogin` field in database
   - Check session data in NextAuth callbacks

### Debug Mode

For debugging, add these environment variables:

```env
NEXTAUTH_DEBUG=true
DEBUG=true
```

This will show detailed logs in the console.

## Security Considerations

1. **Never expose secrets** in client-side code
2. **Use HTTPS** in production
3. **Rotate secrets** regularly
4. **Monitor for suspicious activity**
5. **Keep dependencies updated**
6. **Implement proper CORS** policies
7. **Use secure headers** (already configured in middleware)

## Support

If you encounter issues:

1. Check the [NextAuth.js documentation](https://next-auth.js.org/)
2. Review the Google OAuth setup guide
3. Check application logs for specific error messages
4. Verify environment variables are correctly set

For KindHome Paint specific issues, contact the development team.
