/**
 * Script to check if a survey exists in production database
 * Usage: tsx scripts/check-survey-production.ts <surveyId>
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { happinessSurveys } from "../src/db/schema/happiness";
import { surveys } from "../src/db/schema/surveys";
import { eq } from "drizzle-orm";

async function checkSurvey(surveyId: string) {
  // Get production database credentials from environment
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not found in environment");
    console.log("\nPlease set your production DATABASE_URL:");
    console.log("export DATABASE_URL='mysql://user:pass@host:port/database'");
    process.exit(1);
  }

  console.log("🔍 Checking survey:", surveyId);
  console.log("📊 Database:", dbUrl.split("@")[1]?.split("?")[0] || "unknown");
  console.log("");

  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection(dbUrl);
    const db = drizzle(connection);

    // Check happiness_surveys table
    console.log("1️⃣ Checking happiness_surveys table...");
    const happinessSurvey = await db
      .select()
      .from(happinessSurveys)
      .where(eq(happinessSurveys.id, surveyId))
      .limit(1);

    if (happinessSurvey.length > 0) {
      console.log("✅ Found in happiness_surveys!");
      console.log(JSON.stringify(happinessSurvey[0], null, 2));
      return;
    } else {
      console.log("❌ Not found in happiness_surveys");
    }

    console.log("");

    // Check surveys table
    console.log("2️⃣ Checking surveys table...");
    const regularSurvey = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, surveyId))
      .limit(1);

    if (regularSurvey.length > 0) {
      console.log("✅ Found in surveys!");
      console.log(JSON.stringify(regularSurvey[0], null, 2));
      return;
    } else {
      console.log("❌ Not found in surveys");
    }

    console.log("");
    console.log("❌ Survey not found in either table");
    console.log("");
    console.log("💡 Possible reasons:");
    console.log("   1. Survey was deleted");
    console.log("   2. Survey ID is incorrect");
    console.log("   3. Survey exists in local DB but not in production");
    console.log("   4. Database name mismatch");
    console.log("");
    console.log("🔧 Next steps:");
    console.log("   1. Verify the survey exists in admin panel");
    console.log("   2. Check if you're using the correct database");
    console.log("   3. List all surveys to find the correct ID");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get survey ID from command line
const surveyId = process.argv[2];

if (!surveyId) {
  console.error("❌ Please provide a survey ID");
  console.log("\nUsage: tsx scripts/check-survey-production.ts <surveyId>");
  console.log("Example: tsx scripts/check-survey-production.ts vyTww51k_4swiz2P8YnCx");
  process.exit(1);
}

checkSurvey(surveyId);

