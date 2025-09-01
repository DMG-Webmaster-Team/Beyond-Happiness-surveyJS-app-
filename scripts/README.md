# Happiness Survey Testing Scripts

This directory contains automation scripts to test the happiness survey functionality.

## Quick Test Script

**File:** `quick-test-happiness.js`

**Usage:**

```bash
node scripts/quick-test-happiness.js
```

**What it tests:**

- ✅ Survey creation via API
- ✅ Character assignment with different answer patterns
- ✅ Scoring calculations (5-dimension happiness model)
- ✅ Avatar URL generation
- ✅ API endpoint availability
- ✅ Survey cleanup/deletion

**Example Output:**

```
🧪 Quick Happiness Survey Test

1️⃣ Creating test survey...
✅ Survey created: OQeHwhFYYAaJkXZQmVNiN

2️⃣ Testing: Complete Human (All 5s)
   Code: 11111 (expected: 11111) ✅
   Character: Complete Human
   Avatar: /characters/11111.png
   Categories: M:8250 D:8450 F:7650 E:8450 V:8450
   ✅ PASS

3️⃣ Testing: Curious Nomad (All 1s)
   Code: 00000 (expected: 00000) ✅
   Character: Curious Nomad
   Avatar: /characters/00000.png
   Categories: M:1850 D:2050 F:2850 E:2050 V:2050
   ✅ PASS

4️⃣ Testing: High Meaning Only
   Code: 10000 (expected: 10000) ✅
   Character: Mindful Seeker
   Avatar: /characters/10000.png
   Categories: M:8250 D:2050 F:2850 E:2050 V:2050
   ✅ PASS

5️⃣ Testing API endpoints...
   /api/happiness/questions: ✅
   /api/happiness/characters: ✅
   /api/happiness/surveys: ✅

🧹 Cleaning up...
   Survey deleted: ✅

✨ Test completed!
```

## Comprehensive Test Script

**File:** `test-happiness-survey.js`

**Usage:**

```bash
node scripts/test-happiness-survey.js
```

**Features:**

- More detailed testing scenarios
- Character mapping verification
- Multiple submission testing
- Error handling validation
- Colored output with detailed reports

## Test Scenarios

### Character Codes Tested:

- `11111` - Complete Human (all dimensions high)
- `00000` - Curious Nomad (all dimensions low)
- `10000` - Mindful Seeker (meaning only)
- `01000` - Joyful Creator (delight only)
- `10100` - Purposeful Wanderer (meaning + freedom)

### API Endpoints Tested:

- `GET /api/happiness/questions` - Get all 40 survey questions
- `GET /api/happiness/characters` - Get all 32 character profiles
- `GET /api/happiness/surveys` - List all surveys
- `POST /api/happiness/surveys` - Create new survey
- `POST /api/happiness/results` - Submit survey responses
- `DELETE /api/happiness/surveys/{id}` - Delete survey

## Prerequisites

- Server running on `http://localhost:3001`
- Database seeded with happiness survey data
- All API endpoints functional

## Notes

- Tests use anonymous surveys to avoid authentication complexity
- Automatic cleanup removes test data after completion
- Scripts exit with code 0 on success, 1 on failure
- Safe to run multiple times
