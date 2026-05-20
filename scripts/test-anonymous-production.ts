/**
 * Production-Specific Anonymous Survey Test
 * 
 * This script tests anonymous surveys specifically for production issues.
 * Run this in production to diagnose problems.
 * 
 * Usage:
 *   BASE_URL=https://your-production-url.com npx tsx scripts/test-anonymous-production.ts
 */

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(test: string, status: "PASS" | "FAIL" | "SKIP", message: string, details?: any) {
  results.push({ test, status, message, details });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  console.log(`${icon} ${test}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function testProductionConfig() {
  console.log("\n🔍 Production Configuration Check");
  console.log("=".repeat(60));
  
  // Check environment
  addResult(
    "Environment",
    "PASS",
    `NODE_ENV: ${process.env.NODE_ENV || "not set"}`,
    { BASE_URL }
  );
  
  // Check if BASE_URL is production
  const isProduction = BASE_URL.includes("http") && !BASE_URL.includes("localhost");
  addResult(
    "Production URL",
    isProduction ? "PASS" : "SKIP",
    `Testing against: ${BASE_URL}`,
    { isProduction }
  );
}

async function testAnonymousSurveyAccess() {
  console.log("\n🔍 Testing Anonymous Survey Access");
  console.log("=".repeat(60));
  
  // You need to provide a real anonymous survey ID for production
  const ANONYMOUS_SURVEY_ID = process.env.ANONYMOUS_SURVEY_ID;
  
  if (!ANONYMOUS_SURVEY_ID) {
    addResult(
      "Anonymous Survey ID",
      "SKIP",
      "Set ANONYMOUS_SURVEY_ID environment variable to test",
      { hint: "Get an anonymous survey ID from your database" }
    );
    return;
  }
  
  try {
    // Test 1: Access without authentication
    const response1 = await fetch(`${BASE_URL}/api/survey-session/${ANONYMOUS_SURVEY_ID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data1 = await response1.json();
    
    if (response1.ok) {
      const isAnonymous = data1.survey?.isAnonymous === true || data1.survey?.isAnonymous === 1;
      
      addResult(
        "Anonymous survey accessible without login",
        isAnonymous ? "PASS" : "FAIL",
        `Status: ${response1.status}, isAnonymous: ${data1.survey?.isAnonymous}`,
        { 
          surveyId: data1.survey?.id,
          isAnonymous: data1.survey?.isAnonymous,
          type: typeof data1.survey?.isAnonymous
        }
      );
      
      // Test 2: Check if assignment check is skipped
      if (isAnonymous && !data1.assignment) {
        addResult(
          "Assignment check skipped",
          "PASS",
          "No assignment required for anonymous survey"
        );
      } else if (isAnonymous && data1.assignment) {
        addResult(
          "Assignment check skipped",
          "FAIL",
          "Assignment check should not run for anonymous surveys",
          { assignment: data1.assignment }
        );
      }
    } else {
      addResult(
        "Anonymous survey accessible without login",
        "FAIL",
        `Expected 200, got ${response1.status}`,
        { error: data1.error, requiresAuth: data1.requiresAuth }
      );
    }
    
    // Test 3: Try with fake session (simulating logged-in user)
    const fakeSession = {
      id: "test-user-123",
      email: "test@example.com",
      loginTime: new Date().toISOString()
    };
    
    const response2 = await fetch(`${BASE_URL}/api/survey-session/${ANONYMOUS_SURVEY_ID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `user_session=${JSON.stringify(fakeSession)}`
      },
    });
    
    const data2 = await response2.json();
    
    if (response2.ok && data2.survey?.isAnonymous) {
      addResult(
        "Anonymous survey accessible with session",
        "PASS",
        "Logged-in users can access anonymous surveys"
      );
    } else {
      addResult(
        "Anonymous survey accessible with session",
        "FAIL",
        `Status: ${response2.status}`,
        { error: data2.error }
      );
    }
    
  } catch (error: any) {
    addResult(
      "Anonymous survey access test",
      "FAIL",
      error.message,
      { stack: error.stack }
    );
  }
}

async function testBooleanHandling() {
  console.log("\n🔍 Testing Boolean Value Handling");
  console.log("=".repeat(60));
  
  const ANONYMOUS_SURVEY_ID = process.env.ANONYMOUS_SURVEY_ID;
  
  if (!ANONYMOUS_SURVEY_ID) {
    addResult("Boolean handling test", "SKIP", "Set ANONYMOUS_SURVEY_ID to test");
    return;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/survey-session/${ANONYMOUS_SURVEY_ID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const isAnonymous = data.survey?.isAnonymous;
      const isAnonymousBool = isAnonymous === true || isAnonymous === 1;
      const isAnonymousFalse = isAnonymous === false || isAnonymous === 0;
      
      addResult(
        "Boolean value handling",
        isAnonymousBool || isAnonymousFalse ? "PASS" : "FAIL",
        `Value: ${isAnonymous} (type: ${typeof isAnonymous})`,
        {
          rawValue: isAnonymous,
          type: typeof isAnonymous,
          isTrue: isAnonymousBool,
          isFalse: isAnonymousFalse
        }
      );
    }
  } catch (error: any) {
    addResult("Boolean handling test", "FAIL", error.message);
  }
}

async function testCORSAndHeaders() {
  console.log("\n🔍 Testing CORS and Headers");
  console.log("=".repeat(60));
  
  const ANONYMOUS_SURVEY_ID = process.env.ANONYMOUS_SURVEY_ID;
  
  if (!ANONYMOUS_SURVEY_ID) {
    addResult("CORS test", "SKIP", "Set ANONYMOUS_SURVEY_ID to test");
    return;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/survey-session/${ANONYMOUS_SURVEY_ID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const corsHeader = response.headers.get("Access-Control-Allow-Origin");
    const cacheHeader = response.headers.get("Cache-Control");
    
    addResult(
      "CORS headers",
      corsHeader ? "PASS" : "FAIL",
      `CORS: ${corsHeader || "not set"}`,
      { corsHeader, cacheHeader }
    );
    
  } catch (error: any) {
    addResult("CORS test", "FAIL", error.message);
  }
}

async function runProductionTests() {
  console.log("🚀 Production Anonymous Survey Test");
  console.log("=".repeat(60));
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "not set"}`);
  console.log("=".repeat(60));
  
  await testProductionConfig();
  await testAnonymousSurveyAccess();
  await testBooleanHandling();
  await testCORSAndHeaders();
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  
  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Review the output above.");
  }
}

runProductionTests().catch((error) => {
  console.error("❌ Test suite crashed:", error);
  process.exit(1);
});

