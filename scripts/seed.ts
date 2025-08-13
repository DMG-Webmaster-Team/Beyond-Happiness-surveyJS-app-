import { db } from "../src/db/client";
import { admins, users, surveys, results } from "../src/db/schema";
import fs from "fs";
import path from "path";

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Read existing JSON data
    const dataPath = path.join(process.cwd(), "data");
    const adminsData = JSON.parse(
      fs.readFileSync(path.join(dataPath, "admins.json"), "utf8")
    );
    const usersData = JSON.parse(
      fs.readFileSync(path.join(dataPath, "users.json"), "utf8")
    );
    const surveysData = JSON.parse(
      fs.readFileSync(path.join(dataPath, "surveys.json"), "utf8")
    );
    const resultsData = JSON.parse(
      fs.readFileSync(path.join(dataPath, "results.json"), "utf8")
    );

    console.log("📂 Read JSON data files");

    // Clear existing data (in reverse dependency order)
    await db.delete(results);
    await db.delete(surveys);
    await db.delete(users);
    await db.delete(admins);
    console.log("🗑️  Cleared existing data");

    // Seed admins
    for (const admin of adminsData) {
      await db.insert(admins).values({
        id: admin.id,
        email: admin.email,
        password: admin.password,
        name: admin.name,
      });
    }
    console.log(`👥 Seeded ${adminsData.length} admins`);

    // Seed users
    for (const user of usersData) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        phone: user.phone,
        otp: user.otp,
        status: user.status || "active",
        companyId: user.companyId,
        createdAt: user.createdAt
          ? new Date(user.createdAt).getTime()
          : Date.now(),
        updatedAt: user.updatedAt
          ? new Date(user.updatedAt).getTime()
          : Date.now(),
      });
    }
    console.log(`👤 Seeded ${usersData.length} users`);

    // Seed surveys
    for (const survey of surveysData) {
      await db.insert(surveys).values({
        title: survey.title,
        description: survey.description,
        definition: survey.json || {}, // SurveyJS definition
        canTakeMultiple: survey.canTakeMultiple ? 1 : 0, // Convert boolean to integer
        createdBy: survey.adminId,
        createdAt: survey.createdAt
          ? new Date(survey.createdAt).getTime().toString()
          : Date.now().toString(),
        updatedAt: survey.updatedAt
          ? new Date(survey.updatedAt).getTime().toString()
          : Date.now().toString(),
      });
    }
    console.log(`📋 Seeded ${surveysData.length} surveys`);

    // Seed results
    for (const result of resultsData) {
      await db.insert(results).values({
        surveyId: result.surveyId,
        userId: result.userId,
        adminId: result.adminId,
        data: result.data || {},
        submittedAt: result.submittedAt
          ? new Date(result.submittedAt).getTime()
          : Date.now(),
      });
    }
    console.log(`📊 Seeded ${resultsData.length} results`);

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("🎉 Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}

export default seed;
