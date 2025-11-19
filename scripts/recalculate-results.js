#!/usr/bin/env node

const Database = require("better-sqlite3");
const db = new Database("./surveyjs.db");

console.log("═══════════════════════════════════════════════════════");
console.log("🔄 RECALCULATING SURVEY RESULTS WITH NEW SCHEMA");
console.log("═══════════════════════════════════════════════════════\n");

try {
  // Get the latest result
  const result = db
    .prepare(
      `
    SELECT * FROM happiness_results 
    ORDER BY created_at DESC 
    LIMIT 1
  `
    )
    .get();

  if (!result) {
    console.log("❌ No results found to recalculate");
    process.exit(0);
  }

  console.log("📊 Result ID:", result.id);
  console.log(
    "📅 Original Date:",
    new Date(result.created_at * 1000).toLocaleString()
  );

  const answers = JSON.parse(result.answers);
  console.log("📋 Answers:", answers.length, "questions\n");

  // Get all questions with new schema
  const questionIds = answers.map((a) => a.questionId).join(",");
  const questions = db
    .prepare(
      `
    SELECT id, category, category_values, essential_values 
    FROM happiness_questions 
    WHERE id IN (${questionIds})
  `
    )
    .all();

  // Initialize totals
  const categoryTotals = {
    Meaning: 0,
    Delight: 0,
    Freedom: 0,
    Engagement: 0,
    Vitality: 0,
  };

  const subtypeScores = {
    Meaning: { A: 0, B: 0, C: 0, D: 0 },
    Delight: { A: 0, B: 0, C: 0, D: 0 },
    Freedom: { A: 0, B: 0, C: 0, D: 0 },
    Engagement: { A: 0, B: 0, C: 0, D: 0 },
    Vitality: { A: 0, B: 0, C: 0, D: 0 },
  };

  const questionMapping = {
    Meaning: { A: [1, 2], B: [3, 4], C: [5, 6], D: [7, 8] },
    Delight: { A: [9, 10], B: [11, 12], C: [13, 14], D: [15, 16] },
    Freedom: { A: [17, 18], B: [19, 20], C: [21, 22], D: [23, 24] },
    Engagement: { A: [25, 26], B: [27, 28], C: [29, 30], D: [31, 32] },
    Vitality: { A: [33, 34], B: [35, 36], C: [37, 38], D: [39, 40] },
  };

  function getSubtype(qId) {
    for (const [cat, subtypes] of Object.entries(questionMapping)) {
      for (const [subtype, ids] of Object.entries(subtypes)) {
        if (ids.includes(qId)) return subtype;
      }
    }
    return null;
  }

  // Calculate scores using NEW schema
  console.log("🔢 Calculating scores with NEW schema...\n");

  for (const answer of answers) {
    const q = questions.find((q) => q.id === answer.questionId);
    if (!q) continue;

    const categoryValues = JSON.parse(q.category_values);
    const essentialValues = q.essential_values
      ? JSON.parse(q.essential_values)
      : null;
    const scoreIndex = answer.valueIndex - 1;

    // Category score
    const categoryScore = categoryValues[scoreIndex];
    categoryTotals[q.category] += categoryScore;

    // Essential score for subtype
    const essentialScore = essentialValues
      ? essentialValues[scoreIndex]
      : categoryScore;
    const subtype = getSubtype(answer.questionId);
    if (subtype) {
      subtypeScores[q.category][subtype] += essentialScore;
    }
  }

  console.log("📊 NEW CATEGORY TOTALS:");
  Object.entries(categoryTotals).forEach(([cat, total]) => {
    console.log(`  ${cat}: ${total}`);
  });

  console.log("\n📊 NEW SUBTYPE SCORES:");
  Object.entries(subtypeScores).forEach(([cat, subtypes]) => {
    console.log(`  ${cat}:`);
    Object.entries(subtypes).forEach(([sub, score]) => {
      console.log(`    ${sub}: ${score}`);
    });
  });

  // Update the result in database
  const newCategoryTotals = JSON.stringify(categoryTotals);

  db.prepare(
    `
    UPDATE happiness_results 
    SET category_totals = ?
    WHERE id = ?
  `
  ).run(newCategoryTotals, result.id);

  console.log("\n✅ Result updated with correct calculations!");
  console.log("\n📝 NOTE: Refresh your browser to see the updated results.");
  console.log("   All percentages should now be ≤ 100%");
  console.log("═══════════════════════════════════════════════════════");
} catch (error) {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
} finally {
  db.close();
}












