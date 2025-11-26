/**
 * Comprehensive Test Suite for Anonymous Survey Functionality
 * 
 * This script tests all aspects of anonymous surveys to ensure they work correctly
 * in both local and production environments.
 * 
 * Run with: npx tsx scripts/test-anonymous-survey-api.ts
 */

import { db } from "../src/db/client";
import { surveys } from "../src/db/schema";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function test1_CheckAnonymousFieldExists() {
  console.log("\n1️⃣ Testing database schema...");
  
  try {
    // Check if isAnonymous column exists by trying to query it
    const testSurvey = await db
      .select({ isAnonymous: surveys.isAnonymous })
      .from(surveys)
      .limit(1);
    
    if (testSurvey.length > 0) {
      logTest("isAnonymous column exists", true, undefined, {
        sampleValue: testSurvey[0].isAnonymous
      });
      return true;
    } else {
      logTest("isAnonymous column exists", false, "No surveys found to test");
      return false;
    }
  } catch (error: any) {
    logTest("isAnonymous column exists", false, error.message);
    return false;
  }
}

async function test2_TestSurveySessionAPI_Anonymous() {
  console.log("\n2️⃣ Testing survey-session API for anonymous survey...");
  
  try {
    // Find an anonymous survey
    const anonymousSurvey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.isAnonymous, true))
      .limit(1);
    
    if (anonymousSurvey.length === 0) {
      logTest("Anonymous survey exists", false, "No anonymous surveys found in database");
      return false;
    }
    
    const surveyId = anonymousSurvey[0].id;
    logTest("Anonymous survey found", true, undefined, { surveyId });
    
    // Test API without authentication
    const response = await fetch(`${BASE_URL}/api/survey-session/${surveyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Check response structure
      const hasSurvey = data.survey !== undefined;
      const isAnonymous = data.survey?.isAnonymous === true;
      const hasUser = data.user !== undefined; // Should be optional for anonymous
      
      if (hasSurvey && isAnonymous) {
        logTest("Anonymous survey accessible without login", true, undefined, {
          surveyId: data.survey.id,
          isAnonymous: data.survey.isAnonymous,
          hasUser: hasUser
        });
        return true;
      } else {
        logTest("Anonymous survey accessible without login", false, 
          `Missing survey data or isAnonymous flag. Response: ${JSON.stringify(data)}`);
        return false;
      }
    } else {
      logTest("Anonymous survey accessible without login", false, 
        `API returned ${response.status}: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error: any) {
    logTest("Anonymous survey accessible without login", false, error.message);
    return false;
  }
}

async function test3_TestSurveySessionAPI_NonAnonymous() {
  console.log("\n3️⃣ Testing survey-session API for non-anonymous survey...");
  
  try {
    // Find a non-anonymous survey
    const nonAnonymousSurvey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.isAnonymous, false))
      .limit(1);
    
    if (nonAnonymousSurvey.length === 0) {
      logTest("Non-anonymous survey exists", false, "No non-anonymous surveys found");
      return false;
    }
    
    const surveyId = nonAnonymousSurvey[0].id;
    
    // Test API without authentication
    const response = await fetch(`${BASE_URL}/api/survey-session/${surveyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    // Should require authentication (401 or 403)
    if (response.status === 401 || response.status === 403) {
      logTest("Non-anonymous survey requires authentication", true, undefined, {
        status: response.status,
        requiresAuth: data.requiresAuth
      });
      return true;
    } else {
      logTest("Non-anonymous survey requires authentication", false, 
        `Expected 401/403, got ${response.status}: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error: any) {
    logTest("Non-anonymous survey requires authentication", false, error.message);
    return false;
  }
}

