# SurveyJS License Activation Guide

## Overview
This guide explains how to add your SurveyJS license key to remove trial watermarks and enable full features.

## What You Need
- A valid SurveyJS license key
- Purchase from: https://surveyjs.io/buy

## Setup Instructions

### Method 1: Using Environment Variables (Recommended)

This is the recommended approach as it keeps your license key secure and separate from your code.

#### Step 1: Add License Key to Environment File

Add your license key to `.env.local`:

```env
# SurveyJS License Key
NEXT_PUBLIC_SURVEYJS_LICENSE_KEY="YOUR_LICENSE_KEY_HERE"
```

**Important:** 
- Replace `YOUR_LICENSE_KEY_HERE` with your actual license key
- The `NEXT_PUBLIC_` prefix is required for Next.js client-side access
- Never commit `.env.local` to version control (it's already in `.gitignore`)

#### Step 2: Restart Development Server

After adding the license key, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

#### Step 3: Verify Activation

Check your browser console. You should see:
```
✅ SurveyJS Core license activated
✅ SurveyJS Creator license activated
```

If you see a warning instead:
```
⚠️ SurveyJS license key not found. Add NEXT_PUBLIC_SURVEYJS_LICENSE_KEY to your .env.local file
```
Make sure you added the key correctly and restarted the server.

### Method 2: Direct License Key (Not Recommended for Production)

If you prefer to hardcode the license key (not recommended for production):

#### Edit the Configuration File

Open `src/lib/surveyjs-config.ts` and modify the `setSurveyJSLicense` function:

```typescript
export function setSurveyJSLicense() {
  // Replace with your actual license key
  const LICENSE_KEY = "YOUR_LICENSE_KEY_HERE";
  
  // ... rest of the code
}
```

**Warning:** This method exposes your license key in the source code. Only use for testing.

## Where License is Applied

The license has been automatically integrated into:

### 1. Survey Creator (Admin)
- **File:** `src/app/admin/creator/page.tsx`
- **Used for:** Creating and editing surveys in the admin panel
- License is set when the creator initializes

### 2. Survey Creator Component
- **File:** `src/components/SurveyCreator.tsx`
- **Used for:** Reusable survey creator component
- License is set on component mount

### 3. Survey Rendering (Users)
- **File:** `src/components/Survey.tsx`
- **Used for:** Displaying surveys to end users
- License is set when survey loads

## Verification

### Check for Trial Watermark
1. Navigate to `/admin/creator` (Survey Creator)
2. If the license is active, you should NOT see:
   - "Trial version" watermark
   - "Please purchase a license" message

### Check Console Logs
Open browser DevTools (F12) and check the Console tab:
- ✅ Success: "SurveyJS Core license activated" and "SurveyJS Creator license activated"
- ❌ Warning: "SurveyJS license key not found"

## Production Deployment

### For Vercel, Netlify, or other hosting platforms:

1. **Add Environment Variable in Hosting Dashboard:**
   - Go to your project settings
   - Find "Environment Variables" section
   - Add: `NEXT_PUBLIC_SURVEYJS_LICENSE_KEY` = `your_license_key`

2. **Redeploy your application**

### For Docker:

Add to your `docker-compose.yml` or Dockerfile:

```yaml
environment:
  - NEXT_PUBLIC_SURVEYJS_LICENSE_KEY=your_license_key
```

Or pass it at runtime:
```bash
docker run -e NEXT_PUBLIC_SURVEYJS_LICENSE_KEY=your_license_key ...
```

## Troubleshooting

### License Not Working?

1. **Check Environment Variable Name**
   - Must be exactly: `NEXT_PUBLIC_SURVEYJS_LICENSE_KEY`
   - Case-sensitive!

2. **Restart Development Server**
   - Environment variables are only loaded on server start
   - Stop (Ctrl+C) and restart: `npm run dev`

3. **Check Browser Console**
   - Look for activation messages or errors
   - Open DevTools (F12) → Console tab

4. **Verify License Key**
   - Make sure you copied the entire key
   - No extra spaces or quotes
   - Key should be a long string of characters

5. **Clear Browser Cache**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear browser cache completely

### Still Seeing Trial Watermark?

1. Check if your license is valid and not expired
2. Verify the license type matches your usage (Creator + Core)
3. Contact SurveyJS support: https://surveyjs.io/support

## License Types

Make sure you have the correct license for your needs:

- **Survey Creator License**: For the survey builder/editor
- **Survey Library License**: For rendering surveys to users
- **Complete Package**: Includes both Creator and Library

Most applications need the **Complete Package** to cover both admin (creator) and user (survey rendering) functionality.

## Security Best Practices

✅ **DO:**
- Use environment variables (`.env.local`)
- Keep `.env.local` in `.gitignore`
- Use different keys for development and production
- Rotate keys periodically

❌ **DON'T:**
- Commit license keys to version control
- Share license keys publicly
- Hardcode keys in source files
- Use production keys in development

## Additional Resources

- **SurveyJS Documentation**: https://surveyjs.io/documentation
- **License Management**: https://surveyjs.io/account
- **Support**: https://surveyjs.io/support

## Files Modified

The following files have been updated to support license activation:

1. `src/lib/surveyjs-config.ts` - Central license configuration
2. `src/app/admin/creator/page.tsx` - Admin survey creator
3. `src/components/SurveyCreator.tsx` - Reusable creator component
4. `src/components/Survey.tsx` - Survey rendering component

## Example .env.local File

```env
# Database Configuration
DATABASE_URL="mysql://root:root@localhost:3306/happiness_survey?socketPath=/Applications/MAMP/tmp/mysql/mysql.sock"
DB_SOCKET_PATH="/Applications/MAMP/tmp/mysql/mysql.sock"
NODE_ENV="development"

# SurveyJS License Key
NEXT_PUBLIC_SURVEYJS_LICENSE_KEY="your_actual_license_key_here"

# Other environment variables...
```

---

**Need Help?**
If you encounter any issues, check the browser console for error messages or contact SurveyJS support.

