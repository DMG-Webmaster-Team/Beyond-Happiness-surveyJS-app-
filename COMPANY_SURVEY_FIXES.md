# Company-Survey Issues Fixed

## 🐞 Issues Addressed

### Issue 1: "Created: Invalid Date"

**Problem:** The `createdAt` field was showing "Invalid Date" in the admin panel.

**Root Cause:** The `formatDate` function in `SurveysTab.tsx` was treating timestamps as Unix seconds (multiplying by 1000), but MySQL `TIMESTAMP` fields return Date objects or ISO strings, not Unix timestamps.

**Fix Applied:**

- Updated `formatDate` function to handle multiple date formats (Date objects, ISO strings, and timestamps)
- Added proper error handling and validation
- Returns 'N/A' for missing dates and 'Invalid Date' for malformed data

**File:** `src/components/happiness/admin/SurveysTab.tsx` (lines 104-117)

---

### Issue 2: Company-Survey Link Does Not Propagate to Users

**Problem:** When a survey is assigned to a company via the `companyId` field, users in that company cannot access the survey.

**Root Causes:**

1. **Access Check Logic**: The access route only checked the `happinessAssignments` table for direct user assignments, ignoring company membership
2. **Company Dashboard Query**: The company dashboard query only looked in the many-to-many `happinessSurveyCompanyAssignments` table, missing surveys with direct `companyId` assignments

**Fixes Applied:**

#### Fix 2.1: User Access Logic

**File:** `src/app/api/happiness/surveys/[id]/access/route.ts`

Updated the access check to include company-based access:

1. First checks for direct user assignments in `happinessAssignments`
2. If no direct assignment and survey has a `companyId`:
   - Fetches the user's company from the `users` table
   - Grants access if user's `companyId` matches survey's `companyId`
3. Logs comprehensive debugging information for troubleshooting

**Code Changes (lines 128-226):**

```typescript
// Check if user is assigned to this survey (either directly or via company)
const assignment = await db
  .select()
  .from(happinessAssignments)
  .where(...)
  .limit(1);

// If no direct assignment, check if user's company matches survey's company
if (assignment.length === 0 && surveyData.companyId) {
  const { users } = await import("@/db/schema/users");

  const user = await db
    .select({ companyId: users.companyId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length > 0 && user[0].companyId === surveyData.companyId) {
    // Grant access via company membership
    // Continue to cooldown check
  } else {
    // Deny access
  }
}
```

#### Fix 2.2: Company Dashboard Query

**File:** `src/db/queries/survey-company-assignments.ts`

Updated both `getCompanySurveys` and `getCompanyHappinessSurveys` to check **two sources**:

1. **Many-to-many assignments** (existing logic)

   - Via `surveyCompanyAssignments` or `happinessSurveyCompanyAssignments` tables

2. **Direct assignments** (new logic)
   - Via `companyId` field in the `surveys` or `happinessSurveys` table

**Code Changes:**

```typescript
export async function getCompanyHappinessSurveys(companyId: string): Promise<any[]> {
  // Get surveys from many-to-many table
  const assignedSurveys = await db
    .select({...})
    .from(happinessSurveyCompanyAssignments)
    .innerJoin(happinessSurveys, ...)
    .where(...);

  // Get surveys with direct companyId assignment
  const directSurveys = await db
    .select({...})
    .from(happinessSurveys)
    .where(eq(happinessSurveys.companyId, companyId));

  // Merge both results, removing duplicates by id
  const surveyMap = new Map();
  [...assignedSurveys, ...directSurveys].forEach(survey => {
    if (!surveyMap.has(survey.id)) {
      surveyMap.set(survey.id, survey);
    }
  });

  return Array.from(surveyMap.values());
}
```

---

## ✅ Verification

### Test Scenario 1: Invalid Date Fix

**Before:**

```
Created: Invalid Date
```

**After:**

```
Created: 10/21/2025
```

**How to Test:**

1. Navigate to admin panel → Happiness Surveys tab
2. Verify all surveys show proper "Created" dates
3. Create a new survey and verify date displays immediately

---

### Test Scenario 2: Company-User Access

**Before:**

- Survey assigned to "Mountain View Egypt" company
- User A is member of "Mountain View Egypt"
- User A tries to access survey → ❌ "You are not assigned to this survey"

