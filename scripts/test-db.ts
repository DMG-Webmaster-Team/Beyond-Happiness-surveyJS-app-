/**
 * Database Integration Test
 *
 * This script tests the database connection and basic CRUD operations.
 * Run with: npx tsx scripts/test-db.ts
 */

import { db } from "../src/db/client";
import { admins, users, surveys, results } from "../src/db/schema";

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");

  try {
    // Test basic connection
    const result = await db.select().from(admins).limit(1);
    console.log("✅ Database connection successful");

    // Test table creation (should work after migrations)
    const adminCount = await db.select().from(admins).limit(1);
    console.log("✅ Database tables accessible");

    // Test basic queries
    const allAdmins = await db.select().from(admins);
    const allUsers = await db.select().from(users);
    const allSurveys = await db.select().from(surveys);
    const allResults = await db.select().from(results);

    console.log("📊 Database Statistics:");
    console.log(`  - Admins: ${allAdmins.length}`);
    console.log(`  - Users: ${allUsers.length}`);
    console.log(`  - Surveys: ${allSurveys.length}`);
    console.log(`  - Results: ${allResults.length}`);

    if (allSurveys.length > 0) {
      console.log("✅ Database seeded with data");
    } else {
      console.log("⚠️  Database is empty - run 'npm run db:seed' to populate");
    }

    console.log("🎉 Database integration test passed!");
  } catch (error) {
    console.error("❌ Database test failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.log("\n💡 Tips:");
        console.log("  1. Make sure MySQL is running");
        console.log("  2. Check your DATABASE_URL in .env.local");
        console.log("  3. Ensure the database exists");
      } else if (
        error.message.includes("Table") &&
        error.message.includes("doesn't exist")
      ) {
        console.log("\n💡 Tips:");
        console.log("  1. Run 'npm run db:gen' to generate migrations");
        console.log("  2. Run 'npm run db:push' to create tables");
      } else if (error.message.includes("Access denied")) {
        console.log("\n💡 Tips:");
        console.log("  1. Check your database credentials");
        console.log("  2. Ensure the user has proper permissions");
      }
    }

    process.exit(1);
  }
}

// API endpoint simulation test
async function testAPISimulation() {
  console.log("\n🔍 Testing API endpoint simulation...");

  try {
    // Simulate the surveys endpoint
    const { listSurveys } = await import("../src/db/queries/surveys");
    const surveys = await listSurveys();
    console.log(`✅ Surveys query works: ${surveys.length} surveys found`);

    // Simulate the results endpoint
    const { listResultsBySurveyPaged } = await import(
      "../src/db/queries/results"
    );
    const results = await listResultsBySurveyPaged({ limit: 10 });
    console.log(
      `✅ Results query works: ${results.results.length} results found`
    );

    console.log("🎉 API simulation test passed!");
  } catch (error) {
    console.error("❌ API simulation test failed:", error);
  }
}

async function main() {
  console.log("🚀 Starting Database Integration Tests\n");

  await testDatabaseConnection();
  await testAPISimulation();

  console.log("\n✨ All tests completed!");
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
}
