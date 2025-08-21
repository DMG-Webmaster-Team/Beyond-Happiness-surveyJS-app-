const Database = require("better-sqlite3");
const path = require("path");

async function migrateOTPTable() {
  const dbPath = path.join(process.cwd(), "surveyjs.db");
  const db = new Database(dbPath);

  console.log("🔧 Starting OTP table migration...");

  try {
    // Check if OTP table exists
    const tableExists = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='otps'
    `
      )
      .get();

    if (tableExists) {
      console.log("✅ OTP table already exists");
      return;
    }

    // Create OTP table
    db.prepare(
      `
      CREATE TABLE otps (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        method TEXT NOT NULL,
        survey_title TEXT,
        created_at INTEGER NOT NULL,
        verified_at INTEGER
      )
    `
    ).run();

    // Create indexes
    db.prepare(
      `
      CREATE INDEX otp_identifier_idx ON otps(identifier)
    `
    ).run();

    db.prepare(
      `
      CREATE INDEX otp_expires_at_idx ON otps(expires_at)
    `
    ).run();

    db.prepare(
      `
      CREATE INDEX otp_created_at_idx ON otps(created_at)
    `
    ).run();

    console.log("✅ OTP table created successfully with indexes");

    // Clean up any expired OTPs
    const now = Date.now();
    const result = db
      .prepare(
        `
      DELETE FROM otps WHERE expires_at < ?
    `
      )
      .run(now);

    console.log(`🧹 Cleaned up ${result.changes} expired OTPs`);
  } catch (error) {
    console.error("❌ Error creating OTP table:", error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateOTPTable()
    .then(() => {
      console.log("🎉 OTP table migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 OTP table migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateOTPTable };
