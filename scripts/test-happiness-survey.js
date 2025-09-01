#!/usr/bin/env node

/**
 * Happiness Survey Automation Test Script
 *
 * This script automatically tests the complete happiness survey workflow:
 * 1. Creates test surveys with different configurations
 * 2. Submits test responses with various answer patterns
 * 3. Verifies scoring calculations and character assignments
 * 4. Tests cooldown functionality
 * 5. Validates API responses and error handling
 */

const BASE_URL = "http://localhost:3001";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Test scenarios with expected outcomes
const testScenarios = [
  {
    name: "Complete Human (Maximum Scores)",
    description: "All 5s - should get 11111 code and Complete Human character",
    answers: Array.from({ length: 40 }, (_, i) => ({
      questionId: i + 1,
      valueIndex: 5,
    })),
    expectedCode: "11111",
    expectedCharacter: "Complete Human",
  },
  {
    name: "Curious Nomad (Minimum Scores)",
    description: "All 1s - should get 00000 code and Curious Nomad character",
    answers: Array.from({ length: 40 }, (_, i) => ({
      questionId: i + 1,
      valueIndex: 1,
    })),
    expectedCode: "00000",
    expectedCharacter: "Curious Nomad",
  },
  {
    name: "Meaning Only High",
    description:
      "High meaning (questions 1-8), low others - should get 10000 code",
    answers: [
      // Meaning questions (1-8): High scores
      ...Array.from({ length: 8 }, (_, i) => ({
        questionId: i + 1,
        valueIndex: 5,
      })),
      // Other questions (9-40): Low scores
      ...Array.from({ length: 32 }, (_, i) => ({
        questionId: i + 9,
        valueIndex: 1,
      })),
    ],
    expectedCode: "10000",
    expectedCharacter: "Mindful Seeker",
  },
  {
    name: "Delight Only High",
    description:
      "High delight (questions 9-16), low others - should get 01000 code",
    answers: [
      // Meaning questions (1-8): Low scores
      ...Array.from({ length: 8 }, (_, i) => ({
        questionId: i + 1,
        valueIndex: 1,
      })),
      // Delight questions (9-16): High scores
      ...Array.from({ length: 8 }, (_, i) => ({
        questionId: i + 9,
        valueIndex: 5,
      })),
      // Other questions (17-40): Low scores
      ...Array.from({ length: 24 }, (_, i) => ({
        questionId: i + 17,
        valueIndex: 1,
      })),
    ],
    expectedCode: "01000",
    expectedCharacter: "Joyful Creator",
  },
  {
    name: "Mixed Pattern",
    description: "High Meaning + Freedom, low others - should get 10100 code",
    answers: [
      // Meaning questions (1-8): High scores
      ...Array.from({ length: 8 }, (_, i) => ({
        questionId: i + 1,
        valueIndex: 5,
      })),
      // Delight questions (9-16): Low scores
      ...Array.from({ length: 8 }, (_, i) => ({
        questionId: i + 9,
        valueIndex: 1,
      })),
      // Freedom questions (17-24): High scores
      ...Array.from({ length: 8 }, (_, i) => ({
        questionId: i + 17,
        valueIndex: 5,
      })),
      // Other questions: Low scores
      ...Array.from({ length: 16 }, (_, i) => ({
        questionId: i + 25,
        valueIndex: 1,
      })),
    ],
    expectedCode: "10100",
    expectedCharacter: "Purposeful Wanderer",
  },
];

