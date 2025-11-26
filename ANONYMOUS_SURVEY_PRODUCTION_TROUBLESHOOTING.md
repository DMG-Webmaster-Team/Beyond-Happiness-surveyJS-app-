# Anonymous Survey Production Troubleshooting Guide

## Common Production Issues

### Issue 1: Boolean Value Handling (Most Common)

**Problem:** MySQL/MariaDB stores booleans as `TINYINT(1)` (0 or 1), but JavaScript expects `true`/`false`.

**Symptoms:**
- Anonymous surveys work locally but fail in production
- `isAnonymous` field returns `1` or `0` instead of `true`/`false`
- API returns `isAnonymous: 1` but code checks for `isAnonymous === true`

**Solution:**
The code should handle both:
```typescript
// ✅ CORRECT - Handles both boolean and number
const isAnonymous = survey.isAnonymous === true || survey.isAnonymous === 1;

// ❌ WRONG - Only checks boolean
const isAnonymous = survey.isAnonymous === true;
```

**Check:**
```bash
# In production database
SELECT id, title, is_anonymous, typeof(is_anonymous) FROM surveys WHERE is_anonymous = 1 LIMIT 1;
```

**Fix Applied:**
The code in `src/app/api/survey-session/[surveyId]/route.ts` uses:
```typescript
isAnonymous: Boolean(surveyData.isAnonymous)
```
This converts `1`/`0` to `true`/`false` correctly.

---

### Issue 2: Environment Variables

**Problem:** Production environment variables not set correctly.

**Check:**
```bash
# In production
echo $NODE_ENV
echo $DATABASE_URL
```

**Common Issues:**
- `NODE_ENV` not set to `production`
- `DATABASE_URL` pointing to wrong database
- Missing environment variables in deployment platform

**Solution:**
Ensure all environment variables are set in your deployment platform (Vercel, AWS, etc.)

---

### Issue 3: Database Schema Migration

**Problem:** `is_anonymous` column doesn't exist in production database.

**Check:**
```sql
-- Check if column exists
SHOW COLUMNS FROM surveys LIKE 'is_anonymous';

-- Or check schema
DESCRIBE surveys;
```

**Solution:**
Run migration in production:
```bash
npm run db:push
```

Or manually:
```sql
ALTER TABLE surveys ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
```

---

### Issue 4: Caching Issues

**Problem:** Production CDN or caching layer caching old responses.

**Symptoms:**
- Changes work locally but not in production
- Old API responses cached

**Solution:**
1. Clear CDN cache (if using Vercel, Cloudflare, etc.)
2. Check API response headers:
   ```typescript
   // Should have:
   "Cache-Control": "no-store, no-cache, must-revalidate"
   "Pragma": "no-cache"
   "Expires": "0"
   ```

**Check:**
```bash
curl -I https://your-production-url.com/api/survey-session/SURVEY_ID
```

---

### Issue 5: Middleware Blocking Anonymous Access

**Problem:** Middleware redirecting anonymous users before API check.

**Check:**
```typescript
// src/middleware.ts
// Should allow anonymous survey routes
```

**Solution:**
Ensure middleware allows `/user/survey/[surveyId]` routes for anonymous surveys.

---

### Issue 6: Database Connection Issues

**Problem:** Production database connection failing or using wrong database.

**Check:**
```bash
# Test database connection
npm run db:studio
# Or check health endpoint
curl https://your-production-url.com/api/health
```

**Solution:**
- Verify `DATABASE_URL` is correct
- Check database is accessible from production server
- Verify SSL/TLS settings if required

---

## Testing Checklist

### Pre-Deployment Checklist

- [ ] `is_anonymous` column exists in production database
- [ ] Database migration completed successfully
- [ ] Environment variables set correctly
- [ ] Code handles boolean values correctly (`1`/`0` and `true`/`false`)
- [ ] API endpoints return correct `isAnonymous` values
- [ ] Anonymous surveys accessible without login
- [ ] Non-anonymous surveys require authentication
- [ ] Assignment checks skipped for anonymous surveys

