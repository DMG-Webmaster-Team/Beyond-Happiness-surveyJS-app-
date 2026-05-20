#!/usr/bin/env node

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "surveyjs.db");
const db = new Database(dbPath);

console.log("═══════════════════════════════════════════════════════");
console.log("🔧 MIGRATING HAPPINESS QUESTIONS SCHEMA");
console.log("═══════════════════════════════════════════════════════");

try {
  // Check current schema
  const columns = db.prepare("PRAGMA table_info(happiness_questions)").all();
  console.log("\n📋 Current columns:", columns.map((c) => c.name).join(", "));

  const hasCategoryValues = columns.some((c) => c.name === "category_values");
  const hasEssentialId = columns.some((c) => c.name === "essential_id");
  const hasEssentialValues = columns.some((c) => c.name === "essential_values");

  // Step 1: Add category_values column if it doesn't exist
  if (!hasCategoryValues) {
    console.log("\n➕ Adding category_values column...");
    db.prepare(
      `
      ALTER TABLE happiness_questions 
      ADD COLUMN category_values TEXT NOT NULL DEFAULT '[]'
    `
    ).run();

    // Copy values to category_values
    console.log("📋 Copying values to category_values...");
    db.prepare(
      `
      UPDATE happiness_questions 
      SET category_values = "values"
    `
    ).run();

    console.log("✅ category_values column added and populated");
  } else {
    console.log("\n✅ category_values column already exists");
  }

  // Step 2: Add essential_id column if it doesn't exist
  if (!hasEssentialId) {
    console.log("\n➕ Adding essential_id column...");
    db.prepare(
      `
      ALTER TABLE happiness_questions 
      ADD COLUMN essential_id INTEGER DEFAULT NULL
    `
    ).run();
    console.log("✅ essential_id column added");
  } else {
    console.log("\n✅ essential_id column already exists");
  }

  // Step 3: Add essential_values column if it doesn't exist
  if (!hasEssentialValues) {
    console.log("\n➕ Adding essential_values column...");
    db.prepare(
      `
      ALTER TABLE happiness_questions 
      ADD COLUMN essential_values TEXT DEFAULT NULL
    `
    ).run();

    // Set default essential values for all questions
    const defaultEssentialValues = JSON.stringify([
      0, 3.125, 6.25, 9.375, 12.5,
    ]);
    console.log("📋 Setting default essential values for all questions...");
    db.prepare(
      `
      UPDATE happiness_questions 
      SET essential_values = ?
    `
    ).run(defaultEssentialValues);

    console.log("✅ essential_values column added and populated with defaults");
  } else {
    console.log("\n✅ essential_values column already exists");
  }

  // Step 4: Verify and display sample data
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("📊 VERIFICATION - Sample Questions:");
  console.log("═══════════════════════════════════════════════════════");

  const sampleQuestions = db
    .prepare(
      `
    SELECT id, category, category_values, essential_id, essential_values 
    FROM happiness_questions 
    WHERE id IN (11, 12, 21, 22)
    ORDER BY id
  `
    )
    .all();

  sampleQuestions.forEach((q) => {
    console.log(`\nQuestion ${q.id} (${q.category}):`);
    console.log(`  category_values: ${q.category_values}`);
    console.log(`  essential_id: ${q.essential_id || "NULL"}`);
    console.log(`  essential_values: ${q.essential_values || "NULL"}`);
  });

  // Step 5: Show summary
  const totalQuestions = db
    .prepare("SELECT COUNT(*) as count FROM happiness_questions")
    .get();
  const withEssentials = db
    .prepare(
      "SELECT COUNT(*) as count FROM happiness_questions WHERE essential_values IS NOT NULL"
    )
    .get();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("✅ MIGRATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Total questions: ${totalQuestions.count}`);
  console.log(`With essential_values: ${withEssentials.count}`);
  console.log(
    "\n📝 Note: All questions now have default essential_values [0, 3.125, 6.25, 9.375, 12.5]"
  );
  console.log("    This ensures subtype calculations will be accurate!");
  console.log("═══════════════════════════════════════════════════════");
} catch (error) {
  console.error("\n❌ Migration failed:", error.message);
  process.exit(1);
} finally {
  db.close();
}
