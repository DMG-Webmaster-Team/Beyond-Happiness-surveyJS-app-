/**
 * Seed Test Data for E2E Tests
 * 
 * Creates test surveys, users, and other data needed for automated testing.
 * This script should be run before executing E2E tests.
 * 
 * Usage:
 *   npm run seed:test
 *   or
 *   tsx scripts/seed-test-data.ts
 */

import { db } from "../src/db/client";
import {
  users,
  happinessSurveys,
  happinessCharacters,
  happinessQuestions,
} from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load test environment
dotenv.config({ path: ".env.test" });

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test-user@example.com";
const TEST_USER_PHONE = process.env.TEST_USER_PHONE || "+1234567890";

// Test survey IDs from environment or defaults
const TEST_SURVEYS = {
  happinessLogin: process.env.TEST_HAPPINESS_SURVEY_ID || "test_happiness_login",
  happinessAnonymous: "test_happiness_anonymous",
  happinessCollect: "test_happiness_collect",
};

async function seedTestData() {
  console.log("🌱 Starting test data seeding...");
  console.log(`   Environment: ${process.env.TEST_MODE || "development"}`);
  console.log(`   Base URL: ${process.env.BASE_URL || "http://localhost:3000"}`);

  try {
    // 1. Create test user
    console.log("\n👤 Creating test user...");
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, TEST_USER_EMAIL))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        email: TEST_USER_EMAIL,
        name: "Test User",
        phone: TEST_USER_PHONE,
        otp: "123456", // Test OTP
        status: "active",
        companyId: null,
        companyName: null,
      });
      console.log(`   ✅ Created test user: ${TEST_USER_EMAIL}`);
    } else {
      console.log(`   ℹ️  Test user already exists: ${TEST_USER_EMAIL}`);
    }

    // 2. Create happiness test surveys
    console.log("\n📋 Creating happiness test surveys...");

    const happinessSurveyData = [
      {
        id: TEST_SURVEYS.happinessLogin,
        title: "Test Happiness Survey (Login Required)",
        description: "Test happiness survey for E2E testing - requires login",
        accessMode: "login" as const,
        anonymous: false,
        cooldownDays: 7,
        isActive: true,
      },
      {
        id: TEST_SURVEYS.happinessAnonymous,
        title: "Test Happiness Survey (Anonymous)",
        description: "Test happiness survey for E2E testing - anonymous access",
        accessMode: "anonymous" as const,
        anonymous: true,
        cooldownDays: 0,
        isActive: true,
      },
      {
        id: TEST_SURVEYS.happinessCollect,
        title: "Test Happiness Survey (Collect Info)",
        description: "Test happiness survey for E2E testing - collect user info",
        accessMode: "collect_info" as const,
        anonymous: false,
        cooldownDays: 0,
        isActive: true,
      },
    ];

    for (const survey of happinessSurveyData) {
      const existing = await db
        .select()
        .from(happinessSurveys)
        .where(eq(happinessSurveys.id, survey.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(happinessSurveys).values(survey);
        console.log(`   ✅ Created survey: ${survey.title}`);
      } else {
        // Update existing survey to ensure correct configuration
        await db
          .update(happinessSurveys)
          .set({
            title: survey.title,
            description: survey.description,
            accessMode: survey.accessMode,
            anonymous: survey.anonymous,
            cooldownDays: survey.cooldownDays,
            isActive: survey.isActive,
          })
          .where(eq(happinessSurveys.id, survey.id));
        console.log(`   ℹ️  Updated existing survey: ${survey.title}`);
      }
    }

    // 3. Verify happiness questions exist
    console.log("\n❓ Verifying happiness questions...");
    const questions = await db.select().from(happinessQuestions).limit(1);
    
    if (questions.length === 0) {
      console.log("   ⚠️  No happiness questions found!");
      console.log("   Please run: npm run seed:essentials");
      console.log("   This will create the 40 happiness survey questions.");
    } else {
      const totalQuestions = await db.select().from(happinessQuestions);
      console.log(`   ✅ Found ${totalQuestions.length} happiness questions`);
    }

    // 4. Verify happiness characters exist
    console.log("\n🎭 Verifying happiness characters...");
    const characters = await db.select().from(happinessCharacters).limit(1);
    
    if (characters.length === 0) {
      console.log("   ⚠️  No happiness characters found!");
      console.log("   Please run: npm run seed:essentials");
      console.log("   This will create the 32 happiness character profiles.");
    } else {
      const totalCharacters = await db.select().from(happinessCharacters);
      console.log(`   ✅ Found ${totalCharacters.length} happiness characters`);
    }

    console.log("\n✅ Test data seeding completed successfully!");
    console.log("\n📝 Test Configuration:");
    console.log(`   Test User Email: ${TEST_USER_EMAIL}`);
    console.log(`   Test User Phone: ${TEST_USER_PHONE}`);
    console.log(`   Test OTP: 123456`);
    console.log(`\n   Test Survey IDs:`);
    console.log(`   - Login Required: ${TEST_SURVEYS.happinessLogin}`);
    console.log(`   - Anonymous: ${TEST_SURVEYS.happinessAnonymous}`);
    console.log(`   - Collect Info: ${TEST_SURVEYS.happinessCollect}`);
    console.log("\n🚀 Ready to run tests:");
    console.log("   npm run test:happiness");

  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedTestData };



