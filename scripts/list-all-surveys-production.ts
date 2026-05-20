/**
 * Script to list all surveys in production database
 * Usage: tsx scripts/list-all-surveys-production.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { happinessSurveys } from "../src/db/schema/happiness";
import { surveys } from "../src/db/schema/surveys";

async function listAllSurveys() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not found in environment");
    console.log("\nPlease set your production DATABASE_URL:");
    console.log("export DATABASE_URL='mysql://user:pass@host:port/database'");
    process.exit(1);
  }

  console.log("📊 Database:", dbUrl.split("@")[1]?.split("?")[0] || "unknown");
  console.log("");

  let connection;
  
  try {
    connection = await mysql.createConnection(dbUrl);
    const db = drizzle(connection);

    // List happiness surveys
    console.log("🎯 HAPPINESS SURVEYS:");
    console.log("=".repeat(80));
    const happinessList = await db
      .select({
        id: happinessSurveys.id,
        title: happinessSurveys.title,
        anonymous: happinessSurveys.anonymous,
        accessMode: happinessSurveys.accessMode,
        isActive: happinessSurveys.isActive,
        isPublished: happinessSurveys.isPublished,
        createdAt: happinessSurveys.createdAt,
      })
      .from(happinessSurveys)
      .limit(50);

    if (happinessList.length === 0) {
      console.log("   (no happiness surveys found)");
    } else {
      happinessList.forEach((survey, index) => {
        console.log(`\n${index + 1}. ${survey.title}`);
        console.log(`   ID: ${survey.id}`);
        console.log(`   Anonymous: ${survey.anonymous}`);
        console.log(`   Access Mode: ${survey.accessMode || "N/A"}`);
        console.log(`   Active: ${survey.isActive}, Published: ${survey.isPublished}`);
        console.log(`   Created: ${survey.createdAt}`);
      });
    }

    console.log("\n");
    console.log("📋 REGULAR SURVEYS:");
    console.log("=".repeat(80));
    const regularList = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        isAnonymous: surveys.isAnonymous,
        canTakeMultiple: surveys.canTakeMultiple,
        isActive: surveys.isActive,
        isPublished: surveys.isPublished,
        createdAt: surveys.createdAt,
      })
      .from(surveys)
      .limit(50);

    if (regularList.length === 0) {
      console.log("   (no regular surveys found)");
    } else {
      regularList.forEach((survey, index) => {
        console.log(`\n${index + 1}. ${survey.title}`);
        console.log(`   ID: ${survey.id}`);
        console.log(`   Anonymous: ${survey.isAnonymous}`);
        console.log(`   Can Take Multiple: ${survey.canTakeMultiple}`);
        console.log(`   Active: ${survey.isActive}, Published: ${survey.isPublished}`);
        console.log(`   Created: ${survey.createdAt}`);
      });
    }

    console.log("\n");
    console.log(`📊 Total: ${happinessList.length} happiness surveys, ${regularList.length} regular surveys`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

listAllSurveys();

