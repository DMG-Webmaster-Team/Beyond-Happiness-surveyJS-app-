import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

async function setupSQLite() {
  console.log("🔧 Setting up SQLite database...");

  try {
    // Create database with absolute path
    const dbPath = path.join(process.cwd(), "surveyjs.db");
    const db = new Database(dbPath);

    // Enable foreign keys
    db.pragma("foreign_keys = ON");

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        name TEXT,
        otp TEXT,
        assigned_survey_id TEXT,
        has_submitted INTEGER DEFAULT 0,
        submitted_at TEXT,
        company_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        definition TEXT NOT NULL,
        can_take_multiple INTEGER DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES admins(id)
      );

      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL,
        user_id TEXT,
        admin_id TEXT,
        data TEXT NOT NULL,
        submitted_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (survey_id) REFERENCES surveys(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (admin_id) REFERENCES admins(id)
      );

      CREATE INDEX IF NOT EXISTS email_idx ON users(email);
      CREATE INDEX IF NOT EXISTS assigned_survey_idx ON users(assigned_survey_id);
      CREATE INDEX IF NOT EXISTS admin_email_idx ON admins(email);
      CREATE INDEX IF NOT EXISTS survey_created_by_idx ON surveys(created_by);
      CREATE INDEX IF NOT EXISTS survey_created_at_idx ON surveys(created_at);
      CREATE INDEX IF NOT EXISTS result_survey_id_idx ON results(survey_id);
      CREATE INDEX IF NOT EXISTS result_user_id_idx ON results(user_id);
      CREATE INDEX IF NOT EXISTS result_submitted_at_idx ON results(submitted_at);
    `);

    console.log("✅ SQLite database setup completed!");

    // Seed with existing data
    const dataPath = path.join(process.cwd(), "data");

    if (fs.existsSync(path.join(dataPath, "admins.json"))) {
      const adminsData = JSON.parse(
        fs.readFileSync(path.join(dataPath, "admins.json"), "utf8")
      );

      for (const admin of adminsData) {
        db.prepare(
          `
          INSERT OR REPLACE INTO admins (id, email, password, name)
          VALUES (?, ?, ?, ?)
        `
        ).run(admin.id, admin.email, admin.password, admin.name);
      }
      console.log(`👥 Seeded ${adminsData.length} admins`);
    }

    if (fs.existsSync(path.join(dataPath, "users.json"))) {
      const usersData = JSON.parse(
        fs.readFileSync(path.join(dataPath, "users.json"), "utf8")
      );

      for (const user of usersData) {
        db.prepare(
          `
          INSERT OR REPLACE INTO users (id, email, phone, otp, assigned_survey_id, has_submitted, submitted_at, company_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          user.id,
          user.email,
          user.phone,
          user.otp,
          user.assignedSurveyId || user.assignedSurvey,
          user.hasSubmitted ? 1 : 0,
          user.submittedAt,
          user.companyId
        );
      }
      console.log(`👤 Seeded ${usersData.length} users`);
    }

    if (fs.existsSync(path.join(dataPath, "surveys.json"))) {
      const surveysData = JSON.parse(
        fs.readFileSync(path.join(dataPath, "surveys.json"), "utf8")
      );

      for (const survey of surveysData) {
        db.prepare(
          `
          INSERT OR REPLACE INTO surveys (id, title, description, definition, can_take_multiple, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        ).run(
          survey.id,
          survey.title,
          survey.description,
          JSON.stringify(survey.json || {}),
          survey.canTakeMultiple ? 1 : 0,
          survey.adminId
        );
      }
      console.log(`📋 Seeded ${surveysData.length} surveys`);
    }

    if (fs.existsSync(path.join(dataPath, "results.json"))) {
      const resultsData = JSON.parse(
        fs.readFileSync(path.join(dataPath, "results.json"), "utf8")
      );

      for (const result of resultsData) {
        db.prepare(
          `
          INSERT OR REPLACE INTO results (id, survey_id, user_id, admin_id, data)
          VALUES (?, ?, ?, ?, ?)
        `
        ).run(
          result.id,
          result.surveyId,
          result.userId,
          result.adminId,
          JSON.stringify(result.data || {})
        );
      }
      console.log(`📊 Seeded ${resultsData.length} results`);
    }

    db.close();
    console.log("🎉 SQLite database is ready to use!");
  } catch (error) {
    console.error("❌ Error setting up SQLite:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupSQLite();
}
