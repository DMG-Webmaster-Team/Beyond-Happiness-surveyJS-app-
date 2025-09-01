const { drizzle } = require("drizzle-orm/better-sqlite3");
const Database = require("better-sqlite3");
const path = require("path");

async function removeCanTakeMultipleColumn() {
  console.log("🔄 Removing can_take_multiple column from happiness surveys...");

  try {
    // Connect to database
    const dbPath = path.join(process.cwd(), "surveyjs.db");
    const sqlite = new Database(dbPath);

    // Disable foreign key constraints temporarily
    await sqlite.exec(`PRAGMA foreign_keys = OFF;`);

    // SQLite doesn't support dropping columns directly, so we need to recreate the table
    console.log("📋 Creating new table structure...");

    // Drop the new table if it exists (from previous failed run)
    await sqlite.exec(`DROP TABLE IF EXISTS happiness_surveys_new;`);

    // Create new table without can_take_multiple
    await sqlite.exec(`
      CREATE TABLE happiness_surveys_new (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        anonymous INTEGER DEFAULT 0,
        retake_cooldown_days INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    // Copy data from old table to new table
    console.log("📋 Copying data...");
    await sqlite.exec(`
      INSERT INTO happiness_surveys_new (id, title, anonymous, retake_cooldown_days, created_at, updated_at)
      SELECT id, title, anonymous, retake_cooldown_days, created_at, updated_at
      FROM happiness_surveys;
    `);

    // Drop old table and rename new table
    console.log("📋 Swapping tables...");
    await sqlite.exec(`DROP TABLE happiness_surveys;`);
    await sqlite.exec(
      `ALTER TABLE happiness_surveys_new RENAME TO happiness_surveys;`
    );

    // Re-enable foreign key constraints
    await sqlite.exec(`PRAGMA foreign_keys = ON;`);

    console.log("✅ Successfully removed can_take_multiple column!");

    sqlite.close();
  } catch (error) {
    console.error("❌ Error removing column:", error);
    throw error;
  }
}

// Run the migration
removeCanTakeMultipleColumn()
  .then(() => {
    console.log("✅ Migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