**After:**

- Survey assigned to "Mountain View Egypt" company
- User A is member of "Mountain View Egypt"
- User A tries to access survey → ✅ Access granted via company membership

**How to Test:**

1. Create/edit a happiness survey and assign it to a company
2. Log in as a user who is a member of that company
3. Navigate to the survey URL
4. Verify access is granted
5. Check browser console for log: `✅ User has access via company assignment`

---

### Test Scenario 3: Company Dashboard Display

**Before:**

- Survey with `companyId` set to company X
- Company X dashboard → No surveys shown

**After:**

- Survey with `companyId` set to company X
- Company X dashboard → Survey is displayed

**How to Test:**

1. Go to admin panel → Companies tab
2. Select a company (e.g., "Mountain View Egypt")
3. Check the "Happiness Surveys" tab
4. Verify all surveys with matching `companyId` are displayed
5. Verify surveys assigned via many-to-many table are also displayed

---

## 📊 Database Schema Context

### Survey-Company Relationship (Two Methods)

#### Method 1: Direct Assignment (Simple)

```sql
-- happiness_surveys table
CREATE TABLE happiness_surveys (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company_id VARCHAR(128), -- ← Direct company assignment
  company_name VARCHAR(255),
  ...
);
```

**Use Case:** Assigning a survey to a single company

#### Method 2: Many-to-Many Assignment (Flexible)

```sql
-- happiness_survey_company_assignments table
CREATE TABLE happiness_survey_company_assignments (
  id VARCHAR(128) PRIMARY KEY,
  survey_id VARCHAR(128) REFERENCES happiness_surveys(id),
  company_id VARCHAR(128) REFERENCES companies(id),
  assigned_at TIMESTAMP,
  assigned_by VARCHAR(128)
);
```

**Use Case:** Assigning a survey to multiple companies

### User-Company Relationship

```sql
-- users table
CREATE TABLE users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255),
  company_id VARCHAR(128), -- ← User's company membership
  company_name VARCHAR(255),
  ...
);
```

---

## 🎯 Summary of Changes

| File                                                 | Change                                                                | Impact                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| `src/components/happiness/admin/SurveysTab.tsx`      | Fixed `formatDate` to handle Date objects                             | ✅ "Invalid Date" → proper date display            |
| `src/app/api/happiness/surveys/[id]/access/route.ts` | Added company-based access check                                      | ✅ Users can access surveys via company membership |
| `src/db/queries/survey-company-assignments.ts`       | Updated `getCompanySurveys` to check both assignment methods          | ✅ Company dashboard shows all surveys             |
| `src/db/queries/survey-company-assignments.ts`       | Updated `getCompanyHappinessSurveys` to check both assignment methods | ✅ Company dashboard shows all happiness surveys   |

---

## 🔍 Implementation Details

### Access Check Flow

```
User requests survey access
    ↓
Check if anonymous/collect_info mode → Grant access
    ↓
Extract userId from session cookie
    ↓
Check happinessAssignments table for direct assignment
    ↓
If no direct assignment:
    ↓
Check if survey.companyId exists
    ↓
Fetch user.companyId from users table
    ↓
Compare user.companyId === survey.companyId
    ↓
If match → Grant access
    ↓
If no match → Deny access
```

### Company Dashboard Query Flow

```
Fetch company surveys
    ↓
Query 1: Get from many-to-many table (happinessSurveyCompanyAssignments)
    ↓
Query 2: Get from direct assignment (happinessSurveys WHERE companyId = ?)
    ↓
Merge results using Map to remove duplicates
    ↓
Return combined list
```

---

## 🚀 Future Improvements

### Optional Enhancements:

1. **Auto-assignment**: When a new user joins a company, automatically assign them to all company surveys
2. **Assignment Priority**: Define which method (direct vs many-to-many) takes precedence if both exist
3. **Audit Log**: Track when users access surveys via company membership vs direct assignment
4. **Company Admin Role**: Allow company admins to manage survey assignments for their company
5. **Bulk Operations**: Add UI to assign/unassign surveys for entire companies at once

---

**Date:** October 21, 2025  
**Issues:** Invalid Date display, Company-survey propagation  
**Resolution:** Fixed date formatting and added company-based access logic  
**Status:** ✅ Complete












