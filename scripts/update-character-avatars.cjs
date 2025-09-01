const { drizzle } = require("drizzle-orm/better-sqlite3");
const Database = require("better-sqlite3");
const { eq } = require("drizzle-orm");
const fs = require("fs");
const path = require("path");
const { sqliteTable, text, integer } = require("drizzle-orm/sqlite-core");
const { sql } = require("drizzle-orm");

// Define character schema
const happinessCharacters = sqliteTable("happiness_characters", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  match: text("match", { length: 5 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

async function updateCharacterAvatars() {
  console.log("🔄 Updating character avatar URLs...");

  try {
    // Connect to database
    const dbPath = path.join(process.cwd(), "surveyjs.db");
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, {
      schema: { happinessCharacters },
    });

    // Load updated character data
    const charactersData = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../data/happiness-characters.json"),
        "utf8"
      )
    );

    // Update each character's avatar URL
    for (const character of charactersData.characters) {
      await db
        .update(happinessCharacters)
        .set({
          avatarUrl: character.avatar_url,
          updatedAt: Date.now(),
        })
        .where(eq(happinessCharacters.id, character.id));

      console.log(
        `✅ Updated character ${character.id}: ${character.name} → ${character.avatar_url}`
      );
    }

    console.log("🎉 All character avatars updated successfully!");
    console.log(`📁 Updated ${charactersData.characters.length} characters`);

    sqlite.close();
  } catch (error) {
    console.error("❌ Error updating character avatars:", error);
    throw error;
  }
}

// Run the update function
updateCharacterAvatars()
  .then(() => {
    console.log("✅ Update script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Update script failed:", error);
    process.exit(1);
  });
