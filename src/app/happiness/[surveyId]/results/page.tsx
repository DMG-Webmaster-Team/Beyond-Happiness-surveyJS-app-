"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/shared/UserNavbar";

interface HappinessResult {
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Meaning":
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          bar: "bg-purple-500",
        };
      case "Delight":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          bar: "bg-yellow-500",
        };
      case "Freedom":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          bar: "bg-green-500",
        };
      case "Engagement":
        return { bg: "bg-blue-100", text: "text-blue-800", bar: "bg-blue-500" };
      case "Vitality":
        return { bg: "bg-red-100", text: "text-red-800", bar: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-800", bar: "bg-gray-500" };
    }
  };

  const getScoreLevel = (score: number) => {
    if (score >= 6000) return { level: "High", color: "text-green-600" };
    if (score >= 4000) return { level: "Medium", color: "text-yellow-600" };
    return { level: "Low", color: "text-red-600" };
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
          <button
            onClick={() => router.push(`/happiness/${params.surveyId}`)}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Retake Survey
          </button>
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

  const maxScore = Math.max(...Object.values(result.categoryTotals));
  const totalScore = Object.values(result.categoryTotals).reduce(
    (sum, score) => sum + score,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Navbar - Only show for non-anonymous surveys */}
      {!survey?.anonymous && <UserNavbar />}

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Your Happiness Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Discover your unique character and happiness dimensions
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Retake Notice */}
        {window.location.search.includes("retake=true") && (
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
                You are a {result.character.name}!
              </h2>
              {/* <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCharacterNameColor(
                    result
                  )
                    .replace("text-", "bg-")
                    .replace("-600", "-100")} ${getCharacterNameColor(result)}`}
                >
                  {(() => {
                    const totalScore = Object.values(
                      result.categoryTotals
                    ).reduce((sum, score) => sum + score, 0);
                    if (totalScore >= 25000) return "🌟 Exceptional";
                    if (totalScore >= 20000) return "⭐ High";
                    if (totalScore >= 15000) return "✨ Good";
                    if (totalScore >= 10000) return "📊 Average";
                    return "📈 Growing";
                  })()}
                </span>
              </div> */}
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
              Your Character Description
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {result.character.description}
            </p>
          </div>

          {/* Retake Survey Button - Based on current backend state */}
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
                    title={`Retake available in ${currentAccessData.cooldownRemaining} more day(s)`}
                  >
                    Retake Survey
                  </button>
                  <div className="text-sm text-gray-500">
                    Retake available in {currentAccessData.cooldownRemaining}{" "}
                    more day(s)
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
                      router.push(`/happiness/${params.surveyId}?retake=1`);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors"
                  >
                    Retake Survey
                  </button>
                  <div className="text-sm text-gray-500">
                    You can retake this survey now
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
                  router.push(`/happiness/${params.surveyId}?retake=1`);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors"
              >
                Retake Survey
              </button>
            )}
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Overall Happiness Score
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {totalScore.toLocaleString()}
            </div>
            <div className="text-gray-600">
              Total points across all happiness dimensions
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Happiness Dimensions
          </h3>

          <div className="space-y-6">
            {Object.entries(result.categoryTotals).map(([category, score]) => {
              const colors = getCategoryColor(category);
              const scoreLevel = getScoreLevel(score);
              const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

              return (
                <div key={category} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
                      >
                        {category}
                      </span>
                      <span
                        className={`text-sm font-medium ${scoreLevel.color}`}
                      >
                        {scoreLevel.level}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {score.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {score >= 6000 ? "Threshold Met" : "Below Threshold"}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="text-sm text-gray-600">
                    {getCategoryDescription(category)}
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

function getCategoryDescription(category: string): string {
  switch (category) {
    case "Meaning":
      return "Your sense of purpose, spiritual connection, and alignment with core values.";
    case "Delight":
      return "Your capacity for joy, playfulness, creativity, and appreciation of beauty.";
    case "Freedom":
      return "Your sense of autonomy, self-expression, and control over your life direction.";
    case "Engagement":
      return "Your level of involvement, focus, and utilization of skills in meaningful activities.";
    case "Vitality":
      return "Your physical and mental energy, health, resilience, and overall well-being.";
    default:
      return `Your performance in the ${category} dimension of happiness.`;
  }
}
