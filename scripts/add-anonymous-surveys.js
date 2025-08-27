#!/usr/bin/env node

/**
 * Migration: Add isAnonymous field to surveys table
 * Adds a new boolean field (integer 0/1) for anonymous survey support
 */

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "surveyjs.db");
const db = new Database(dbPath);

console.log("🔄 Starting migration: Add isAnonymous to surveys...");

try {
  // Add the isAnonymous column with default value 0 (false)
  const addColumnQuery = `
    ALTER TABLE surveys 
    ADD COLUMN is_anonymous INTEGER DEFAULT 0;
  `;

  db.exec(addColumnQuery);
  console.log("✅ Added is_anonymous column to surveys table");

  // Verify the migration
  const schema = db.prepare("PRAGMA table_info(surveys)").all();
  const isAnonymousColumn = schema.find((col) => col.name === "is_anonymous");

  if (isAnonymousColumn) {
    console.log("✅ Migration verified: is_anonymous column exists");
    console.log(`   - Type: ${isAnonymousColumn.type}`);
    console.log(`   - Default: ${isAnonymousColumn.dflt_value}`);
  } else {
    throw new Error("Migration failed: is_anonymous column not found");
  }

  // Show current survey count
  const surveyCount = db.prepare("SELECT COUNT(*) as count FROM surveys").get();
  console.log(`📊 Total surveys in database: ${surveyCount.count}`);

  if (surveyCount.count > 0) {
    console.log(
      "📝 All existing surveys will default to non-anonymous (is_anonymous = 0)"
    );
  }

  console.log("🎉 Migration completed successfully!");
} catch (error) {
  if (error.message.includes("duplicate column name")) {
    console.log("ℹ️  Column is_anonymous already exists, skipping migration");
  } else {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
} finally {
  db.close();
}

