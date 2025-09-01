const { drizzle } = require("drizzle-orm/better-sqlite3");
const Database = require("better-sqlite3");
const { eq } = require("drizzle-orm");
const fs = require("fs");
const path = require("path");
const {
  sqliteTable,
  text,
  integer,
  index,
} = require("drizzle-orm/sqlite-core");
const { sql } = require("drizzle-orm");

// Define schemas directly (simplified for seeding)
const happinessQuestions = sqliteTable("happiness_questions", {
  id: integer("id").primaryKey(),
  text: text("text").notNull(),
  category: text("category").notNull(),
  values: text("values").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

const happinessCharacters = sqliteTable("happiness_characters", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  match: text("match", { length: 5 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

const happinessSurveys = sqliteTable("happiness_surveys", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  anonymous: integer("anonymous", { mode: "boolean" }).default(false),
  canTakeMultiple: integer("can_take_multiple", { mode: "boolean" }).default(
    false
  ),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

const happinessResults = sqliteTable("happiness_results", {
  id: text("id").primaryKey(),
  surveyId: text("survey_id")
    .notNull()
    .references(() => happinessSurveys.id),
  userId: text("user_id"),
  answers: text("answers").notNull(),
  categoryTotals: text("category_totals").notNull(),
  code: text("code", { length: 5 }).notNull(),
  characterId: integer("character_id")
    .notNull()
    .references(() => happinessCharacters.id),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

async function createTables(db) {
  console.log("📋 Creating happiness survey tables...");

  // Create tables if they don't exist
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS happiness_questions (
        id INTEGER PRIMARY KEY,
        text TEXT NOT NULL,
        category TEXT NOT NULL,
        values TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS happiness_characters (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        match TEXT NOT NULL,
        avatar_url TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS happiness_surveys (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        anonymous INTEGER DEFAULT 0,
        can_take_multiple INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS happiness_results (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL REFERENCES happiness_surveys(id),
        user_id TEXT,
        answers TEXT NOT NULL,
        category_totals TEXT NOT NULL,
        code TEXT NOT NULL,
        character_id INTEGER NOT NULL REFERENCES happiness_characters(id),
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    // Create indexes
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_questions_category_idx ON happiness_questions(category)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_questions_is_active_idx ON happiness_questions(is_active)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_characters_match_idx ON happiness_characters(match)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_results_survey_user_idx ON happiness_results(survey_id, user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_results_survey_idx ON happiness_results(survey_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_results_user_idx ON happiness_results(user_id)`
    );
    await db.run(
      sql`CREATE INDEX IF NOT EXISTS happiness_results_code_idx ON happiness_results(code)`
    );

    console.log("✅ Tables created successfully");
  } catch (error) {
    console.log("ℹ️  Tables may already exist, continuing with seeding...");
  }
}

async function seedHappinessSurvey() {
  console.log("🌱 Starting happiness survey seed...");

  try {
    // Connect to database
    const dbPath = path.join(process.cwd(), "surveyjs.db");
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, {
      schema: {
        happinessQuestions,
        happinessCharacters,
        happinessSurveys,
        happinessResults,
      },
    });

    // Create tables first
    await createTables(sqlite);

    // Load data
    const questionsData = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../data/happiness-questions.json"),
        "utf8"
      )
    );
    const charactersData = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../data/happiness-characters.json"),
        "utf8"
      )
    );

    // Seed happiness questions
    console.log("📝 Seeding happiness questions...");

    for (const question of questionsData.questions) {
      // Check if question already exists
      const existing = await db
        .select()
        .from(happinessQuestions)
        .where(eq(happinessQuestions.id, question.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(happinessQuestions).values({
          id: question.id,
          text: question.question,
          category: question.category,
          values: JSON.stringify(question.values),
          isActive: true,
        });
        console.log(
          `✅ Added question ${question.id}: ${question.question.substring(
            0,
            50
          )}...`
        );
      } else {
        console.log(`⏭️  Question ${question.id} already exists, skipping`);
      }
    }

    // Seed happiness characters
    console.log("🎭 Seeding happiness characters...");

    for (const character of charactersData.characters) {
      // Check if character already exists
      const existing = await db
        .select()
        .from(happinessCharacters)
        .where(eq(happinessCharacters.id, character.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(happinessCharacters).values({
          id: character.id,
          name: character.name,
          description: character.description,
          match: character.match,
          avatarUrl: character.avatar_url,
        });
        console.log(
          `✅ Added character ${character.id}: ${character.name} (${character.match})`
        );
      } else {
        console.log(`⏭️  Character ${character.id} already exists, skipping`);
      }
    }

    console.log("🎉 Happiness survey seed completed successfully!");
    console.log(`📊 Total questions: ${questionsData.questions.length}`);
    console.log(`🎭 Total characters: ${charactersData.characters.length}`);

    sqlite.close();
  } catch (error) {
    console.error("❌ Error seeding happiness survey:", error);
    throw error;
  }
}

// Run the seed function
seedHappinessSurvey()
  .then(() => {
    console.log("✅ Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed script failed:", error);
    process.exit(1);
  });
