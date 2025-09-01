#!/usr/bin/env node

/**
 * Quick Happiness Survey Test
 * Simple script to test the happiness survey functionality
 */

const BASE_URL = "http://localhost:3001";

console.log("🧪 Quick Happiness Survey Test\n");

async function quickTest() {
  try {
    console.log("1️⃣ Creating test survey...");

    // Create test survey
    const surveyResponse = await fetch(`${BASE_URL}/api/happiness/surveys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Quick Test Survey - ${new Date().toISOString()}`,
        anonymous: true,
        retakeCooldownDays: 0,
      }),
    });

    const surveyData = await surveyResponse.json();
    if (!surveyResponse.ok) {
      throw new Error(`Failed to create survey: ${surveyData.error}`);
    }

    const surveyId = surveyData.survey.id;
    console.log(`✅ Survey created: ${surveyId}\n`);

    // Test scenarios
    const tests = [
      {
        name: "Complete Human (All 5s)",
        answers: Array.from({ length: 40 }, (_, i) => ({
          questionId: i + 1,
          valueIndex: 5,
        })),
        expectedCode: "11111",
      },
      {
        name: "Curious Nomad (All 1s)",
        answers: Array.from({ length: 40 }, (_, i) => ({
          questionId: i + 1,
          valueIndex: 1,
        })),
        expectedCode: "00000",
      },
      {
        name: "High Meaning Only",
        answers: [
          ...Array.from({ length: 8 }, (_, i) => ({
            questionId: i + 1,
            valueIndex: 5,
          })),
          ...Array.from({ length: 32 }, (_, i) => ({
            questionId: i + 9,
            valueIndex: 1,
          })),
        ],
        expectedCode: "10000",
      },
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`${i + 2}️⃣ Testing: ${test.name}`);

      const response = await fetch(`${BASE_URL}/api/happiness/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: surveyId,
          answers: test.answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`❌ FAIL: ${data.error}`);
        continue;
      }

      const codeMatch = data.code === test.expectedCode;
      console.log(
        `   Code: ${data.code} (expected: ${test.expectedCode}) ${
          codeMatch ? "✅" : "❌"
        }`
      );
      console.log(`   Character: ${data.character.name}`);
      console.log(`   Avatar: ${data.character.avatarUrl}`);
      console.log(
        `   Categories: M:${data.categoryTotals.Meaning} D:${data.categoryTotals.Delight} F:${data.categoryTotals.Freedom} E:${data.categoryTotals.Engagement} V:${data.categoryTotals.Vitality}`
      );
      console.log(codeMatch ? "   ✅ PASS\n" : "   ❌ FAIL\n");
    }

    // Test API endpoints
    console.log(`${tests.length + 2}️⃣ Testing API endpoints...`);

    const endpoints = [
      "/api/happiness/questions",
      "/api/happiness/characters",
      "/api/happiness/surveys",
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`   ${endpoint}: ${response.ok ? "✅" : "❌"}`);
    }

    // Cleanup
    console.log(`\n🧹 Cleaning up...`);
    const deleteResponse = await fetch(
      `${BASE_URL}/api/happiness/surveys/${surveyId}`,
      {
        method: "DELETE",
      }
    );
    console.log(`   Survey deleted: ${deleteResponse.ok ? "✅" : "❌"}`);

    console.log("\n✨ Test completed!");
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

quickTest();
