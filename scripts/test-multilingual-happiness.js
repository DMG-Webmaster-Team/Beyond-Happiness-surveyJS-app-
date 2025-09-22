#!/usr/bin/env node

/**
 * Test script for multilingual happiness survey functionality
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Multilingual Happiness Survey Implementation...\n");

// Test 1: Check if multilingual files exist
console.log("1. Checking multilingual data files...");
const questionsFile = path.join(
  __dirname,
  "../data/happiness-questions-multilingual.json"
);
const charactersFile = path.join(
  __dirname,
  "../data/happiness-characters-multilingual.json"
);
const publicQuestionsFile = path.join(
  __dirname,
  "../public/data/happiness-questions-multilingual.json"
);
const publicCharactersFile = path.join(
  __dirname,
  "../public/data/happiness-characters-multilingual.json"
);

const files = [
  { path: questionsFile, name: "Questions (data/)" },
  { path: charactersFile, name: "Characters (data/)" },
  { path: publicQuestionsFile, name: "Questions (public/data/)" },
  { path: publicCharactersFile, name: "Characters (public/data/)" },
];

files.forEach((file) => {
  if (fs.existsSync(file.path)) {
    console.log(`   ✅ ${file.name} exists`);
  } else {
    console.log(`   ❌ ${file.name} missing`);
  }
});

// Test 2: Validate multilingual questions structure
console.log("\n2. Validating multilingual questions structure...");
try {
  const questionsData = JSON.parse(fs.readFileSync(questionsFile, "utf8"));

  if (questionsData.questions && Array.isArray(questionsData.questions)) {
    console.log(`   ✅ Found ${questionsData.questions.length} questions`);

    // Check first question structure
    const firstQuestion = questionsData.questions[0];
    if (
      firstQuestion.question &&
      firstQuestion.question.en &&
      firstQuestion.question.ar
    ) {
      console.log("   ✅ Questions have multilingual structure");
      console.log(
        `   📝 Sample EN: "${firstQuestion.question.en.substring(0, 50)}..."`
      );
      console.log(
        `   📝 Sample AR: "${firstQuestion.question.ar.substring(0, 50)}..."`
      );
    } else {
      console.log("   ❌ Questions missing multilingual structure");
    }
  }

  if (questionsData.choices && Array.isArray(questionsData.choices)) {
    console.log(`   ✅ Found ${questionsData.choices.length} choice options`);

    // Check choice structure
    const firstChoice = questionsData.choices[0];
    if (firstChoice.text && firstChoice.text.en && firstChoice.text.ar) {
      console.log("   ✅ Choices have multilingual structure");
    } else {
      console.log("   ❌ Choices missing multilingual structure");
    }
  }
} catch (error) {
  console.log(`   ❌ Error reading questions file: ${error.message}`);
}

// Test 3: Validate multilingual characters structure
console.log("\n3. Validating multilingual characters structure...");
try {
  const charactersData = JSON.parse(fs.readFileSync(charactersFile, "utf8"));

  if (charactersData.characters && Array.isArray(charactersData.characters)) {
    console.log(`   ✅ Found ${charactersData.characters.length} characters`);

    // Check first character structure
    const firstCharacter = charactersData.characters[0];
    if (
      firstCharacter.name &&
      firstCharacter.name.en &&
      firstCharacter.name.ar &&
      firstCharacter.description &&
      firstCharacter.description.en &&
      firstCharacter.description.ar
    ) {
      console.log("   ✅ Characters have multilingual structure");
      console.log(
        `   👤 Sample EN: "${
          firstCharacter.name.en
        }" - "${firstCharacter.description.en.substring(0, 50)}..."`
      );
      console.log(
        `   👤 Sample AR: "${
          firstCharacter.name.ar
        }" - "${firstCharacter.description.ar.substring(0, 50)}..."`
      );
    } else {
      console.log("   ❌ Characters missing multilingual structure");
    }
  }
} catch (error) {
  console.log(`   ❌ Error reading characters file: ${error.message}`);
}

// Test 4: Check database migration
console.log("\n4. Checking database schema...");
const sqlite3 = require("sqlite3").verbose();
const dbPath = path.join(__dirname, "../surveyjs.db");

if (fs.existsSync(dbPath)) {
  const db = new sqlite3.Database(dbPath);

  db.all("PRAGMA table_info(happiness_results)", (err, rows) => {
    if (err) {
      console.log(`   ❌ Error checking database: ${err.message}`);
    } else {
      const languageColumn = rows.find((row) => row.name === "language");
      if (languageColumn) {
        console.log("   ✅ Language column exists in happiness_results table");
        console.log(
          `   📊 Column type: ${languageColumn.type}, Default: ${languageColumn.dflt_value}`
        );
      } else {
        console.log(
          "   ❌ Language column missing from happiness_results table"
        );
      }
    }

    db.close();
  });
} else {
  console.log("   ❌ Database file not found");
}

console.log("\n🎉 Multilingual Happiness Survey Test Complete!\n");

console.log("📋 Implementation Summary:");
console.log("   • Language selection page at survey start");
console.log("   • Arabic/English toggle with RTL/LTR support");
console.log("   • Multilingual questions and answer choices");
console.log("   • Translated character names and descriptions");
console.log("   • Multilingual result page labels");
console.log("   • Language preference stored in database");
console.log("   • Translated Q&A stored with submissions");
console.log("\n✨ Ready to test in browser!");
