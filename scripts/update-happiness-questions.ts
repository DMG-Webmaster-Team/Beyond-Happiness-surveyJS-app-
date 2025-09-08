import { db } from "../src/db";
import { happinessQuestions } from "../src/db/schema/happiness";

// New happiness questions data from the image
const newQuestionsData = [
  {
    id: 1,
    text: "I believe that my daily activities are meaningful and contribute to a greater good.",
    category: "Meaning",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 2,
    text: "I am committed to goals or causes that spark my passion and inspire action.",
    category: "Meaning",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 3,
    text: "My actions and choices consistently reflect what's really important to me.",
    category: "Meaning",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 4,
    text: "The places where I live, work, and spend time support me in living according to my most important values.",
    category: "Meaning",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 5,
    text: "I frequently engage in experiences that challenge me and help me grow personally and professionally.",
    category: "Meaning",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 6,
    text: "I am aware of my personal strengths and actively seek opportunities to apply them in various aspects of my life.",
    category: "Meaning",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 7,
    text: "I frequently express gratitude and show appreciation to others for their support, kindness, or positive impact on my life.",
    category: "Meaning",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 8,
    text: "I regularly take a moment to acknowledge and appreciate my personal achievements, strengths, or growth.",
    category: "Meaning",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 9,
    text: "I engage in creative activities in the community where I live.",
    category: "Delight",
    values: [0, 75, 250, 375, 500],
  },
  {
    id: 10,
    text: "I actively pursue personal interests and passions that inspire my creativity.",
    category: "Delight",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 11,
    text: "I engage in playful & fun activities in the community where I live.",
    category: "Delight",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 12,
    text: "In the community where I live, I can easily meet friendly people and join in unplanned activities anytime.",
    category: "Delight",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 13,
    text: "I make an effort to surround myself with people and activities that boost my enthusiasm and energy.",
    category: "Delight",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 14,
    text: "I maintain a positive attitude even in challenging situations.",
    category: "Delight",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 15,
    text: "When I bump into something amazing, I take the time to truly appreciate and think about its meaning.",
    category: "Delight",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 16,
    text: "My home and the community where I live have places that spark wonder, amazement, and admiration.",
    category: "Delight",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 17,
    text: "My home and the community where I live are safe and secure.",
    category: "Freedom",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 18,
    text: "I feel financially safe.",
    category: "Freedom",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 19,
    text: "I am able to personalize my living spaces to reflect my needs, tastes and preferences.",
    category: "Freedom",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 20,
    text: "I am able to express my talents, character and quirks in my social circles.",
    category: "Freedom",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 21,
    text: "My home has spaces that can easily adjust to meet the needs of people I live with.",
    category: "Freedom",
    values: [0, 75, 250, 375, 500],
  },
  {
    id: 22,
    text: "I am open to diverse ideas and enjoy exploring them.",
    category: "Freedom",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 23,
    text: "I can choose how to adapt my home space to meet my needs and preferences.",
    category: "Freedom",
    values: [0, 75, 250, 375, 500],
  },
  {
    id: 24,
    text: "I feel in control of my life choices and decisions.",
    category: "Freedom",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 25,
    text: "In my household, everyone shares responsibility for chores.",
    category: "Engagement",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 26,
    text: "I engage in volunteer work in my community.",
    category: "Engagement",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 27,
    text: "I feel valued, respected, and able to express my thoughts and opinions in my social environment, regardless of my background.",
    category: "Engagement",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 28,
    text: "My home and community have designs that make spaces and activities easily accessible for everyone, considering people with disabilities.",
    category: "Engagement",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 29,
    text: "I have people in my community who I trust and can rely on for support.",
    category: "Engagement",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 30,
    text: "I make an effort to stay connected with people who are important to me.",
    category: "Engagement",
    values: [0, 300, 1000, 1500, 2000],
  },
  {
    id: 31,
    text: "I welcome people from my social circles to my home for a visit.",
    category: "Engagement",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 32,
    text: "I participate in events or activities in the community where I live.",
    category: "Engagement",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 33,
    text: "My daily routine includes activities that promote physical movement, fitness, and healthy eating habits.",
    category: "Vitality",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 34,
    text: "I regularly schedule and attend medical check-ups to maintain my physical health.",
    category: "Vitality",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 35,
    text: "I regularly incorporate calming elements, like decluttering, using relaxing scents, and adding plants, into my living spaces.",
    category: "Vitality",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 36,
    text: "I intentionally set healthy boundaries for the use of digital screens.",
    category: "Vitality",
    values: [0, 225, 750, 1125, 1500],
  },
  {
    id: 37,
    text: "I prioritize physical comfort in my living spaces by paying attention to factors like natural light, temperature control, and ergonomics.",
    category: "Vitality",
    values: [0, 150, 500, 750, 1000],
  },
  {
    id: 38,
    text: "I make an effort to keep my living spaces clean, organized, and clutter-free.",
    category: "Vitality",
    values: [0, 75, 250, 375, 500],
  },
  {
    id: 39,
    text: "I actively set aside time to relax, reflect, and recharge.",
    category: "Vitality",
    values: [0, 375, 1250, 1875, 2500],
  },
  {
    id: 40,
    text: "I actively engage in activities that require my full attention and presence, such as meditation, yoga, or deep breathing.",
    category: "Vitality",
    values: [0, 150, 500, 750, 1000],
  },
];

async function updateHappinessQuestions() {
  try {
    console.log("🔄 Starting happiness questions update...");

    // Clear existing questions
    console.log("🗑️ Clearing existing questions...");
    await db.delete(happinessQuestions);

    // Insert new questions
    console.log("📝 Inserting new questions...");
    for (const question of newQuestionsData) {
      await db.insert(happinessQuestions).values({
        id: question.id,
        text: question.text,
        category: question.category as
          | "Meaning"
          | "Delight"
          | "Freedom"
          | "Engagement"
          | "Vitality",
        values: JSON.stringify(question.values),
        isActive: true,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
    }

    console.log(
      `✅ Successfully updated ${newQuestionsData.length} happiness questions!`
    );

    // Verify the update
    const count = await db.select().from(happinessQuestions);
    console.log(`📊 Total questions in database: ${count.length}`);
  } catch (error) {
    console.error("❌ Error updating happiness questions:", error);
    process.exit(1);
  }
}

// Run the update
updateHappinessQuestions()
  .then(() => {
    console.log("🎉 Happiness questions update completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Update failed:", error);
    process.exit(1);
  });