class HappinessSurveyTester {
  constructor() {
    this.testSurveyId = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      return { response, data, success: response.ok };
    } catch (error) {
      this.log(`❌ Request failed: ${error.message}`, colors.red);
      return { success: false, error: error.message };
    }
  }

  async createTestSurvey() {
    this.log(`\n${colors.bold}🔧 Creating test survey...${colors.reset}`);

    const { success, data } = await this.makeRequest("/api/happiness/surveys", {
      method: "POST",
      body: JSON.stringify({
        title: `Happiness Survey Test - ${new Date().toISOString()}`,
        anonymous: true,
        retakeCooldownDays: 0, // No cooldown for testing
      }),
    });

    if (success && data.survey) {
      this.testSurveyId = data.survey.id;
      this.log(`✅ Test survey created: ${this.testSurveyId}`, colors.green);
      return true;
    } else {
      this.log(
        `❌ Failed to create test survey: ${data.error || "Unknown error"}`,
        colors.red
      );
      return false;
    }
  }

  async testSurveySubmission(scenario) {
    this.log(`\n${colors.bold}🧪 Testing: ${scenario.name}${colors.reset}`);
    this.log(`📝 ${scenario.description}`, colors.cyan);

    const { success, data } = await this.makeRequest("/api/happiness/results", {
      method: "POST",
      body: JSON.stringify({
        surveyId: this.testSurveyId,
        answers: scenario.answers,
      }),
    });

    if (!success) {
      this.log(
        `❌ Submission failed: ${data.error || "Unknown error"}`,
        colors.red
      );
      return false;
    }

    const result = {
      scenario: scenario.name,
      success: true,
      actualCode: data.code,
      expectedCode: scenario.expectedCode,
      actualCharacter: data.character.name,
      expectedCharacter: scenario.expectedCharacter,
      categoryTotals: data.categoryTotals,
      overallScore: data.overallScore,
    };

    // Verify results
    const codeMatches = result.actualCode === result.expectedCode;
    const characterMatches =
      result.actualCharacter === result.expectedCharacter;

    if (codeMatches && characterMatches) {
      this.log(
        `✅ PASS - Code: ${result.actualCode}, Character: ${result.actualCharacter}`,
        colors.green
      );
    } else {
      this.log(
        `❌ FAIL - Expected: ${result.expectedCode}/${result.expectedCharacter}, Got: ${result.actualCode}/${result.actualCharacter}`,
        colors.red
      );
      result.success = false;
    }

    // Log category breakdown
    this.log(`📊 Category Totals:`, colors.blue);
    Object.entries(result.categoryTotals).forEach(([category, total]) => {
      const isHigh = total >= 6000;
      this.log(
        `   ${category}: ${total} ${isHigh ? "✓" : "✗"}`,
        isHigh ? colors.green : colors.yellow
      );
    });

    this.log(`🎯 Overall Score: ${result.overallScore}`, colors.magenta);

    this.testResults.push(result);
    return result.success;
  }

  async testCooldownFunctionality() {
    this.log(
      `\n${colors.bold}🕐 Testing multiple submissions (no cooldown)...${colors.reset}`
    );

    // Test that anonymous surveys with 0 cooldown allow multiple submissions
    const firstResponse = await this.makeRequest("/api/happiness/results", {
      method: "POST",
      body: JSON.stringify({
        surveyId: this.testSurveyId, // Uses the main test survey (anonymous, 0 cooldown)
        answers: testScenarios[0].answers,
      }),
    });

    if (!firstResponse.success) {
      this.log(`❌ First submission failed`, colors.red);
      return false;
    }

    this.log(`✅ First submission successful`, colors.green);

    // Try immediate second submission (should succeed for anonymous surveys)
    const secondResponse = await this.makeRequest("/api/happiness/results", {
      method: "POST",
      body: JSON.stringify({
        surveyId: this.testSurveyId,
        answers: testScenarios[1].answers,
      }),
    });

    if (secondResponse.success) {
      this.log(
        `✅ Second submission successful (anonymous survey allows multiple)`,
        colors.green
      );
      return true;
    } else {
      this.log(
        `❌ Second submission failed: ${secondResponse.data.error}`,
        colors.red
      );
      return false;
    }
  }

  async testApiEndpoints() {
    this.log(`\n${colors.bold}🔍 Testing API endpoints...${colors.reset}`);

    const endpoints = [
      {
        path: "/api/happiness/questions",
        method: "GET",
        description: "Get happiness questions",
      },
      {
        path: "/api/happiness/characters",
        method: "GET",
        description: "Get happiness characters",
      },
      {
        path: "/api/happiness/surveys",
        method: "GET",
        description: "Get happiness surveys",
      },
    ];

    let allPassed = true;

    for (const endpoint of endpoints) {
      const { success, data } = await this.makeRequest(endpoint.path, {
        method: endpoint.method,
      });

      if (success) {
        this.log(`✅ ${endpoint.description}`, colors.green);
      } else {
        this.log(
          `❌ ${endpoint.description} - ${data.error || "Failed"}`,
          colors.red
        );
        allPassed = false;
      }
    }

    return allPassed;
  }

  async cleanupTestSurvey() {
    if (!this.testSurveyId) return;

    this.log(`\n${colors.bold}🧹 Cleaning up test survey...${colors.reset}`);

    const { success } = await this.makeRequest(
      `/api/happiness/surveys/${this.testSurveyId}`,
      {
        method: "DELETE",
      }
    );

    if (success) {
      this.log(`✅ Test survey deleted`, colors.green);
    } else {
      this.log(
        `⚠️  Failed to delete test survey (may need manual cleanup)`,
        colors.yellow
      );
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    this.log(`\n${colors.bold}📋 TEST REPORT${colors.reset}`);
    this.log(`⏱️  Duration: ${duration}s`);

    const passed = this.testResults.filter((r) => r.success).length;
    const total = this.testResults.length;

    this.log(
      `📊 Results: ${passed}/${total} scenarios passed`,
      passed === total ? colors.green : colors.red
    );

    if (passed < total) {
      this.log(
        `\n${colors.bold}❌ FAILED SCENARIOS:${colors.reset}`,
        colors.red
      );
      this.testResults
        .filter((r) => !r.success)
        .forEach((result) => {
          this.log(
            `   • ${result.scenario}: Expected ${result.expectedCode}/${result.expectedCharacter}, got ${result.actualCode}/${result.actualCharacter}`,
            colors.red
          );
        });
    }

    this.log(`\n${colors.bold}✨ Test completed!${colors.reset}`);
    return passed === total;
  }

  async runAllTests() {
    this.log(
      `${colors.bold}🧪 Starting Happiness Survey Automation Tests${colors.reset}`
    );
    this.log(`🌐 Testing against: ${BASE_URL}`);

    try {
      // Create test survey
      const surveyCreated = await this.createTestSurvey();
      if (!surveyCreated) {
        this.log(`❌ Cannot proceed without test survey`, colors.red);
        return false;
      }

      // Test API endpoints
      await this.testApiEndpoints();

      // Test each scenario
      for (const scenario of testScenarios) {
        await this.testSurveySubmission(scenario);
        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Test cooldown functionality
      await this.testCooldownFunctionality();

      // Generate final report
      const allPassed = this.generateReport();

      return allPassed;
    } catch (error) {
      this.log(`❌ Test suite failed with error: ${error.message}`, colors.red);
      return false;
    } finally {
      // Always try to cleanup
      await this.cleanupTestSurvey();
    }
  }
}

// Run the test suite
async function main() {
  const tester = new HappinessSurveyTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

// Check if we're running directly (not imported)
if (require.main === module) {
  main().catch((error) => {
    console.error(
      `${colors.red}❌ Test runner failed: ${error.message}${colors.reset}`
    );
    process.exit(1);
  });
}

module.exports = HappinessSurveyTester;