### Post-Deployment Checklist

- [ ] Run production test script:
  ```bash
  BASE_URL=https://your-production-url.com ANONYMOUS_SURVEY_ID=xxx npx tsx scripts/test-anonymous-production.ts
  ```
- [ ] Test anonymous survey access in browser (incognito mode)
- [ ] Test anonymous survey submission
- [ ] Check browser console for errors
- [ ] Check server logs for errors
- [ ] Verify database records created correctly

---

## Running Tests

### Local Test
```bash
npm run dev
# In another terminal:
npx tsx scripts/test-anonymous-survey-api.ts
```

### Production Test
```bash
# Set your production URL
export BASE_URL=https://your-production-url.com

# Set an anonymous survey ID (get from database)
export ANONYMOUS_SURVEY_ID=your-survey-id

# Run test
npx tsx scripts/test-anonymous-production.ts
```

---

## Debugging Steps

### Step 1: Check Database Values
```sql
-- Check anonymous surveys
SELECT id, title, is_anonymous FROM surveys WHERE is_anonymous = 1;

-- Check non-anonymous surveys
SELECT id, title, is_anonymous FROM surveys WHERE is_anonymous = 0 OR is_anonymous = FALSE;
```

### Step 2: Test API Directly
```bash
# Test anonymous survey (should work without auth)
curl https://your-production-url.com/api/survey-session/SURVEY_ID

# Test non-anonymous survey (should require auth)
curl https://your-production-url.com/api/survey-session/NON_ANON_SURVEY_ID
```

### Step 3: Check API Response
```json
// Should return:
{
  "survey": {
    "id": "...",
    "isAnonymous": true,  // or 1, but code handles both
    ...
  },
  "submissionStatus": {
    "canRetake": true,
    "hasSubmitted": false
  }
}
```

### Step 4: Check Browser Console
- Open browser DevTools
- Check Network tab for API calls
- Check Console for errors
- Verify `isAnonymous` value in response

### Step 5: Check Server Logs
```bash
# In production logs, look for:
# - Database query errors
# - API route errors
# - Boolean conversion issues
```

---

## Common Error Messages

### "Authentication required"
**Cause:** Survey marked as anonymous but API thinks it's not
**Fix:** Check `isAnonymous` value in database and API response

### "You are not assigned to this survey"
**Cause:** Assignment check running for anonymous survey
**Fix:** Verify code checks `!surveyData.isAnonymous` before assignment check

### "Survey not found"
**Cause:** Survey ID incorrect or survey doesn't exist
**Fix:** Verify survey exists and ID is correct

### "Internal server error"
**Cause:** Database connection or query error
**Fix:** Check server logs and database connection

---

## Quick Fixes

### Fix 1: Force Boolean Conversion
If boolean handling is the issue, add explicit conversion:
```typescript
// In API route
const isAnonymous = Boolean(surveyData.isAnonymous) || surveyData.isAnonymous === 1;
```

### Fix 2: Clear Cache
```bash
# Clear Next.js cache
rm -rf .next

# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Fix 3: Verify Database Column
```sql
-- Check column type
SHOW COLUMNS FROM surveys WHERE Field = 'is_anonymous';

-- Should show: Type = 'tinyint(1)' or 'boolean'
```

---

## Production Deployment Checklist

1. ✅ Database migration completed
2. ✅ Environment variables set
3. ✅ Code handles boolean values correctly
4. ✅ API endpoints tested
5. ✅ Anonymous surveys accessible
6. ✅ Non-anonymous surveys secured
7. ✅ Assignment checks working correctly
8. ✅ Submission works for anonymous surveys

---

## Getting Help

If issues persist:

1. Run the test scripts and share output
2. Check server logs for errors
3. Verify database schema matches local
4. Compare environment variables
5. Test API endpoints directly with curl
6. Check browser console for client-side errors

---

## Date
Created: November 25, 2025

