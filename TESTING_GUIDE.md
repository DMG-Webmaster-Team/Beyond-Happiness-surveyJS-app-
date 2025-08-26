# 🧪 Manual Testing Guide: "Already Submitted" Bug Fix

This guide covers comprehensive testing scenarios to verify the fix for the "already submitted" false positive bug.

## 🎯 **Testing Objectives**

- ✅ Fix: New users never see "already submitted" false positive
- ✅ Security: `/api/results` properly filters by both `surveyId` AND `userId`
- ✅ Logic: Login flow determines submission status correctly
- ✅ UX: Proper messages for different scenarios
- ✅ Redirects: surveyId always preserved across logout/login

---

## 🔧 **Test Setup**

### Prerequisites

1. Fresh database or clean test environment
2. Create test survey `S` with known ID
3. Create test users `U1`, `U2` with known emails
4. Enable debug logging to see console output

### Test Data Setup

```bash
# Example survey ID: survey_test_123
# Example users:
# - user1@example.com (U1)
# - user2@example.com (U2)
```

---

## 📋 **Test Scenarios**

### **Scenario A: Brand-new user, first-time** ✅

**Goal**: Verify no false positive "already submitted"

**Steps**:

1. Assign `U1` to survey `S` (but U1 has never submitted)
2. Navigate to `/user/login?redirect=S`
3. Enter `U1` email, complete OTP flow
4. **Expected**: Successfully lands on survey page, can take survey
5. **Check logs**: Should show `hasSubmitted: false` in OTP response

**Debug**: Look for:

```
🔍 /api/users/otp checking submission status: { userId: "...", canTakeMultiple: false }
🔍 Single-take survey - checking existing submissions for user ...
🔍 Submission check result: { existingCount: 0, hasSubmitted: false }
```

---

### **Scenario B: One-time survey after first submission** 🚫

**Goal**: Verify blocking works correctly for legitimate submissions

**Steps**:

1. Complete Scenario A (U1 submits survey S)
2. Try to access survey S again with U1
3. **Expected**: Blocked at login page with "You have already submitted this survey"
4. **Check logs**: Should show `hasSubmitted: true` in OTP response

---

### **Scenario C: Multi-take survey** 🔄

**Goal**: Verify retakes are allowed for multi-take surveys

**Steps**:

1. Set `S.canTakeMultiple = true` in database
2. Have U1 complete survey S once
3. Try to access survey S again with U1
4. **Expected**: Allowed to take survey again
5. **Check logs**: Should show `canTakeMultiple: true` and allowed through

---

### **Scenario D: Not assigned** ❌

**Goal**: Verify assignment check works

**Steps**:

1. Do NOT assign U2 to survey S
2. Navigate to `/user/login?redirect=S`
3. Enter U2 email, complete OTP flow
4. **Expected**: "You are not assigned to this survey" message
5. **Check logs**: Should show `assigned: false` in OTP response

---

### **Scenario E: Wrong surveyId in URL** 🔗

**Goal**: Verify error handling for invalid survey IDs

**Steps**:

1. Navigate to `/user/login?redirect=invalid_survey_id`
2. Enter valid user email, complete OTP flow
3. **Expected**: Clear error about survey not found
4. **Check logs**: Should show survey lookup failure

---

### **Scenario F: Session expired** ⏰

**Goal**: Verify redirect preserves surveyId

**Steps**:

1. Log in to survey S successfully
2. Wait for session to expire OR manually delete `user_session` cookie
3. Try to access `/user/survey/S` directly
4. **Expected**: Redirected to `/user/login?redirect=S`
5. **Verify**: surveyId is preserved in URL

---

### **Scenario G: Results API safety check** 🔒

**Goal**: Verify new security measures work

**Steps**:

1. **Test A**: Call `/api/results?surveyId=S` (without userId)

   - **Expected**: Admin view with pagination (200 OK)

2. **Test B**: Call `/api/results?userId=U1` (without surveyId)

   - **Expected**: 400 error "surveyId is required when userId is provided"

3. **Test C**: Call `/api/results?surveyId=S&userId=U1`

   - **Expected**: Only U1's submissions for survey S

4. **Test D**: Direct browser test

   ```bash
   curl "http://localhost:3000/api/results?userId=user1"
   # Should return 400 error

   curl "http://localhost:3000/api/results?surveyId=survey1&userId=user1"
   # Should return filtered results
   ```

---

### **Scenario H: Database sanity check** 💾

**Goal**: Verify correct database and data

**Steps**:

1. Check server startup logs for database path
2. Verify the database file exists and is not stale
3. Query database directly:

   ```sql
   -- Check survey exists
   SELECT id, title, can_take_multiple FROM surveys WHERE id = 'your_survey_id';

   -- Check user assignments
   SELECT * FROM user_assignments WHERE survey_id = 'your_survey_id';

   -- Check actual submissions
   SELECT * FROM results WHERE survey_id = 'your_survey_id';
   ```

---

## 🔍 **Debug Log Analysis**

### **Good Logs (Working Correctly)**

```
🔍 /api/results GET request: { surveyId: "S", userId: "U1", ... }
🔍 Checking submissions for user U1 in survey S
🔍 Found 0 submissions for user U1 in survey S

🔍 /api/users/otp checking submission status: { userId: "U1", canTakeMultiple: false }
🔍 Single-take survey - checking existing submissions for user U1
🔍 Submission check result: { existingCount: 0, hasSubmitted: false }
```

### **Problem Logs (Need Investigation)**

```
❌ userId provided without surveyId - rejecting request
❌ No existing submission found but UI still shows "already submitted"
❌ Survey not found or user not assigned
```

---

## ✅ **Acceptance Criteria Checklist**

- [ ] **A**: New user with no submissions never sees "already submitted"
- [ ] **B**: One-time survey blocks after legitimate submission
- [ ] **C**: Multi-take survey allows retakes
- [ ] **D**: Not assigned shows proper message
- [ ] **E**: Invalid surveyId shows error (not crash)
- [ ] **F**: Session expiry preserves surveyId in redirect
- [ ] **G**: `/api/results` requires both params for user checks
- [ ] **H**: Database contains expected test data

### **UI Message Verification**

- [ ] "You are not assigned to this survey" (not assigned)
- [ ] "You have already submitted this survey" (legitimate block)
- [ ] Survey loads normally (new user, first time)
- [ ] Retake allowed message (multi-take survey)

### **Redirect Verification**

- [ ] Logout preserves: `/user/login?redirect=surveyId`
- [ ] Session expiry preserves: `/user/login?redirect=surveyId`
- [ ] Login success redirects to: `/user/survey/surveyId`

---

## 🚨 **Cleanup**

After testing, remove debug logs:

1. Remove temporary `console.log` statements from:

   - `/api/results/route.ts`
   - `/api/users/otp/route.ts`
   - `/user/survey/[surveyId]/page.tsx`

2. Keep one debug toggle if desired:
   ```env
   DEBUG_OTP_LOGIN=false
   ```

---

## 🎉 **Success Indicators**

✅ **Primary Goal Achieved**: Brand new users can access their assigned surveys without false "already submitted" errors

✅ **Security Enhanced**: Results API properly filters by user, preventing data leaks

✅ **User Experience**: Clear, appropriate messages for all scenarios

✅ **Data Integrity**: Submission status determined consistently and correctly
