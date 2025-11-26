# Anonymous Survey Testing & Production Fix Summary

## What Was Created

### 1. Comprehensive Test Suite
**File:** `scripts/test-anonymous-survey-api.ts`

A complete test suite that checks:
- ✅ Database schema (isAnonymous column exists)
- ✅ Anonymous survey API access without login
- ✅ Non-anonymous survey requires authentication
- ✅ Anonymous survey submission works
- ✅ Assignment check is skipped for anonymous surveys
- ✅ Database boolean value handling
- ✅ Environment configuration

**Run locally:**
```bash
npm run dev
# In another terminal:
npx tsx scripts/test-anonymous-survey-api.ts
```

### 2. Production-Specific Test
**File:** `scripts/test-anonymous-production.ts`

Focused tests for production issues:
- ✅ Production configuration check
- ✅ Anonymous survey access (with/without session)
- ✅ Boolean value handling (MySQL 1/0 vs JavaScript true/false)
- ✅ CORS and headers check

**Run in production:**
```bash
BASE_URL=https://your-production-url.com \
ANONYMOUS_SURVEY_ID=your-survey-id \
npx tsx scripts/test-anonymous-production.ts
```

### 3. Troubleshooting Guide
**File:** `ANONYMOUS_SURVEY_PRODUCTION_TROUBLESHOOTING.md`

Complete guide covering:
- Common production issues
- Step-by-step debugging
- Quick fixes
- Deployment checklist

---

## Critical Production Fix Applied

### The Problem
MySQL/MariaDB stores booleans as `TINYINT(1)` which returns `1` or `0`, but JavaScript expects `true` or `false`. This causes anonymous surveys to fail in production even though they work locally.

### The Fix
**File:** `src/app/api/survey-session/[surveyId]/route.ts`

Updated all boolean checks to handle both formats:

**Before:**
```typescript
if (surveyData.isAnonymous) {  // Fails if value is 1
```

**After:**
```typescript
const isAnonymous = surveyData.isAnonymous === true || (surveyData.isAnonymous as any) === 1;
if (isAnonymous) {  // Works with both true and 1
```

**Changes Made:**
1. Line 167: Fixed anonymous survey submission status check
2. Line 189: Fixed assignment check skip logic
3. Line 238: Fixed response boolean conversion

---

## Testing Instructions

### Local Testing
```bash
# 1. Start dev server
npm run dev

# 2. Run comprehensive tests
npx tsx scripts/test-anonymous-survey-api.ts
```

### Production Testing
```bash
# 1. Set environment variables
export BASE_URL=https://your-production-url.com
export ANONYMOUS_SURVEY_ID=your-anonymous-survey-id

# 2. Run production tests
npx tsx scripts/test-anonymous-production.ts
```

### Manual Testing Checklist

**Test 1: Anonymous Survey Without Login**
1. Create an anonymous survey in admin
2. Copy the survey link
3. Open in incognito/private window
4. ✅ Should load without login
5. ✅ Should show anonymous info form
6. ✅ Should allow submission

**Test 2: Anonymous Survey With Login**
1. Login as a user
2. Access anonymous survey link
3. ✅ Should load (no assignment check)
4. ✅ Should allow submission

**Test 3: Non-Anonymous Survey**
1. Create a non-anonymous survey
2. Try to access without login
3. ✅ Should redirect to login
4. ✅ Should require assignment

---

## What to Check in Production

### 1. Database Schema
```sql
-- Verify column exists
SHOW COLUMNS FROM surveys LIKE 'is_anonymous';

-- Check values
SELECT id, title, is_anonymous FROM surveys WHERE is_anonymous = 1 LIMIT 5;
```

### 2. API Response
```bash
# Test anonymous survey
curl https://your-production-url.com/api/survey-session/SURVEY_ID

# Should return:
# {
#   "survey": {
#     "isAnonymous": true,  // or 1, but code handles both
#     ...
#   }
# }
```

### 3. Browser Console
- Open DevTools → Network tab
- Check API response
- Verify `isAnonymous` value
- Check for errors

### 4. Server Logs
- Check for database errors
- Check for API route errors
- Look for boolean conversion issues

---

## Expected Behavior

### Anonymous Surveys (`isAnonymous = true` or `1`)

**Access:**
- ✅ No login required
- ✅ No assignment required
- ✅ Works for logged-in users too
- ✅ Assignment check skipped

**Submission:**
- ✅ Can submit without userId
- ✅ No duplicate submission check
- ✅ Anonymous info collected (name, email, etc.)

### Non-Anonymous Surveys (`isAnonymous = false` or `0`)

**Access:**
- ❌ Requires login
- ❌ Requires assignment
- ✅ Redirects to login if not authenticated
- ✅ Returns 403 if not assigned

**Submission:**
- ✅ Requires userId
- ✅ Duplicate check for one-time surveys
- ✅ Assignment status updated

---

## Files Modified

1. ✅ `src/app/api/survey-session/[surveyId]/route.ts` - Fixed boolean handling
2. ✅ `scripts/test-anonymous-survey-api.ts` - Created comprehensive tests
3. ✅ `scripts/test-anonymous-production.ts` - Created production tests
4. ✅ `ANONYMOUS_SURVEY_PRODUCTION_TROUBLESHOOTING.md` - Created troubleshooting guide

---

## Next Steps

1. **Deploy the fix** to production
2. **Run production tests** to verify
3. **Test manually** with real anonymous surveys
4. **Monitor** for any issues
5. **Check logs** if problems persist

---

## Quick Reference

### Run Tests
```bash
# Local
npx tsx scripts/test-anonymous-survey-api.ts

# Production
BASE_URL=https://your-url.com ANONYMOUS_SURVEY_ID=xxx npx tsx scripts/test-anonymous-production.ts
```

### Check Database
```sql
SELECT id, title, is_anonymous FROM surveys WHERE is_anonymous = 1;
```

### Test API
```bash
curl https://your-url.com/api/survey-session/SURVEY_ID
```

---

## Date
Created: November 25, 2025

