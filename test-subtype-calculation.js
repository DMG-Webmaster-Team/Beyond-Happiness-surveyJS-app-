// Test script to verify subtype calculation logic
const answers = [
  { questionId: 1, valueIndex: 5 }, // Meaning Type A - High score
  { questionId: 2, valueIndex: 1 }, // Meaning Type A - Low score
  { questionId: 3, valueIndex: 3 }, // Meaning Type B - Medium score
  { questionId: 4, valueIndex: 2 }, // Meaning Type B - Low-medium score
  { questionId: 5, valueIndex: 4 }, // Meaning Type C - High-medium score
  { questionId: 6, valueIndex: 5 }, // Meaning Type C - High score
  { questionId: 7, valueIndex: 2 }, // Meaning Type D - Low-medium score
  { questionId: 8, valueIndex: 1 }, // Meaning Type D - Low score
];

const categoryTotals = {
  Meaning: 4600,
  Delight: 750,
  Freedom: 3675,
  Engagement: 7750,
  Vitality: 1875,
};

// Simplified client-side calculation (same as in the web interface)
function calculateSubtypeScores(answers, categoryTotals) {
  const subtypeScores = {};

  // Initialize
  ["Meaning", "Delight", "Freedom", "Engagement", "Vitality"].forEach(
    (category) => {
      subtypeScores[category] = { A: 0, B: 0, C: 0, D: 0 };
    }
  );

  // Calculate scores
  answers.forEach((answer) => {
    const questionId = answer.questionId;
    const valueIndex = answer.valueIndex;

    let category = "";
    let subtype = "";

    if (questionId >= 1 && questionId <= 8) {
      category = "Meaning";
      if (questionId <= 2) subtype = "A";
      else if (questionId <= 4) subtype = "B";
      else if (questionId <= 6) subtype = "C";
      else subtype = "D";
    }
    // ... other categories would be here

    if (category && subtype && subtypeScores[category]) {
      const estimatedScore = valueIndex * 400; // Rough estimate
      subtypeScores[category][subtype] += estimatedScore;
    }
  });

  return subtypeScores;
}

const result = calculateSubtypeScores(answers, categoryTotals);
console.log("Subtype Scores:", JSON.stringify(result, null, 2));

// Calculate percentages
const subtypeMaxScore = 4000; // 2 questions * 2000 max each
Object.entries(result.Meaning).forEach(([subtype, score]) => {
  const percentage = Math.round((score / subtypeMaxScore) * 100);
  console.log(`Meaning Type ${subtype}: ${score} points = ${percentage}%`);
});

