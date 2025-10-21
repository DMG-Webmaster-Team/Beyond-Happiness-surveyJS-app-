"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/shared/UserNavbar";
import AnonymousNavbar from "@/components/shared/AnonymousNavbar";
import DownloadPDFButton from "@/components/DownloadPDFButton";
import { getEssentialName } from "@/lib/essential-mappings";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface HappinessResult {
  id?: string;
  ok: boolean;
  surveyId: string;
  code: string;
  character: {
    id: number;
    name: string;
    description: string;
    avatarUrl: string;
  };
  categoryTotals: {
    Meaning: number;
    Delight: number;
    Freedom: number;
    Engagement: number;
    Vitality: number;
  };
  cooldown?: boolean;
  cooldownRemaining?: number;
  message?: string;
  answers?: Array<{
    questionId: number;
    valueIndex: number;
  }>;
}

export default function HappinessResultsPage({
  params,
}: {
  params: { surveyId: string };
}) {
  const router = useRouter();
  const [result, setResult] = useState<HappinessResult | null>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAccessData, setCurrentAccessData] = useState<any>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "ar">("en");

  // Function to fetch current access data for retake button
  const fetchCurrentAccessData = async () => {
    try {
      setAccessLoading(true);
      const response = await fetch(
        `/api/happiness/surveys/${params.surveyId}/access`,
        { credentials: "include" } // Ensure cookies are sent
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentAccessData(data);
        console.log("🔍 Current access data for retake button:", data);
      }
    } catch (error) {
      console.error("Error fetching current access data:", error);
    } finally {
      setAccessLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔍 Results page loading...");

    // Store surveyId in sessionStorage for logout recovery
    if (params.surveyId) {
      sessionStorage.setItem("currentSurveyId", params.surveyId);
      sessionStorage.setItem("currentSurveyType", "happiness");
      console.log("💾 Stored surveyId for logout recovery:", params.surveyId);
    }

    // Fetch survey data to check if it's anonymous
    const fetchSurveyData = async () => {
      try {
        const response = await fetch(
          `/api/happiness/surveys/${params.surveyId}`
        );
        if (response.ok) {
          const surveyData = await response.json();
          setSurvey(surveyData);
        }
      } catch (error) {
        console.error("Error fetching survey data:", error);
      }
    };

    fetchSurveyData();

    // Fetch current access data for retake button state
    fetchCurrentAccessData();

    // Check URL parameters to determine the case
    const urlParams = new URLSearchParams(window.location.search);
    const isCooldown = urlParams.get("cooldown") === "true";
    const isRetake = urlParams.get("retake") === "true";
    console.log("🔍 Results page check:", {
      isCooldown,
      isRetake,
      url: window.location.search,
    });

    // Always try to get result from localStorage first (most reliable)
    const storedResult = localStorage.getItem(
      `happiness:lastResult:${params.surveyId}`
    );
    console.log(
      "🔍 Stored result from localStorage:",
      storedResult ? "Found" : "Not found"
    );

    if (storedResult) {
      try {
        const parsedResult = JSON.parse(storedResult);
        console.log("🔍 Parsed result:", parsedResult);
        console.log(
          "🔍 Character data in stored result:",
          parsedResult.character
        );
        setResult(parsedResult);

        // Detect language from stored result or URL params
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get("lang");
        if (langParam === "ar" || langParam === "en") {
          setSelectedLanguage(langParam);
          // Apply RTL/LTR direction
          if (langParam === "ar") {
            document.body.dir = "rtl";
            document.documentElement.dir = "rtl";
          } else {
            document.body.dir = "ltr";
            document.documentElement.dir = "ltr";
          }
        }

        console.log("🔍 Result set successfully");
      } catch (error) {
        console.error("❌ Error parsing stored result:", error);
        router.push(`/happiness/${params.surveyId}`);
        return;
      }
    } else {
      // No result found - redirect back to survey (no sessionStorage fallback)
      console.log("🔍 No stored result found, redirecting to survey");
      router.push(`/happiness/${params.surveyId}`);
      return;
    }

    setIsLoading(false);

    // Cleanup function - do NOT clear localStorage to prevent redirect loops
    return () => {
      console.log("🔍 Results page unmounting - localStorage preserved");
    };
  }, [params.surveyId, router]);

  // Multilingual text helper
  const getText = (key: string) => {
    const texts: Record<string, { en: string; ar: string }> = {
      title: {
        en: "Your Happiness Profile",
        ar: "ملف السعادة الخاص بك",
      },
      subtitle: {
        en: "Discover your unique character and happiness dimensions",
        ar: "اكتشف شخصيتك الفريدة وأبعاد السعادة",
      },
      youAre: {
        en: "You are a",
        ar: "أنت",
      },
      characterDescription: {
        en: "Your Character Description",
        ar: "وصف شخصيتك",
      },
      overallScore: {
        en: "Overall Happiness Score",
        ar: "معدل السعادة العام",
      },
      overallLevel: {
        en: "Overall Happiness Level",
        ar: "مستوى السعادة العام",
      },
      dimensionsOverview: {
        en: "Happiness Dimensions Overview",
        ar: "نظرة عامة على أبعاد السعادة",
      },
      detailedDimensions: {
        en: "Detailed Happiness Dimensions",
        ar: "أبعاد السعادة التفصيلية",
      },
      retakeSurvey: {
        en: "Retake Survey",
        ar: "إعادة الاستطلاع",
      },
      retakeAvailable: {
        en: "You can retake this survey now",
        ar: "يمكنك إعادة الاستطلاع الآن",
      },
      retakeIn: {
        en: "Retake available in",
        ar: "إعادة الاستطلاع متاحة في",
      },
      moreDays: {
        en: "more day(s)",
        ar: "يوم(أيام) أخرى",
      },
      meaning: {
        en: "Meaning",
        ar: "المعنى",
      },
      delight: {
        en: "Delight",
        ar: "البهجة",
      },
      freedom: {
        en: "Freedom",
        ar: "الحرية",
      },
      engagement: {
        en: "Engagement",
        ar: "الانخراط",
      },
      vitality: {
        en: "Vitality",
        ar: "الحيوية",
      },
      typeA: {
        en: "Type A",
        ar: "النوع A",
      },
      typeB: {
        en: "Type B",
        ar: "النوع B",
      },
      typeC: {
        en: "Type C",
        ar: "النوع C",
      },
      typeD: {
        en: "Type D",
        ar: "النوع D",
      },
      subtypeBreakdown: {
        en: "Subtype Breakdown",
        ar: "تفصيل الأنواع الفرعية",
      },
    };
    return texts[key]?.[selectedLanguage] || texts[key]?.en || key;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Meaning":
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          bar: "bg-purple-500",
          hex: "#7E57C2", // Updated to match brand specifications
        };
      case "Delight":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          bar: "bg-yellow-500",
          hex: "#FFCA28", // Updated to match brand specifications
        };
      case "Freedom":
        return {
          bg: "bg-orange-100",
          text: "text-orange-800",
          bar: "bg-orange-500",
          hex: "#FFA726", // Updated to match brand specifications
        };
      case "Engagement":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          bar: "bg-blue-500",
          hex: "#42A5F5", // Updated to match brand specifications
        };
      case "Vitality":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          bar: "bg-green-500",
          hex: "#66BB6A", // Updated to match brand specifications
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          bar: "bg-gray-500",
          hex: "#6B7280",
        };
    }
  };

  const getCharacterNameColor = (result: HappinessResult) => {
    // Calculate total score
    const totalScore = Object.values(result.categoryTotals).reduce(
      (sum, score) => sum + score,
      0
    );

    // Determine color based on total score
    if (totalScore >= 25000) return "text-purple-600 font-bold"; // Exceptional
    if (totalScore >= 20000) return "text-blue-600 font-semibold"; // High
    if (totalScore >= 15000) return "text-green-600 font-medium"; // Good
    if (totalScore >= 10000) return "text-yellow-600 font-medium"; // Average
    return "text-red-600 font-medium"; // Below average
  };

  // Calculate subtype scores based on actual question responses
  const calculateSubtypeScores = (answers: any[], categoryTotals: any) => {
    // Question mapping: Each category has 8 questions, grouped into 4 subtypes (2 questions each)
    const categoryQuestionMapping = {
      Meaning: { A: [1, 2], B: [3, 4], C: [5, 6], D: [7, 8] },
      Delight: { A: [9, 10], B: [11, 12], C: [13, 14], D: [15, 16] },
      Freedom: { A: [17, 18], B: [19, 20], C: [21, 22], D: [23, 24] },
      Engagement: { A: [25, 26], B: [27, 28], C: [29, 30], D: [31, 32] },
      Vitality: { A: [33, 34], B: [35, 36], C: [37, 38], D: [39, 40] },
    };

    // If no answers provided, fall back to proportional distribution
    if (!answers || !Array.isArray(answers)) {
      console.log(
        "📊 Web: No individual answers available, using proportional distribution"
      );
      const subtypeScores: any = {};
      Object.entries(categoryTotals).forEach(([category, totalScore]) => {
        subtypeScores[category] = {
          A: Math.round((totalScore as number) * 0.25),
          B: Math.round((totalScore as number) * 0.25),
          C: Math.round((totalScore as number) * 0.25),
          D: Math.round((totalScore as number) * 0.25),
        };
      });
      return subtypeScores;
    }

    // For web interface, we'll use the stored answers from localStorage
    // In a real implementation, you'd fetch question data and calculate properly
    // For now, we'll simulate the calculation based on the question mapping
    const subtypeScores: any = {};
    Object.keys(categoryQuestionMapping).forEach((category) => {
      subtypeScores[category] = { A: 0, B: 0, C: 0, D: 0 };
    });

    // Simulate subtype calculation based on answers
    // This is a simplified version - in production you'd fetch question values from the database
    answers.forEach((answer: any) => {
      const questionId = answer.questionId;
      const valueIndex = answer.valueIndex;

      // Determine category and subtype based on question ID
      let category = "";
      let subtype = "";

      if (questionId >= 1 && questionId <= 8) {
        category = "Meaning";
        if (questionId <= 2) subtype = "A";
        else if (questionId <= 4) subtype = "B";
        else if (questionId <= 6) subtype = "C";
        else subtype = "D";
      } else if (questionId >= 9 && questionId <= 16) {
        category = "Delight";
        if (questionId <= 10) subtype = "A";
        else if (questionId <= 12) subtype = "B";
        else if (questionId <= 14) subtype = "C";
        else subtype = "D";
      } else if (questionId >= 17 && questionId <= 24) {
        category = "Freedom";
        if (questionId <= 18) subtype = "A";
        else if (questionId <= 20) subtype = "B";
        else if (questionId <= 22) subtype = "C";
        else subtype = "D";
      } else if (questionId >= 25 && questionId <= 32) {
        category = "Engagement";
        if (questionId <= 26) subtype = "A";
        else if (questionId <= 28) subtype = "B";
        else if (questionId <= 30) subtype = "C";
        else subtype = "D";
      } else if (questionId >= 33 && questionId <= 40) {
        category = "Vitality";
        if (questionId <= 34) subtype = "A";
        else if (questionId <= 36) subtype = "B";
        else if (questionId <= 38) subtype = "C";
        else subtype = "D";
      }

      if (category && subtype && subtypeScores[category]) {
        // Estimate score based on valueIndex (1-5 maps to different score ranges)
        // This is a simplified calculation - in production you'd use actual question values
        const estimatedScore = valueIndex * 400; // Rough estimate
        subtypeScores[category][subtype] += estimatedScore;
      }
    });

    console.log(
      "📊 Web: Calculated subtype scores from answers:",
      subtypeScores
    );
    return subtypeScores;
  };

  // Calculate percentages and prepare chart data
  const calculatePercentages = (categoryTotals: any) => {
    const maxPossibleScore = 10000; // Assuming max possible score per category is 10000
    const totalMaxScore = maxPossibleScore * 5; // 5 categories

    const categoryPercentages = Object.entries(categoryTotals).map(
      ([category, score]) => ({
        name: category,
        value: Math.round(((score as number) / maxPossibleScore) * 100),
        score: score as number,
        color: getCategoryColor(category).hex,
      })
    );

    const totalScore = Object.values(categoryTotals).reduce(
      (sum: number, score) => sum + (score as number),
      0
    );
    const overallPercentage = Math.round((totalScore / totalMaxScore) * 100);

    return { categoryPercentages, overallPercentage, totalScore };
  };

  // Circular Progress Component
  const CircularProgress = ({
    percentage,
    size = 120,
  }: {
    percentage: number;
    size?: number;
  }) => {
    const radius = (size - 20) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${
      (percentage / 100) * circumference
    } ${circumference}`;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3B82F6"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-blue-600">
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No Results Found
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find your survey results.
          </p>
          {!survey?.anonymous && (
            <button
              onClick={() => router.push(`/happiness/${params.surveyId}`)}
              className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
            >
              Retake Survey
            </button>
          )}
        </div>
      </div>
    );
  }

  // Debug logging to confirm character data and categories
  console.log("Happiness Result (render source):", result);
  console.log("Character data:", {
    name: result.character.name,
    avatarUrl: result.character.avatarUrl,
    code: result.code,
  });
  console.log("Category totals:", result.categoryTotals);

  const { categoryPercentages, overallPercentage, totalScore } =
    calculatePercentages(result.categoryTotals);

  // Get answers from localStorage or result object for subtype calculation
  const getStoredAnswers = () => {
    try {
      // First try to get answers from localStorage
      const storedAnswers = localStorage.getItem(
        `happiness:answers:${params.surveyId}`
      );
      if (storedAnswers) {
        const parsedAnswers = JSON.parse(storedAnswers);
        console.log("📊 Found answers in localStorage:", parsedAnswers);
        return parsedAnswers;
      }

      // Fallback to answers stored in result object
      if (result.answers && Array.isArray(result.answers)) {
        console.log("📊 Using answers from result object:", result.answers);
        return result.answers;
      }

      console.log("📊 No answers found, using proportional distribution");
      return [];
    } catch (error) {
      console.error("Error getting stored answers:", error);
      return [];
    }
  };

  const subtypeScores = calculateSubtypeScores(
    getStoredAnswers(),
    result.categoryTotals
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conditional Navbar based on survey type */}
      {survey?.anonymous ? <AnonymousNavbar /> : <UserNavbar />}

      {/* Header */}
      <div className="bg-white shadow-sm text-center">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-blue-600">
            {getText("title")}
          </h1>
          <p className="text-gray-600 mt-2">{getText("subtitle")}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Retake Notice - Only for authenticated surveys */}
        {!survey?.anonymous &&
          window.location.search.includes("retake=true") && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-10 w-10 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Ready to Retake Survey
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        You can retake this survey anytime! Here&apos;s your
                        previous result. Click the button below to start a new
                        survey.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/happiness/${params.surveyId}`)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Retake Survey
                </button>
              </div>
            </div>
          )}

        {/* Character Result */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="inline-block px-6 py-3 my-5 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-sm">
              <h2
                className={`text-2xl font-bold mb-0 ${getCharacterNameColor(
                  result
                )}`}
              >
                {getText("youAre")} {result.character.name}!
              </h2>
            </div>
            <div className="mb-6">
              <div className="w-70 h-70 mx-auto p-2 ">
                <img
                  src={
                    result.character.avatarUrl ||
                    `/characters/${result.code}.png`
                  }
                  alt={result.character.name}
                  className="w-full h-full   bg-white "
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = `/characters/${result.code}.png`; // Fallback to code-based path
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              {getText("characterDescription")}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {result.character.description}
            </p>
          </div>

          {/* Download PDF Report Button */}
          <div className="mt-6 text-center">
            <DownloadPDFButton
              result={result}
              language={selectedLanguage}
              surveyTitle={survey?.title || "Happiness Survey"}
              variant="primary"
              size="lg"
            />
          </div>

          {/* Retake Survey Button - Only for authenticated surveys */}
          {!survey?.anonymous && (
            <div className="mt-6 text-center">
              {accessLoading ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-6 py-3 rounded-md text-sm font-medium cursor-not-allowed"
                  >
                    Checking availability...
                  </button>
                  <div className="text-sm text-gray-500">
                    Checking retake availability
                  </div>
                </div>
              ) : currentAccessData ? (
                // Use current backend state for retake button
                currentAccessData.cooldown === true &&
                (currentAccessData.cooldownRemaining ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="bg-gray-300 text-gray-500 px-6 py-3 rounded-md text-sm font-medium cursor-not-allowed"
                      title={`${getText("retakeIn")} ${
                        currentAccessData.cooldownRemaining
                      } ${getText("moreDays")}`}
                    >
                      {getText("retakeSurvey")}
                    </button>
                    <div className="text-sm text-gray-500">
                      {getText("retakeIn")}{" "}
                      {currentAccessData.cooldownRemaining}{" "}
                      {getText("moreDays")}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // Clear localStorage and navigate back to survey
                        localStorage.removeItem(
                          `happiness:lastResult:${params.surveyId}`
                        );
                        router.push(
                          `/happiness/${params.surveyId}?retake=1&lang=${selectedLanguage}`
                        );
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors"
                    >
                      {getText("retakeSurvey")}
                    </button>
                    <div className="text-sm text-gray-500">
                      {getText("retakeAvailable")}
                    </div>
                  </div>
                )
              ) : (
                // Fallback when no current access data
                <button
                  onClick={() => {
                    // Clear localStorage and navigate back to survey
                    localStorage.removeItem(
                      `happiness:lastResult:${params.surveyId}`
                    );
                    router.push(
                      `/happiness/${params.surveyId}?retake=1&lang=${selectedLanguage}`
                    );
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors"
                >
                  {getText("retakeSurvey")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Overall Score with Circular Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {getText("overallScore")}
          </h3>
          <div className="flex items-center justify-center space-x-8">
            <div className="text-center">
              <div className="mt-4">
                <div className="text-6xl font-bold text-gray-900">
                  {overallPercentage}%
                </div>
                <div className="text-gray-600">{getText("overallLevel")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {getText("dimensionsOverview")}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryPercentages}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value}%`,
                    "Percentage",
                  ]}
                  labelFormatter={(label) => `${label} Dimension`}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {categoryPercentages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {getText("detailedDimensions")}
          </h3>

          <div className="space-y-8">
            {categoryPercentages.map((category) => {
              const colors = getCategoryColor(category.name);
              const percentage = category.value;
              const maxPossibleScore = 10000;

              return (
                <div key={category.name} className="space-y-4">
                  {/* Main Category Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
                      >
                        {getText(category.name.toLowerCase())}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {percentage}%
                      </div>
                    </div>
                  </div>

                  {/* Main Category Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-1000 ease-out`}
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colors.hex,
                      }}
                    />
                  </div>

                  {/* Subtype Breakdown */}
                  <div
                    className={`${
                      selectedLanguage === "ar" ? "mr-0" : "ml-6"
                    } space-y-3 bg-gray-50 p-4 rounded-lg`}
                  >
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {getText("subtypeBreakdown")}
                    </h4>

                    {(["A", "B", "C", "D"] as const).map((subtype) => {
                      const subtypeScore =
                        subtypeScores[category.name][subtype];
                      // Each subtype has 2 questions, each with max value of 2000, so max = 4000
                      const subtypeMaxScore = 4000;
                      const subtypePercentage = Math.round(
                        (subtypeScore / subtypeMaxScore) * 100
                      );

                      // Get Essential name instead of Type A/B/C/D
                      const essentialName = getEssentialName(
                        category.name,
                        subtype,
                        selectedLanguage
                      );

                      return (
                        <div
                          key={subtype}
                          className={`flex items-center gap-3 ${
                            selectedLanguage === "ar" ? "flex-row-reverse" : ""
                          }`}
                        >
                          {selectedLanguage === "ar" ? (
                            // Arabic layout: percentage, progress bar, then label
                            <>
                              <span className="min-w-12 text-xs font-semibold text-gray-700">
                                {subtypePercentage}%
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-700 ease-out ml-auto"
                                  style={{
                                    width: `${subtypePercentage}%`,
                                    backgroundColor: colors.hex,
                                  }}
                                />
                              </div>
                              <div className="w-40 text-sm font-medium text-gray-600 text-right">
                                {essentialName}:
                              </div>
                            </>
                          ) : (
                            // English layout: label, progress bar, then percentage
                            <>
                              <div className="w-40 text-sm font-medium text-gray-600 text-left">
                                {essentialName}:
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${subtypePercentage}%`,
                                    backgroundColor: colors.hex,
                                  }}
                                />
                              </div>
                              <span className="min-w-12 text-xs font-semibold text-gray-700">
                                {subtypePercentage}%
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Description */}
                  <div className="text-sm text-gray-600">
                    {getCategoryDescription(category.name, selectedLanguage)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCategoryDescription(
  category: string,
  language: "en" | "ar" = "en"
): string {
  const descriptions: Record<string, { en: string; ar: string }> = {
    Meaning: {
      en: "Your sense of purpose, spiritual connection, and alignment with core values.",
      ar: "إحساسك بالهدف والارتباط الروحي والتوافق مع قيمك الأساسية.",
    },
    Delight: {
      en: "Your capacity for joy, playfulness, creativity, and appreciation of beauty.",
      ar: "قدرتك على الفرح والمرح والإبداع وتقدير الجمال.",
    },
    Freedom: {
      en: "Your sense of autonomy, self-expression, and control over your life direction.",
      ar: "إحساسك بالاستقلالية والتعبير عن الذات والسيطرة على اتجاه حياتك.",
    },
    Engagement: {
      en: "Your level of involvement, focus, and utilization of skills in meaningful activities.",
      ar: "مستوى مشاركتك وتركيزك واستخدام مهاراتك في الأنشطة ذات المعنى.",
    },
    Vitality: {
      en: "Your physical and mental energy, health, resilience, and overall well-being.",
      ar: "طاقتك الجسدية والذهنية وصحتك ومرونتك ورفاهيتك العامة.",
    },
  };

  return (
    descriptions[category]?.[language] ||
    descriptions[category]?.en ||
    `Your performance in the ${category} dimension of happiness.`
  );
}