async function test4_TestAnonymousSurveySubmission() {
  console.log("\n4️⃣ Testing anonymous survey submission...");
  
  try {
    // Find an anonymous survey
    const anonymousSurvey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.isAnonymous, true))
      .limit(1);
    
    if (anonymousSurvey.length === 0) {
      logTest("Anonymous survey submission", false, "No anonymous surveys found");
      return false;
    }
    
    const surveyId = anonymousSurvey[0].id;
    
    // Test submission without userId
    const submissionData = {
      surveyId: surveyId,
      userId: null, // Anonymous - no user ID
      data: {
        "anonymousInfo.name": "Test User",
        "anonymousInfo.email": "test@example.com",
        "anonymousInfo.phone": "1234567890",
        "anonymousInfo.gender": "male",
        "anonymousInfo.ageRange": "18_25",
        "question1": "answer1"
      },
      isAnonymous: true
    };
    
    const response = await fetch(`${BASE_URL}/api/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      logTest("Anonymous survey submission works", true, undefined, {
        resultId: data.id,
        surveyId: data.surveyId,
        userId: data.userId // Should be null
      });
      return true;
    } else {
      logTest("Anonymous survey submission works", false, 
        `API returned ${response.status}: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error: any) {
    logTest("Anonymous survey submission works", false, error.message);
    return false;
  }
}

async function test5_TestAssignmentCheckSkipped() {
  console.log("\n5️⃣ Testing assignment check is skipped for anonymous surveys...");
  
  try {
    // Find an anonymous survey
    const anonymousSurvey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.isAnonymous, true))
      .limit(1);
    
    if (anonymousSurvey.length === 0) {
      logTest("Assignment check skipped for anonymous", false, "No anonymous surveys found");
      return false;
    }
    
    const surveyId = anonymousSurvey[0].id;
    
    // Test with a fake user session cookie (simulating logged-in user)
    const fakeSession = {
      id: "test-user-id",
      email: "test@example.com",
      loginTime: new Date().toISOString()
    };
    
    const response = await fetch(`${BASE_URL}/api/survey-session/${surveyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `user_session=${JSON.stringify(fakeSession)}`
      },
    });
    
    const data = await response.json();
    
    // Should work even without assignment
    if (response.ok && data.survey?.isAnonymous === true) {
      logTest("Assignment check skipped for anonymous surveys", true, undefined, {
        surveyId: data.survey.id,
        isAnonymous: data.survey.isAnonymous,
        hasAssignment: data.assignment !== undefined
      });
      return true;
    } else {
      logTest("Assignment check skipped for anonymous surveys", false, 
        `Expected success, got ${response.status}: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error: any) {
    logTest("Assignment check skipped for anonymous surveys", false, error.message);
    return false;
  }
}

async function test6_TestDatabaseBooleanHandling() {
  console.log("\n6️⃣ Testing database boolean handling...");
  
  try {
    // Test different boolean representations
    const allSurveys = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        isAnonymous: surveys.isAnonymous
      })
      .from(surveys)
      .limit(10);
    
    const anonymousCount = allSurveys.filter(s => s.isAnonymous === true || s.isAnonymous === 1).length;
    const nonAnonymousCount = allSurveys.filter(s => s.isAnonymous === false || s.isAnonymous === 0).length;
    
    logTest("Database boolean values readable", true, undefined, {
      totalSurveys: allSurveys.length,
      anonymousCount,
      nonAnonymousCount,
      sampleValues: allSurveys.map(s => ({ 
        id: s.id, 
        isAnonymous: s.isAnonymous,
        type: typeof s.isAnonymous 
      }))
    });
    
    return true;
  } catch (error: any) {
    logTest("Database boolean handling", false, error.message);
    return false;
  }
}

async function test7_TestEnvironmentVariables() {
  console.log("\n7️⃣ Testing environment configuration...");
  
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? "***SET***" : "NOT SET",
    BASE_URL: BASE_URL,
  };
  
  logTest("Environment variables", true, undefined, envVars);
  return true;
}

async function runAllTests() {
  console.log("🧪 Starting Anonymous Survey Test Suite");
  console.log("=" .repeat(60));
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("=" .repeat(60));
  
  await test1_CheckAnonymousFieldExists();
  await test2_TestSurveySessionAPI_Anonymous();
  await test3_TestSurveySessionAPI_NonAnonymous();
  await test4_TestAnonymousSurveySubmission();
  await test5_TestAssignmentCheckSkipped();
  await test6_TestDatabaseBooleanHandling();
  await test7_TestEnvironmentVariables();
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  
  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || "Unknown error"}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  
  if (failed === 0) {
    console.log("🎉 All tests passed!");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Review the output above.");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("❌ Test suite crashed:", error);
  process.exit(1);
});

