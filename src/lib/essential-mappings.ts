// Essential mappings for each Truth category
// Based on the assignment order from scripts/assign-essentials-to-questions.ts
// Each category has 4 essentials, each assigned to 2 questions (questions 1-40)

export interface EssentialMapping {
  en: string;
  ar: string;
}

export const essentialsByCategory: Record<string, {
  A: EssentialMapping;
  B: EssentialMapping;
  C: EssentialMapping;
  D: EssentialMapping;
}> = {
  Meaning: {
    A: { en: "Higher Purpose", ar: "هدف أسمى" },      // Questions 1-2
    B: { en: "Values", ar: "القيم" },                 // Questions 3-4
    C: { en: "Growth", ar: "النمو" },                 // Questions 5-6
    D: { en: "Appreciation", ar: "التقدير" },         // Questions 7-8
  },
  Delight: {
    A: { en: "Creativity", ar: "الإبداع" },           // Questions 9-10
    B: { en: "Playfulness", ar: "المرح" },            // Questions 11-12
    C: { en: "Enthusiasm", ar: "الحماس" },            // Questions 13-14
    D: { en: "Surprise", ar: "المفاجأة" },            // Questions 15-16
  },
  Freedom: {
    A: { en: "Safety", ar: "الأمان" },                // Questions 17-18
    B: { en: "Emergency Prep", ar: "الاستعداد للطوارئ" }, // Questions 19-20
    C: { en: "Personalization", ar: "التخصيص" },      // Questions 21-22
    D: { en: "Flexibility", ar: "المرونة" },          // Questions 23-24
  },
  Engagement: {
    A: { en: "Cooperation", ar: "التعاون" },          // Questions 25-26
    B: { en: "Inclusivity", ar: "الشمولية" },         // Questions 27-28
    C: { en: "Connectedness", ar: "الترابط" },        // Questions 29-30
    D: { en: "Socialization", ar: "التواصل الاجتماعي" }, // Questions 31-32
  },
  Vitality: {
    A: { en: "Movement", ar: "الحركة" },              // Questions 33-34
    B: { en: "Rejuvenation", ar: "التجديد" },         // Questions 35-36
    C: { en: "Comfort", ar: "الراحة" },               // Questions 37-38
    D: { en: "Mindfulness", ar: "اليقظة الذهنية" },   // Questions 39-40
  },
};

// Helper function to get essential name by category and subtype
export function getEssentialName(
  category: string,
  subtype: "A" | "B" | "C" | "D",
  language: "en" | "ar" = "en"
): string {
  const essential = essentialsByCategory[category]?.[subtype];
  if (!essential) {
    return language === "ar" ? `النوع ${subtype}` : `Type ${subtype}`;
  }
  return essential[language];
}

