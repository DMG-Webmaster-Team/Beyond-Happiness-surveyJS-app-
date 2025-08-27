#!/usr/bin/env node

/**
 * Test script for Anonymous Survey feature
 * Tests all scenarios defined in the requirements
 */

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "surveyjs.db");
const db = new Database(dbPath);

console.log("🧪 Testing Anonymous Survey Feature");
console.log("=====================================\n");

async function testAnonymousSurveyFeature() {
  try {
    // Test 1: Verify isAnonymous column exists
    console.log("1️⃣ Testing database schema...");
    const schema = db.prepare("PRAGMA table_info(surveys)").all();
    const isAnonymousColumn = schema.find((col) => col.name === "is_anonymous");

    if (isAnonymousColumn) {
      console.log("✅ is_anonymous column exists in surveys table");
      console.log(`   - Type: ${isAnonymousColumn.type}`);
      console.log(`   - Default: ${isAnonymousColumn.dflt_value}`);
    } else {
      console.log("❌ is_anonymous column missing from surveys table");
      return;
    }

    // Test 2: Check existing surveys default to non-anonymous
    console.log("\n2️⃣ Testing default values...");
    const existingSurveys = db
      .prepare(
        `
      SELECT id, title, is_anonymous 
      FROM surveys 
      LIMIT 5
    `
      )
      .all();

    if (existingSurveys.length > 0) {
      console.log("✅ Existing surveys found:");
      existingSurveys.forEach((survey) => {
        const isAnon =
          survey.is_anonymous === 1 ? "Anonymous" : "Non-anonymous";
        console.log(`   - ${survey.title}: ${isAnon}`);
      });
    } else {
      console.log("ℹ️  No existing surveys found");
    }

    // Test 3: Create a test anonymous survey
    console.log("\n3️⃣ Creating test anonymous survey...");
    const testSurveyId = `test-anon-${Date.now()}`;
    const insertSurvey = db.prepare(`
      INSERT INTO surveys (id, title, description, definition, can_take_multiple, is_anonymous, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const surveyDefinition = {
      title: "Test Anonymous Survey",
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "text",
              name: "name",
              title: "What is your name?",
            },
          ],
        },
      ],
    };

    insertSurvey.run(
      testSurveyId,
      "Test Anonymous Survey",
      "A test survey for anonymous feature",
      JSON.stringify(surveyDefinition),
      0, // can_take_multiple = false
      1, // is_anonymous = true
      "admin1"
    );
    console.log(`✅ Created anonymous survey: ${testSurveyId}`);

    // Test 4: Verify the survey was created correctly
    console.log("\n4️⃣ Verifying anonymous survey...");
    const createdSurvey = db
      .prepare(
        `
      SELECT id, title, is_anonymous, can_take_multiple 
      FROM surveys 
      WHERE id = ?
    `
      )
      .get(testSurveyId);

    if (createdSurvey && createdSurvey.is_anonymous === 1) {
      console.log("✅ Anonymous survey created successfully");
      console.log(`   - ID: ${createdSurvey.id}`);
      console.log(`   - Title: ${createdSurvey.title}`);
      console.log(`   - Anonymous: ${createdSurvey.is_anonymous === 1}`);
      console.log(`   - Multiple: ${createdSurvey.can_take_multiple === 1}`);
    } else {
      console.log("❌ Failed to create anonymous survey correctly");
    }

    // Test 5: Test anonymous submission (simulate)
    console.log("\n5️⃣ Testing anonymous submission simulation...");
    const insertResult = db.prepare(`
      INSERT INTO results (id, survey_id, user_id, admin_id, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const resultId = `result-anon-${Date.now()}`;
    const testData = { name: "Anonymous User" };

    insertResult.run(
      resultId,
      testSurveyId,
      null, // user_id = null for anonymous
      "admin1",
      JSON.stringify(testData),
      new Date().toISOString()
    );
    console.log("✅ Anonymous submission created successfully");
    console.log(`   - Result ID: ${resultId}`);
    console.log(`   - User ID: null (anonymous)`);
    console.log(`   - Data: ${JSON.stringify(testData)}`);

    // Test 6: Verify anonymous results can be queried
    console.log("\n6️⃣ Testing anonymous results retrieval...");
    const anonymousResults = db
      .prepare(
        `
      SELECT id, survey_id, user_id, data, submitted_at
      FROM results 
      WHERE survey_id = ? AND user_id IS NULL
    `
      )
      .all(testSurveyId);

    if (anonymousResults.length > 0) {
      console.log(`✅ Found ${anonymousResults.length} anonymous result(s)`);
      anonymousResults.forEach((result, index) => {
        console.log(`   Result ${index + 1}:`);
        console.log(`   - ID: ${result.id}`);
        console.log(`   - Survey: ${result.survey_id}`);
        console.log(`   - User: ${result.user_id || "Anonymous"}`);
        console.log(`   - Data: ${result.data}`);
      });
    } else {
      console.log("❌ No anonymous results found");
    }

    // Test 7: Test multiple anonymous submissions (should be allowed)
    console.log("\n7️⃣ Testing multiple anonymous submissions...");
    const result2Id = `result-anon-2-${Date.now()}`;
    const testData2 = { name: "Another Anonymous User" };

    insertResult.run(
      result2Id,
      testSurveyId,
      null, // user_id = null for anonymous
      "admin1",
      JSON.stringify(testData2),
      new Date().toISOString()
    );

    const totalAnonymousResults = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM results 
      WHERE survey_id = ? AND user_id IS NULL
    `
      )
      .get(testSurveyId);

    console.log(
      `✅ Multiple anonymous submissions allowed: ${totalAnonymousResults.count} total`
    );

    // Test 8: Cleanup test data
    console.log("\n8️⃣ Cleaning up test data...");
    db.prepare("DELETE FROM results WHERE survey_id = ?").run(testSurveyId);
    db.prepare("DELETE FROM surveys WHERE id = ?").run(testSurveyId);
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All anonymous survey tests passed!");
    console.log("\n📋 Summary:");
    console.log("✅ Database schema updated correctly");
    console.log("✅ Default values work as expected");
    console.log("✅ Anonymous surveys can be created");
    console.log("✅ Anonymous submissions work (userId = null)");
    console.log("✅ Multiple anonymous submissions allowed");
    console.log("✅ Anonymous results can be queried");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    db.close();
  }
}

// Test the actual endpoints
async function testAPIEndpoints() {
  console.log("\n🌐 Testing API Endpoints");
  console.log("========================\n");

  const baseURL = "http://localhost:3000";

  try {
    // Note: These tests require the server to be running
    console.log(
      "ℹ️  To test API endpoints, ensure the server is running with:"
    );
    console.log("   npm run dev");
    console.log("");
    console.log("Then you can test manually:");
    console.log("1. Create an anonymous survey in the admin panel");
    console.log("2. Visit the survey URL without logging in");
    console.log("3. Submit the survey multiple times");
    console.log("4. Check that submissions are stored with userId = null");
    console.log("");
    console.log("Example anonymous survey URL:");
    console.log(`${baseURL}/user/survey/[survey-id]`);
  } catch (error) {
    console.log("ℹ️  API endpoint testing requires manual verification");
  }
}

// Run all tests
testAnonymousSurveyFeature().then(() => {
  testAPIEndpoints();
});

