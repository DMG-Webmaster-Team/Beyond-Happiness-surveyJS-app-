const { drizzle } = require("drizzle-orm/better-sqlite3");
const Database = require("better-sqlite3");
const { sql } = require("drizzle-orm");
const path = require("path");

async function addRetakeCooldownColumn() {
  console.log("🔄 Adding retake cooldown column to happiness surveys...");

  try {
    // Connect to database
    const dbPath = path.join(process.cwd(), "surveyjs.db");
    const sqlite = new Database(dbPath);

    // Add the new column
    await sqlite.exec(`
      ALTER TABLE happiness_surveys 
      ADD COLUMN retake_cooldown_days INTEGER DEFAULT 0;
    `);

    console.log("✅ Added retake_cooldown_days column successfully!");

    sqlite.close();
  } catch (error) {
    if (error.message.includes("duplicate column name")) {
      console.log("ℹ️  Column already exists, skipping...");
    } else {
      console.error("❌ Error adding column:", error);
      throw error;
    }
  }
}

// Run the migration
addRetakeCooldownColumn()
  .then(() => {
    console.log("✅ Migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
