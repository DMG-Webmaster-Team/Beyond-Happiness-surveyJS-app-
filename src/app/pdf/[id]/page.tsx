/**
 * @deprecated This PDF page is deprecated and should not be used.
 * It contains hardcoded max scores (10000) that are incorrect.
 * Use /api/generate-pdf instead, which uses the unified scoring service
 * with dynamic max score calculation.
 */

import { notFound } from "next/navigation";
import { db } from "@/db";
import { happinessResults } from "@/db/schema/happiness";
import { eq } from "drizzle-orm";
import { getMultilingualCharacter } from "@/lib/services/happiness-scoring";
import { getTruthIcon, getEssentialsIcon } from "@/lib/truth-icons";

interface PDFPageProps {
  params: { id: string };
  searchParams: { lang?: string };
}

interface HappinessResult {
  id: string;
  surveyId: string;
  code: string;
  categoryTotals: {
    Meaning: number;
    Delight: number;
    Freedom: number;
    Engagement: number;
    Vitality: number;
  };
  character: {
    id: number;
    nameEn: string;
    nameAr: string;
    description: string;
    detailedDescription: string;
    avatarUrl: string;
  };
  language: string;
}

async function getHappinessResult(
  resultId: string
): Promise<HappinessResult | null> {
  try {
    const results = await db
      .select()
      .from(happinessResults)
      .where(eq(happinessResults.id, resultId))
      .limit(1);

    if (!results.length) {
      return null;
    }

    const result = results[0];

    // Get character details
    const character = await getMultilingualCharacter(
      result.code,
      (result.language as "en" | "ar") || "en"
    );

    return {
      id: result.id,
      surveyId: result.surveyId,
      code: result.code,
      categoryTotals: JSON.parse(result.categoryTotals as string),
      character,
      language: result.language || "en",
    };
  } catch (error) {
    console.error("Error fetching happiness result:", error);
    return null;
  }
}

