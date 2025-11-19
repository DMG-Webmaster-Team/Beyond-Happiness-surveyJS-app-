/**
 * Run the multilingual character fields migration
 */
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

async function runMigration() {
  console.log("🚀 Starting migration: Add multilingual character fields\n");

  try {
    // Read the migration SQL file
    const migrationPath = path.join(
      process.cwd(),
      "drizzle/0009_add_multilingual_character_fields.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📄 Migration SQL:");
    console.log(migrationSQL);
    console.log();

    // Create database connection using MAMP socket
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "root",
      database: "happiness_survey",
      socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock",
    });

    console.log("✅ Connected to database");

    // Run the migration
    console.log("📝 Executing migration...");
    await connection.query(migrationSQL);

    console.log("✅ Migration completed successfully!");

    // Verify the migration
    console.log("\n🔍 Verifying migration...");
    const [columns]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'happiness_survey'
        AND TABLE_NAME = 'happiness_characters'
        AND COLUMN_NAME IN ('name_en', 'name_ar', 'description_en', 'description_ar', 'detailed_description_en_html', 'detailed_description_ar_html')
      ORDER BY COLUMN_NAME
    `);

    console.log("✅ New columns added:");
    columns.forEach((col: any) => {
      console.log(`   - ${col.COLUMN_NAME}`);
    });

    if (columns.length === 6) {
      console.log("\n🎉 All 6 multilingual columns successfully added!");
    } else {
      console.log(`\n⚠️  Expected 6 columns, found ${columns.length}`);
    }

    await connection.end();
    console.log("\n✅ Migration complete! Restart your dev server.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("Access denied")) {
        console.error("\n🔐 Database authentication failed.");
        console.error("Please check:");
        console.error("1. MySQL username is 'root'");
        console.error("2. MySQL password is 'password'");
        console.error("3. Database 'surveyjs_nextjs' exists");
        console.error("\nAlternatively, run the migration manually:");
        console.error(
          "mysql -u root -p surveyjs_nextjs < drizzle/0009_add_multilingual_character_fields.sql"
        );
      } else if (error.message.includes("Duplicate column name")) {
        console.error(
          "\n⚠️  Columns already exist. Migration may have already been run."
        );
      } else {
        console.error("\n📝 Error details:", error.message);
      }
    }

    process.exit(1);
  }
}

runMigration();
