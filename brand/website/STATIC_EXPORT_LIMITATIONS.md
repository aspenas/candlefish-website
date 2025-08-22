# Static Export Limitations - Consideration Form

## Current Configuration

The website is configured for static export (`output: 'export'` in `next.config.js`) which creates a pre-built static site that can be deployed to any static hosting service.

## API Route Limitation

**IMPORTANT**: Static export does not support API routes. This means the consideration form's API endpoint (`/app/api/consideration/route.ts`) will not work in the exported static build.

## Implementation Status

✅ **Completed**:
- API endpoint created with full validation, rate limiting, and error handling
- Form updated with loading states and proper error handling  
- Comprehensive test suite validates all functionality
- Full integration tested in development mode

❌ **Limitation**:
- API routes don't work in static export mode
- Form submissions will fail in production static build

## Solutions for Production

### Option 1: Server-Side Hosting (Recommended)
Deploy to a platform that supports Node.js server-side rendering:
- Vercel (with API routes enabled)
- Netlify Functions
- AWS Amplify with SSR
- Railway, Render, or Fly.io

**Configuration**: Remove `output: 'export'` from `next.config.js`

### Option 2: External Form Service
Use a third-party form service:
- Formspree
- Netlify Forms 
- Typeform
- Google Forms

**Update required**: Modify form action to point to external service

### Option 3: Client-Side Solution
Implement email sending via client-side service:
- EmailJS
- Web3Forms
- Basin

**Note**: Requires exposing API keys to client-side (security consideration)

## Testing Instructions

To test the full functionality:

1. Comment out `output: 'export'` in `next.config.js`
2. Run `npm run dev`
3. Navigate to `http://localhost:3000/consideration/`
4. Test form submission - should work fully

## Files Created/Modified

- `/app/api/consideration/route.ts` - API endpoint with validation and rate limiting
- `/app/consideration/page.tsx` - Updated form with API integration
- `/__tests__/api/consideration-validation.test.ts` - Comprehensive test suite

## Email Integration

The API endpoint is prepared for email integration. To implement:

1. Install email service (e.g., `npm install @sendgrid/mail`)
2. Add environment variables for email service
3. Uncomment and configure email sending code in the API endpoint
4. Update email template as needed

## Rate Limiting

- Current limit: 2 requests per minute per IP
- Configurable in the API endpoint
- Consider using Redis-based rate limiting for production

## Security Features

- Input validation for all fields
- Email format validation
- Numeric field validation
- CSRF protection ready
- Rate limiting implemented
- Error handling without data exposure
