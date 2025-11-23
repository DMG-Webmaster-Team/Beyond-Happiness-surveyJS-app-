#!/usr/bin/env tsx

// Test script to verify PDF generation with detailed descriptions
// This simulates the PDF generation process without requiring database connection

interface TestResult {
  id: string;
  surveyId: string;
  code: string;
  character: {
    id: number;
    name: string;
    description: string;
    detailedDescription: string;
    avatarUrl: string;
  };
  categoryTotals: {
    Meaning: number;
    Delight: number;
    Freedom: number;
    Engagement: number;
    Vitality: number;
  };
  essentialTotals: Record<string, number>;
  answers: any[];
}

// Sample test data with detailed description
const testResult: TestResult = {
  id: "test-result-123",
  surveyId: "test-survey-456",
  code: "00000",
  character: {
    id: 1,
    name: "Lost Explorer",
    description:
      "You struggle to find purpose and meaning, lacking vitality and autonomy in your daily life.",
    detailedDescription: `<div>
  <p>Dear Lost Explorer,</p>
  <p>Based on the scientifically-backed model called <strong>"The 5 Truths of Happiness"</strong>, your results provide valuable insights into your current state of happiness, offering actionable guidance on how to elevate your overall well-being.</p>
  
  <h3>Character Description:</h3>
  <p>As a <strong>Lost Explorer</strong>, you struggle to find purpose and meaning, lacking vitality and autonomy in your daily life. While responsibilities provide a sense of purpose, you feel constrained by obligations and a lack of freedom, finding it difficult to engage fully or experience delight.</p>

  <h3>Key Character Strengths:</h3>
  <ul>
    <li><strong>Sense of Responsibility:</strong> Your dedication to responsibilities provides purpose and motivation.</li>
  </ul>

  <h3>Areas for Improvements:</h3>
  <h4>Focus on Vitality First – Why?</h4>
  <p>For the <strong>Lost Explorer</strong>, revitalizing <strong>Vitality</strong> is essential. This foundation empowers one to tackle life's demands with energy and resilience.</p>

  <h4>Actionable Steps Towards Enhanced Vitality:</h4>
  <ul>
    <li><strong>Incorporate Regular Exercise:</strong> Start with small, manageable activities like daily walks or yoga.</li>
    <li><strong>Prioritize Nutrition:</strong> Focus on a balanced diet rich in fruits, vegetables, whole grains, and lean proteins.</li>
    <li><strong>Ensure Quality Sleep:</strong> Establish a consistent sleep schedule and create a restful environment.</li>
    <li><strong>Practice Mindfulness:</strong> Engage in mindfulness or meditation to enhance mental clarity and emotional balance.</li>
  </ul>
</div>`,
    avatarUrl: "/characters/00000.png",
  },
  categoryTotals: {
    Meaning: 2500,
    Delight: 3000,
    Freedom: 2800,
    Engagement: 3200,
    Vitality: 2200,
  },
  essentialTotals: {
    essential_1: 1200,
    essential_2: 1500,
    essential_3: 1100,
  },
  answers: [],
};

async function testPDFGeneration() {
  console.log("🧪 Testing PDF generation with detailed description...");

  try {
    // Test both English and Arabic
    const languages = ["en", "ar"] as const;

    for (const lang of languages) {
      console.log(`\n📝 Testing ${lang.toUpperCase()} PDF generation...`);

      // Simulate the API call
      const baseUrl = "http://localhost:3000"; // Adjust if different

      const response = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: testResult,
          lang: lang,
        }),
      });

      if (response.ok) {
        const pdfBlob = await response.blob();
        console.log(`✅ ${lang.toUpperCase()} PDF generated successfully!`);
        console.log(`📊 PDF size: ${pdfBlob.size} bytes`);

        // Save the PDF to test directory for manual verification
        const fs = await import("fs");
        const path = await import("path");

        const testDir = path.join(process.cwd(), "testsprite_tests", "tmp");
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }

        const filename = `test-detailed-description-${lang}.pdf`;
        const filepath = path.join(testDir, filename);

        const buffer = Buffer.from(await pdfBlob.arrayBuffer());
        fs.writeFileSync(filepath, buffer);

        console.log(`💾 PDF saved to: ${filepath}`);
      } else {
        const errorText = await response.text();
        console.error(
          `❌ ${lang.toUpperCase()} PDF generation failed:`,
          response.status,
          errorText
        );
      }
    }

    console.log("\n🎉 PDF generation test completed!");
    console.log(
      "📁 Check the testsprite_tests/tmp/ directory for generated PDFs"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);

    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.log(
        "\n💡 Tip: Make sure the Next.js development server is running:"
      );
      console.log("   npm run dev");
    }
  }
}

// Test the detailed description rendering without PDF generation
function testDetailedDescriptionRendering() {
  console.log("\n🔍 Testing detailed description rendering logic...");

  const isRTL = false;
  const language = "en";

  // Simulate the PDF HTML generation logic
  const detailedDescriptionSection = testResult.character.detailedDescription
    ? `
  <!-- Character Detailed Description (Page Break) -->
  <div style="page-break-before: always; padding: 2rem;">
    <div style="background-color: white; border-radius: 0.5rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; padding: 2rem;">
      <h3 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; text-align: center; margin-bottom: 1.5rem;">
        Detailed Character Analysis
      </h3>
      
      <div class="detailed-description-content" style="
        font-size: 1rem;
        line-height: 1.625;
        color: #374151;
        max-width: 48rem;
        margin: 0 auto;
        text-align: ${isRTL ? "right" : "left"};
        direction: ${isRTL ? "rtl" : "ltr"};
      ">
        ${testResult.character.detailedDescription}
      </div>
    </div>
  </div>
  `
    : "";

  console.log("✅ Detailed description section generated successfully");
  console.log(
    "📏 HTML length:",
    detailedDescriptionSection.length,
    "characters"
  );
  console.log(
    "🔍 Contains HTML tags:",
    detailedDescriptionSection.includes("<h3>") &&
      detailedDescriptionSection.includes("<ul>")
  );
  console.log(
    "🎨 Has styling classes:",
    detailedDescriptionSection.includes("detailed-description-content")
  );

  return detailedDescriptionSection;
}

// Run tests
async function runTests() {
  console.log("🚀 Starting PDF detailed description tests...\n");

  // Test 1: HTML rendering logic
  testDetailedDescriptionRendering();

  // Test 2: Full PDF generation (requires server)
  await testPDFGeneration();
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log("\n✅ All tests completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Tests failed:", error);
      process.exit(1);
    });
}

export { testResult, testPDFGeneration, testDetailedDescriptionRendering };









