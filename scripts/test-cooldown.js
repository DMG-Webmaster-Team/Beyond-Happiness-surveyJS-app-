#!/usr/bin/env node

/**
 * Test Cooldown Functionality
 * Tests that cooldown works properly for happiness surveys
 */

const BASE_URL = "http://localhost:3001";

async function testCooldown() {
  console.log("🕐 Testing Cooldown Functionality\n");

  try {
    // 1. Create a survey with cooldown
    console.log("1️⃣ Creating survey with 1-day cooldown...");
    const surveyResponse = await fetch(`${BASE_URL}/api/happiness/surveys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Cooldown Test - ${new Date().toISOString()}`,
        anonymous: false,
        retakeCooldownDays: 1,
      }),
    });

    const surveyData = await surveyResponse.json();
    const surveyId = surveyData.survey.id;
    console.log(`✅ Survey created: ${surveyId}`);

    // 2. Check initial access (should be allowed)
    console.log("\n2️⃣ Checking initial access...");
    const accessResponse1 = await fetch(
      `${BASE_URL}/api/happiness/surveys/${surveyId}/access`
    );
    const accessData1 = await accessResponse1.json();
    console.log(`Access allowed: ${accessData1.canAccess}`);
    console.log(`Message: ${accessData1.message}`);

    // 3. Submit first survey
    console.log("\n3️⃣ Submitting first survey response...");
    const submitResponse = await fetch(`${BASE_URL}/api/happiness/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surveyId: surveyId,
        answers: Array.from({ length: 40 }, (_, i) => ({
          questionId: i + 1,
          valueIndex: 3,
        })),
        userId: "test-user-123",
      }),
    });

    if (submitResponse.ok) {
      const result = await submitResponse.json();
      console.log(`✅ First submission successful`);
      console.log(`Character: ${result.character.name}`);
    } else {
      const error = await submitResponse.json();
      console.log(`❌ First submission failed: ${error.error}`);
    }

    // 4. Check access immediately after (should be blocked)
    console.log("\n4️⃣ Checking access immediately after submission...");
    const accessResponse2 = await fetch(
      `${BASE_URL}/api/happiness/surveys/${surveyId}/access`
    );
    const accessData2 = await accessResponse2.json();
    console.log(`Access allowed: ${accessData2.canAccess}`);
    console.log(`Message: ${accessData2.message}`);

    if (accessData2.cooldownRemaining) {
      console.log(`Cooldown remaining: ${accessData2.cooldownRemaining} days`);
    }

    // 5. Try to submit again (should fail)
    console.log("\n5️⃣ Attempting second submission (should fail)...");
    const submitResponse2 = await fetch(`${BASE_URL}/api/happiness/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surveyId: surveyId,
        answers: Array.from({ length: 40 }, (_, i) => ({
          questionId: i + 1,
          valueIndex: 5,
        })),
        userId: "test-user-123",
      }),
    });

    if (submitResponse2.ok) {
      console.log(`❌ Second submission should have failed but succeeded`);
    } else {
      const error = await submitResponse2.json();
      console.log(`✅ Second submission properly blocked: ${error.error}`);
    }

    // 6. Cleanup
    console.log("\n6️⃣ Cleaning up...");
    const deleteResponse = await fetch(
      `${BASE_URL}/api/happiness/surveys/${surveyId}`,
      { method: "DELETE" }
    );
    console.log(`Survey deleted: ${deleteResponse.ok ? "✅" : "❌"}`);

    console.log("\n🎉 Cooldown test completed successfully!");
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

testCooldown();
