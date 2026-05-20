/**
 * Search for surveys by ID in the database
 * 
 * Usage:
 *   npx tsx scripts/search-survey.ts Il1M_ohQKXWbCBXUJHWMe
 *   npx tsx scripts/search-survey.ts --partial Il1M
 */

import { db } from "../src/db/client";
import { surveys } from "../src/db/schema/surveys";
import { happinessSurveys } from "../src/db/schema/happiness";
import { eq, like, or } from "drizzle-orm";

const searchId = process.argv[2];
const isPartial = process.argv[2] === "--partial";
const actualSearchId = isPartial ? process.argv[3] : searchId;

if (!actualSearchId) {
  console.error("❌ Please provide a survey ID to search");
  console.log("\nUsage:");
  console.log("  npx tsx scripts/search-survey.ts SURVEY_ID");
  console.log("  npx tsx scripts/search-survey.ts --partial PARTIAL_ID");
  console.log("\nExample:");
  console.log("  npx tsx scripts/search-survey.ts Il1M_ohQKXWbCBXUJHWMe");
  console.log("  npx tsx scripts/search-survey.ts --partial Il1M");
  process.exit(1);
}

async function searchSurveys() {
  console.log("🔍 Searching for surveys...\n");

  try {
    // Search in happiness surveys
    console.log("📊 Happiness Surveys:");
    console.log("=".repeat(60));
    
    let happinessResults;
    if (isPartial) {
      happinessResults = await db
        .select()
        .from(happinessSurveys)
        .where(like(happinessSurveys.id, `%${actualSearchId}%`));
    } else {
      happinessResults = await db
        .select()
        .from(happinessSurveys)
        .where(eq(happinessSurveys.id, actualSearchId));
    }

    if (happinessResults.length > 0) {
      happinessResults.forEach((survey: any) => {
        console.log(`\n✅ Found Happiness Survey:`);
        console.log(`   ID: ${survey.id}`);
        console.log(`   Title: ${survey.title}`);
        console.log(`   Anonymous: ${survey.anonymous ? 'Yes' : 'No'}`);
        console.log(`   Access Mode: ${survey.accessMode || 'Not set'}`);
        console.log(`   Published: ${survey.isPublished ? 'Yes' : 'No'}`);
        console.log(`   Cooldown Days: ${survey.retakeCooldownDays || 0}`);
        console.log(`   Company ID: ${survey.companyId || 'None'}`);
        console.log(`   Created: ${survey.createdAt}`);
      });
    } else {
      console.log("   No happiness surveys found");
    }

    // Search in regular surveys
    console.log("\n\n📋 Regular Surveys:");
    console.log("=".repeat(60));
    
    let regularResults;
    if (isPartial) {
      regularResults = await db
        .select()
        .from(surveys)
        .where(like(surveys.id, `%${actualSearchId}%`));
    } else {
      regularResults = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, actualSearchId));
    }

    if (regularResults.length > 0) {
      regularResults.forEach((survey: any) => {
        console.log(`\n✅ Found Regular Survey:`);
        console.log(`   ID: ${survey.id}`);
        console.log(`   Title: ${survey.title}`);
        console.log(`   Description: ${survey.description || 'None'}`);
        console.log(`   Anonymous: ${survey.isAnonymous ? 'Yes' : 'No'}`);
        console.log(`   Can Take Multiple: ${survey.canTakeMultiple ? 'Yes' : 'No'}`);
        console.log(`   Created By: ${survey.createdBy}`);
        console.log(`   Created: ${survey.createdAt}`);
      });
    } else {
      console.log("   No regular surveys found");
    }

    // Summary
    const totalFound = happinessResults.length + regularResults.length;
    console.log("\n" + "=".repeat(60));
    console.log(`📊 Total surveys found: ${totalFound}`);
    console.log("=".repeat(60));

    if (totalFound === 0) {
      console.log("\n💡 Tips:");
      console.log("   - Check if the ID is correct");
      console.log("   - Try using --partial for partial ID search");
      console.log("   - Make sure the survey exists in the database");
    }

  } catch (error) {
    console.error("❌ Error searching surveys:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

searchSurveys();

