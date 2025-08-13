const Database = require("better-sqlite3");
const path = require("path");

console.log("🔄 Starting database schema migration...");

const dbPath = path.join(process.cwd(), "surveyjs.db");
const db = new Database(dbPath);

try {
  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Begin transaction
  db.exec("BEGIN TRANSACTION");

  console.log("📊 Updating users table...");

  // Check if status column already exists
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasStatus = columns.some((col) => col.name === "status");

  if (!hasStatus) {
    // Add new columns to users table
    db.exec(`
      ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
    `);

    // Update existing users to have 'active' status
    db.exec(`
      UPDATE users SET status = 'active' WHERE status IS NULL;
    `);
  } else {
    console.log("📊 Status column already exists, skipping...");
  }

  console.log("📊 Creating user_assignments table...");

  // Create user_assignments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_assignments (
      user_id TEXT NOT NULL,
      survey_id TEXT NOT NULL,
      assigned_at INTEGER DEFAULT (unixepoch() * 1000),
      due_at INTEGER,
      status TEXT DEFAULT 'pending',
      PRIMARY KEY (user_id, survey_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS assignment_survey_idx ON user_assignments(survey_id);
    CREATE INDEX IF NOT EXISTS assignment_user_idx ON user_assignments(user_id);
    CREATE INDEX IF NOT EXISTS assignment_status_idx ON user_assignments(status);
    CREATE INDEX IF NOT EXISTS assignment_due_at_idx ON user_assignments(due_at);
  `);

  // Migrate existing assignments from users table
  console.log("📊 Migrating existing survey assignments...");

  const existingAssignments = db
    .prepare(
      `
    SELECT id, assigned_survey_id FROM users 
    WHERE assigned_survey_id IS NOT NULL AND assigned_survey_id != ''
  `
    )
    .all();

  console.log(
    `📊 Found ${existingAssignments.length} existing assignments to migrate`
  );

  for (const assignment of existingAssignments) {
    if (assignment.assigned_survey_id) {
      console.log(
        `📋 Migrating assignment: user ${assignment.id} -> survey ${assignment.assigned_survey_id}`
      );

      db.prepare(
        `
        INSERT OR IGNORE INTO user_assignments (user_id, survey_id, assigned_at, status)
        VALUES (?, ?, ?, ?)
      `
      ).run(assignment.id, assignment.assigned_survey_id, Date.now(), "active");
    }
  }

  console.log(`📊 Migrated ${existingAssignments.length} existing assignments`);

  // Now remove the old assigned_survey_id column
  console.log("📊 Removing old assigned_survey_id column...");

  // Drop tables with foreign key constraints first to remove foreign key constraints
  db.exec("DROP TABLE IF EXISTS user_assignments");
  db.exec("DROP TABLE IF EXISTS results");

  // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
  // First, create a backup of the current data
  const usersData = db.prepare("SELECT * FROM users").all();

  // Drop the old table
  db.exec("DROP TABLE users");

  // Create the new table with the correct schema
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      name TEXT,
      otp TEXT,
      status TEXT DEFAULT 'active',
      company_id INTEGER,
      created_at INTEGER DEFAULT (unixepoch() * 1000),
      updated_at INTEGER DEFAULT (unixepoch() * 1000)
    );
  `);

  // Recreate indexes
  db.exec(`
    CREATE INDEX email_idx ON users(email);
    CREATE INDEX status_idx ON users(status);
  `);

  // Reinsert the data (excluding assigned_survey_id)
  console.log("📊 Reinserting user data with new schema...");
  for (const user of usersData) {
    db.prepare(
      `
      INSERT INTO users (id, email, phone, name, otp, status, company_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      user.id,
      user.email,
      user.phone,
      user.name,
      user.otp,
      user.status || "active",
      user.company_id,
      user.created_at ? new Date(user.created_at).getTime() : Date.now(),
      user.updated_at ? new Date(user.updated_at).getTime() : Date.now()
    );
  }

  console.log(`📊 Reinserted ${usersData.length} users with new schema`);

  // Recreate the user_assignments table
  console.log("📊 Recreating user_assignments table...");
  db.exec(`
    CREATE TABLE user_assignments (
      user_id TEXT NOT NULL,
      survey_id TEXT NOT NULL,
      assigned_at INTEGER DEFAULT (unixepoch() * 1000),
      due_at INTEGER,
      status TEXT DEFAULT 'pending',
      PRIMARY KEY (user_id, survey_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );
  `);

  // Recreate indexes for performance
  db.exec(`
    CREATE INDEX assignment_survey_idx ON user_assignments(survey_id);
    CREATE INDEX assignment_user_idx ON user_assignments(user_id);
    CREATE INDEX assignment_status_idx ON user_assignments(status);
    CREATE INDEX assignment_due_at_idx ON user_assignments(due_at);
  `);

  // Recreate the results table
  console.log("📊 Recreating results table...");
  db.exec(`
    CREATE TABLE results (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      user_id TEXT,
      admin_id TEXT,
      data TEXT NOT NULL,
      submitted_at INTEGER DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (survey_id) REFERENCES surveys(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    );
  `);

  // Recreate results indexes
  db.exec(`
    CREATE INDEX result_survey_id_idx ON results(survey_id);
    CREATE INDEX result_user_id_idx ON results(user_id);
    CREATE INDEX result_submitted_at_idx ON results(submitted_at);
  `);

  // Commit transaction
  db.exec("COMMIT");

  console.log("✅ Database migration completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error);
  db.exec("ROLLBACK");
  process.exit(1);
} finally {
  db.close();
}
