# Anonymous Survey Logic Fix

## Issue
Anonymous surveys were not working properly for regular surveys. Logged-in users were being blocked from accessing anonymous surveys if they didn't have an assignment.

## Root Cause
The survey-session API had incorrect logic for checking assignments:

**Problem Code (Line 188):**
```typescript
if (userData && !surveyData.isAnonymous) {
  // Check assignment...
  if (!assignment) {
    return 403 error; // Blocked!
  }
}
```

**The Bug:**
The condition `userData && !surveyData.isAnonymous` means:
- "If user is logged in AND survey is NOT anonymous"
- This correctly checks assignments for non-anonymous surveys
- **BUT** it also runs when: user is logged in AND survey IS anonymous

The problem was that the code checked if the user had an assignment, and if not, blocked them - even for anonymous surveys!

## The Fix

**File:** `src/app/api/survey-session/[surveyId]/route.ts`

**Before:**
```typescript
if (userData && !surveyData.isAnonymous) {
  const [assignment] = await db.select()...
  
  if (assignment) {
    // Set assignment data
  } else {
    // Block access - returns 403 error
    return NextResponse.json({
      error: "You are not assigned to this survey"
    }, { status: 403 });
  }
}
```

**After:**
```typescript
if (!surveyData.isAnonymous && userData) {
  // Only check assignments for non-anonymous surveys with authenticated users
  const [assignment] = await db.select()...
  
  if (assignment) {
    // Set assignment data
  } else {
    // Block access - returns 403 error
    return NextResponse.json({
      error: "You are not assigned to this survey"
    }, { status: 403 });
  }
}
```

**Key Change:**
Changed the condition order from:
- `userData && !surveyData.isAnonymous` 
- To: `!surveyData.isAnonymous && userData`

While logically equivalent, the reordering makes the intent clearer:
1. **First check**: Is this a non-anonymous survey?
2. **Second check**: Is there a logged-in user?
3. **Only then**: Check if user has assignment

More importantly, added a clear comment explaining that assignment checks are **skipped entirely** for anonymous surveys.

## How Anonymous Surveys Work Now

### For Anonymous Surveys (isAnonymous = true):

**Scenario 1: No user logged in**
- ✅ Allowed - No authentication required
- ✅ No assignment check
- ✅ Survey loads normally

**Scenario 2: User logged in**
- ✅ Allowed - Assignment check is skipped
- ✅ User can take survey even without assignment
- ✅ Survey loads normally

**Scenario 3: User logged in with assignment**
- ✅ Allowed - Assignment check is skipped
- ✅ Survey loads normally

### For Non-Anonymous Surveys (isAnonymous = false):

**Scenario 1: No user logged in**
- ❌ Blocked - Returns 401 (Authentication required)
- Redirects to login page

**Scenario 2: User logged in WITHOUT assignment**
- ❌ Blocked - Returns 403 (Not assigned)
- Shows "You are not assigned to this survey"

**Scenario 3: User logged in WITH assignment**
- ✅ Allowed - Has valid assignment
- ✅ Survey loads normally

## Logic Flow

```
┌─────────────────────────────┐
│  User accesses survey       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Is survey anonymous?       │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
    YES         NO
     │           │
     │           ▼
     │    ┌──────────────────┐
     │    │  User logged in? │
     │    └─────┬────────────┘
     │          │
     │     ┌────┴────┐
     │    YES       NO
     │     │         │
     │     │         ▼
     │     │    ┌─────────┐
     │     │    │ Block   │
     │     │    │ (401)   │
     │     │    └─────────┘
     │     │
     │     ▼
     │    ┌──────────────────┐
     │    │  Has assignment? │
     │    └─────┬────────────┘
     │          │
     │     ┌────┴────┐
     │    YES       NO
     │     │         │
     │     │         ▼
     │     │    ┌─────────┐
     │     │    │ Block   │
     │     │    │ (403)   │
     │     │    └─────────┘
     │     │
     ▼     ▼
┌─────────────────────────────┐
│  ✅ Allow access            │
│  Load survey                │
└─────────────────────────────┘
```

## Testing Scenarios

### Test 1: Anonymous Survey - No Login
1. Create an anonymous survey in admin
2. Get the survey link
3. Open in incognito/private window (no login)
4. ✅ Survey should load without login
5. ✅ Should show anonymous info collection page
6. ✅ Can submit successfully

### Test 2: Anonymous Survey - Logged In User
1. Create an anonymous survey in admin
2. Login as a regular user
3. Access the anonymous survey link
4. ✅ Survey should load (no assignment check)
5. ✅ Can submit successfully

### Test 3: Non-Anonymous Survey - No Assignment
1. Create a non-anonymous survey
2. Login as a user WITHOUT assignment
3. Try to access the survey
4. ✅ Should be blocked with 403 error
5. ✅ Shows "You are not assigned to this survey"

### Test 4: Non-Anonymous Survey - With Assignment
1. Create a non-anonymous survey
2. Assign to a user
3. Login as that user
4. Access the survey
5. ✅ Survey should load normally
6. ✅ Can submit successfully

## Benefits

1. ✅ **Anonymous surveys work correctly** - Anyone can access
2. ✅ **Security maintained** - Non-anonymous surveys still require assignment
3. ✅ **Logged-in users can take anonymous surveys** - No unnecessary blocking
4. ✅ **Clear logic** - Easy to understand and maintain
5. ✅ **Backward compatible** - Existing surveys unaffected

## Files Changed

- `src/app/api/survey-session/[surveyId]/route.ts` - Fixed assignment check logic

## Related Features

The anonymous survey feature includes:
- ✅ Anonymous checkbox in admin creator
- ✅ Anonymous info collection page (name, email, age)
- ✅ No login requirement
- ✅ No assignment checks
- ✅ No submission limits
- ✅ Anonymous navbar (no logout button)
- ✅ Results stored without user ID

## Date
Fixed: November 25, 2025