export default async function PDFPage({ params, searchParams }: PDFPageProps) {
  const result = await getHappinessResult(params.id);

  if (!result) {
    notFound();
  }

  // Force English - Arabic language detection commented out
  // const language =
  //   (searchParams.lang as "en" | "ar") ||
  //   (result.language as "en" | "ar") ||
  //   "en";
  const language = "en";
  // const isRTL = language === "ar";
  const isRTL = false; // Always use LTR for English

  // Calculate percentages
  const totalScore = Object.values(result.categoryTotals).reduce(
    (sum, score) => sum + score,
    0
  );
  const maxPossibleScorePerCategory = 10000;
  const totalMaxScore = maxPossibleScorePerCategory * 5; // 50000
  const overallPercentage = Math.round((totalScore / totalMaxScore) * 100);

  // Category colors and translations
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Meaning":
        return "#784C9F"; // rgb(120, 76, 159)
      case "Delight":
        return "#FEC010"; // rgb(254, 192, 16)
      case "Freedom":
        return "#F67E52"; // rgb(246, 126, 82)
      case "Engagement":
        return "#4972B8"; // rgb(73, 114, 184)
      case "Vitality":
        return "#71AD46"; // rgb(113, 173, 70)
      default:
        return "#6B7280"; // Gray
    }
  };

  const categoryTranslations = {
    Meaning: { en: "Meaning", ar: "المعنى" },
    Delight: { en: "Delight", ar: "البهجة" },
    Freedom: { en: "Freedom", ar: "الحرية" },
    Engagement: { en: "Engagement", ar: "الانخراط" },
    Vitality: { en: "Vitality", ar: "الحيوية" },
  };

  const categoryDescriptions = {
    Meaning: {
      en: "Your sense of purpose, spiritual connection, and alignment with core values.",
      ar: "إحساسك بالهدف والاتصال الروحي والتوافق مع القيم الأساسية.",
    },
    Delight: {
      en: "Your capacity for joy, playfulness, creativity, and appreciation of beauty.",
      ar: "قدرتك على الفرح واللعب والإبداع وتقدير الجمال.",
    },
    Freedom: {
      en: "Your sense of autonomy, self-expression, and control over your life direction.",
      ar: "إحساسك بالاستقلالية والتعبير عن الذات والسيطرة على مسار حياتك.",
    },
    Engagement: {
      en: "Your level of involvement, focus, and utilization of skills in meaningful activities.",
      ar: "مستوى مشاركتك وتركيزك واستخدام مهاراتك في أنشطة ذات مغزى.",
    },
    Vitality: {
      en: "Your physical and mental energy, health, resilience, and overall well-being.",
      ar: "طاقتك البدنية والعقلية وصحتك ومرونتك ورفاهيتك العامة.",
    },
  };

  const getText = (key: string) => {
    const texts: Record<string, { en: string; ar: string }> = {
      title: { en: "Your Happiness Profile", ar: "ملفك الشخصي للسعادة" },
      subtitle: {
        en: "Discover your unique character and happiness dimensions",
        ar: "اكتشف شخصيتك الفريدة وأبعاد السعادة الخاصة بك",
      },
      youAre: { en: "You are a", ar: "أنت" },
      characterDesc: { en: "Your Character Description", ar: "وصف شخصيتك" },
      overallScore: {
        en: "Overall Happiness Score",
        ar: "النتيجة الإجمالية للسعادة",
      },
      overallLevel: {
        en: "Overall Happiness Level",
        ar: "مستوى السعادة الإجمالي",
      },
      dimensionsOverview: {
        en: "Happiness Dimensions Overview",
        ar: "نظرة عامة على أبعاد السعادة",
      },
      detailedDimensions: {
        en: "Detailed Happiness Dimensions",
        ar: "أبعاد السعادة التفصيلية",
      },
      footer: {
        en: "Generated by Mountain View Happiness Survey",
        ar: "تم إنشاؤه بواسطة مسح السعادة من ماونتن فيو",
      },
    };
    return texts[key]?.[language as "en" | "ar"] || texts[key]?.en || key;
  };

  return (
    // Force English - Arabic language/direction commented out
    // <html lang={language} dir={isRTL ? "rtl" : "ltr"}>
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          Happiness Survey Report -{" "}
          {/* Force English - Arabic name commented out */}
          {/* {language === "ar"
            ? result.character.nameAr
            : result.character.nameEn} */}
          {result.character.nameEn}
        </title>

        {/* Google Fonts for Arabic support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <style>{`
          /* Reset and base styles */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            background-color: #f9fafb;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .font-arabic { font-family: "Cairo", sans-serif !important; }
          .font-english { font-family: "Inter", sans-serif !important; }
          
          /* Utility classes */
          .min-h-screen { min-height: 100vh; }
          .p-8 { padding: 2rem; }
          .max-w-4xl { max-width: 56rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .bg-white { background-color: #ffffff; }
          .bg-gray-50 { background-color: #f9fafb; }
          .text-center { text-align: center; }
          .mb-12 { margin-bottom: 3rem; }
          .mb-8 { margin-bottom: 2rem; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-2 { margin-top: 0.5rem; }
          .ml-2 { margin-left: 0.5rem; }
          .ml-7 { margin-left: 1.75rem; }
          .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
          .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .text-6xl { font-size: 3.75rem; line-height: 1; }
          .font-bold { font-weight: 700; }
          .font-medium { font-weight: 500; }
          .text-blue-500 { color: #3b82f6; }
          .text-blue-600 { color: #2563eb; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-700 { color: #374151; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-900 { color: #111827; }
          .inline-block { display: inline-block; }
          .px-8 { padding-left: 2rem; padding-right: 2rem; }
          .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
          .p-8 { padding: 2rem; }
          .p-6 { padding: 1.5rem; }
          .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
          .from-blue-50 { --tw-gradient-from: #eff6ff; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(239, 246, 255, 0)); }
          .to-purple-50 { --tw-gradient-to: #faf5ff; }
          .border-2 { border-width: 2px; }
          .border { border-width: 1px; }
          .border-blue-200 { border-color: #bfdbfe; }
          .border-gray-200 { border-color: #e5e7eb; }
          .rounded-lg { border-radius: 0.5rem; }
          .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
          .w-48 { width: 12rem; }
          .h-48 { height: 12rem; }
          .w-4 { width: 1rem; }
          .h-4 { height: 1rem; }
          .w-full { width: 100%; }
          .object-contain { object-fit: contain; }
          .rounded { border-radius: 0.25rem; }
          .rounded-t-md { border-top-left-radius: 0.375rem; border-top-right-radius: 0.375rem; }
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .items-center { align-items: center; }
          .items-end { align-items: flex-end; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .flex-1 { flex: 1 1 0%; }
          .mx-1 { margin-left: 0.25rem; margin-right: 0.25rem; }
          .gap-3 { gap: 0.75rem; }
          .space-y-6 > * + * { margin-top: 1.5rem; }
          .space-y-3 > * + * { margin-top: 0.75rem; }
          .leading-relaxed { line-height: 1.625; }
          .max-w-3xl { max-width: 48rem; }
          .text-white { color: #ffffff; }
          .font-semibold { font-weight: 600; }
        `}</style>
      </head>

      {/* Force English - Arabic font class commented out */}
      {/* <body className={`bg-gray-50 ${isRTL ? "font-arabic" : "font-english"}`}> */}
      <body className="bg-gray-50 font-english">
        <div className="min-h-screen p-8 max-w-4xl mx-auto bg-white">
          {/* Header - Beyond Happiness Branding */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <span className="text-3xl font-bold text-blue-500">Beyond</span>
              <span className="text-3xl font-bold text-gray-800 ml-2">
                Happiness
              </span>
            </div>

            <h1 className="text-4xl font-bold text-blue-600 mb-4">
              {getText("title")}
            </h1>

            <p className="text-lg text-gray-600">{getText("subtitle")}</p>
          </div>

          {/* Character Announcement */}
          <div className="text-center mb-8">
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg shadow-sm">
              <h2 className="text-2xl font-bold text-blue-600">
                {`${getText("youAre")} ${
                  // Force English - Arabic name commented out
                  // language === "ar"
                  //   ? result.character.nameAr
                  //   : result.character.nameEn
                  result.character.nameEn
                }!`}
              </h2>
            </div>
          </div>

          {/* Character Avatar */}
          <div className="text-center mb-8">
            <div className="inline-block">
              <img
                src={
                  result.character.avatarUrl || `/characters/${result.code}.png`
                }
                alt={
                  // Force English - Arabic name commented out
                  // language === "ar"
                  //   ? result.character.nameAr
                  //   : result.character.nameEn
                  result.character.nameEn
                }
                className="w-48 h-48 mx-auto object-contain"
              />
            </div>
          </div>

          {/* Character Description */}
          <div className="text-center mb-12">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {getText("characterDesc")}
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
              {result.character.description}
            </p>
          </div>

          {/* Overall Score */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-12 text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              {getText("overallScore")}
            </h3>

            <div className="mb-4">
              <span className="text-6xl font-bold text-gray-900">
                {overallPercentage}%
              </span>
            </div>

            <p className="text-gray-600">{getText("overallLevel")}</p>
          </div>

          {/* Dimensions Chart */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              {getText("dimensionsOverview")}
            </h3>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-end h-48 mb-4">
                {(() => {
                  const chartHeight = 180;
                  return Object.entries(result.categoryTotals || {}).map(
                    ([category, score]) => {
                      const percentage = Math.round(
                        (score / maxPossibleScorePerCategory) * 100
                      );
                      const height = Math.max((percentage / 100) * 180, 8); // Min height of 8px
                      const color = getCategoryColor(category);
                      // FIXED label position: place all labels as if bar height were 60%
                      const fixedPct = 60;
                      const fixedHeight = Math.max(
                        (fixedPct / 100) * chartHeight,
                        8
                      );
                      const labelBottom = chartHeight - fixedHeight + 8;

                      return (
                        <div
                          key={category}
                          className="flex flex-col items-center flex-1 mx-1 relative"
                          style={{ height: "12rem" }}
                        >
                          {/* Percentage above each bar (app style) */}
                          <div
                            className="absolute text-lg font-bold text-gray-900 whitespace-nowrap"
                            style={{
                              bottom: `${labelBottom}px`,
                            }}
                          >
                            {percentage}%
                          </div>
                          {/* Bar */}
                          <div
                            className="w-full rounded-t-md mt-auto"
                            style={{
                              backgroundColor: color,
                              height: `${height}px`,
                              minHeight: "20px",
                            }}
                          />
                          {/* Truth photo and name at bottom */}
                          <div className="mt-2 text-center">
                            <img
                              src={getTruthIcon(category)}
                              alt={category}
                              className="w-10 h-10 object-contain mx-auto"
                              style={{ display: "block" }}
                            />
                            <div className="text-sm font-medium text-gray-700 mt-1">
                              {categoryTranslations[
                                category as keyof typeof categoryTranslations
                              ]?.[language as "en" | "ar"] || category}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Detailed Dimensions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              {getText("detailedDimensions")}
            </h3>

            <div className="space-y-6">
              {Object.entries(result.categoryTotals || {}).map(
                ([category, score]) => {
                  const percentage = Math.round(
                    (score / maxPossibleScorePerCategory) * 100
                  );
                  const color = getCategoryColor(category);
                  const categoryName =
                    categoryTranslations[
                      category as keyof typeof categoryTranslations
                    ]?.en || category;
                  // Force English - Arabic translation commented out
                  // ]?.[language as "en" | "ar"] || category;
                  const description =
                    categoryDescriptions[
                      category as keyof typeof categoryDescriptions
                    ]?.en || "";
                  // Force English - Arabic description commented out
                  // ]?.[language as "en" | "ar"] || "";

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <img
                            src={getTruthIcon(category)}
                            alt={category}
                            className="w-8 h-8 object-contain"
                            style={{ display: "block" }}
                          />
                          <span className="font-bold text-lg" style={{ color }}>
                            {categoryName}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">
                          {percentage}%
                        </span>
                      </div>

                      <p className="text-gray-600 leading-relaxed ml-7">
                        {description}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p className="mt-2">
              {new Date().toLocaleDateString(
                // Force English - Arabic locale commented out
                // language === "ar" ? "ar-EG" : "en-US"
                "en-US"
              )}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
