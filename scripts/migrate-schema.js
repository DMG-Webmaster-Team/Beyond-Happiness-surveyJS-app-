const Database = require('better-sqlite3');
const path = require('path');

console.log('🔄 Starting database schema migration...');

const dbPath = path.join(process.cwd(), 'surveyjs.db');
const db = new Database(dbPath);

try {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  console.log('📊 Updating users table...');
  
  // Add new columns to users table
  db.exec(`
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
  `);
  
  // Update existing users to have 'active' status
  db.exec(`
    UPDATE users SET status = 'active' WHERE status IS NULL;
  `);
  
  console.log('📊 Creating user_assignments table...');
  
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
  console.log('📊 Migrating existing survey assignments...');
  
  const existingAssignments = db.prepare(`
    SELECT id, assigned_survey_id FROM users 
    WHERE assigned_survey_id IS NOT NULL AND assigned_survey_id != ''
  `).all();
  
  for (const assignment of existingAssignments) {
    if (assignment.assignedSurveyId) {
      db.prepare(`
        INSERT OR IGNORE INTO user_assignments (user_id, survey_id, assigned_at, status)
        VALUES (?, ?, ?, ?)
      `).run(
        assignment.id,
        assignment.assigned_survey_id,
        Date.now(),
        'active'
      );
    }
  }
  
  console.log(`📊 Migrated ${existingAssignments.length} existing assignments`);
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ Database migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}
