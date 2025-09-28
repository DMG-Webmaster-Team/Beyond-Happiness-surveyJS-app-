#!/usr/bin/env node

/**
 * Test script to verify that the happiness results API now returns the ID field
 * needed for PDF generation.
 */

const baseUrl = "http://localhost:4004"; // Using the correct port from the terminal output

async function testHappinessResultsAPI() {
  console.log("🧪 Testing Happiness Results API for PDF ID fix...\n");

  // Sample happiness survey answers (40 questions, values 1-5)
  const sampleAnswers = Array.from({ length: 40 }, (_, i) => ({
    questionId: i + 1,
    valueIndex: Math.floor(Math.random() * 5) + 1, // Random value 1-5
    questionText: `Sample question ${i + 1}`,
    answerText: `Sample answer ${i + 1}`,
  }));

  const testPayload = {
    surveyId: "4N7rUJd-EiyeThYY56SK1", // Anonymous survey ID from the database
    answers: sampleAnswers,
    language: "en",
  };

  try {
    console.log("📤 Sending test happiness survey submission...");

    const response = await fetch(`${baseUrl}/api/happiness/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();

    console.log("📥 Response status:", response.status);
    console.log("📥 Response body:", JSON.stringify(result, null, 2));

    if (response.ok && result.id) {
      console.log("\n✅ SUCCESS: API now returns 'id' field!");
      console.log(`🆔 Result ID: ${result.id}`);
      console.log("🎯 PDF generation should now work!");

      // Test the PDF generation endpoint
      console.log("\n🧪 Testing PDF generation endpoint...");
      const pdfResponse = await fetch(
        `${baseUrl}/api/generate-pdf?id=${result.id}&lang=en`
      );

      if (pdfResponse.ok) {
        console.log("✅ PDF generation endpoint is accessible!");
        console.log(
          `📄 Content-Type: ${pdfResponse.headers.get("Content-Type")}`
        );
      } else {
        console.log("❌ PDF generation endpoint failed:");
        console.log(`Status: ${pdfResponse.status}`);
        const pdfError = await pdfResponse.text();
        console.log(`Error: ${pdfError}`);
      }
    } else if (result.error) {
      console.log("\n❌ API Error:", result.error);
      if (result.error.includes("Survey not found")) {
        console.log(
          "💡 Tip: You may need to use a real survey ID from your database"
        );
      }
    } else {
      console.log("\n❌ FAILED: API response missing 'id' field");
      console.log("🔍 Available fields:", Object.keys(result));
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.log("💡 Make sure your Next.js server is running on", baseUrl);
    }
  }
}

// Run the test
testHappinessResultsAPI();
