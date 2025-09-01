const { drizzle } = require("drizzle-orm/better-sqlite3");
const Database = require("better-sqlite3");
const path = require("path");

async function addHappinessAssignmentsTable() {
  console.log("🔄 Adding happiness assignments table...");

  try {
    const dbPath = path.join(process.cwd(), "surveyjs.db");
    const sqlite = new Database(dbPath);

    // Create the happiness_assignments table
    await sqlite.exec(`
      CREATE TABLE IF NOT EXISTS happiness_assignments (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL REFERENCES happiness_surveys(id),
        user_id TEXT NOT NULL,
        assigned_by TEXT,
        assigned_at INTEGER DEFAULT (unixepoch()),
        completed_at INTEGER,
        is_active INTEGER DEFAULT 1,
        notes TEXT
      );
    `);

    // Create indexes
    await sqlite.exec(`
      CREATE INDEX IF NOT EXISTS happiness_assignments_survey_user_idx 
      ON happiness_assignments(survey_id, user_id);
    `);

    await sqlite.exec(`
      CREATE INDEX IF NOT EXISTS happiness_assignments_user_idx 
      ON happiness_assignments(user_id);
    `);

    await sqlite.exec(`
      CREATE INDEX IF NOT EXISTS happiness_assignments_survey_idx 
      ON happiness_assignments(survey_id);
    `);

    console.log("✅ Happiness assignments table created successfully!");
    sqlite.close();
  } catch (error) {
    console.error("❌ Error creating table:", error);
    throw error;
  }
}

addHappinessAssignmentsTable()
  .then(() => {
    console.log("✅ Migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
