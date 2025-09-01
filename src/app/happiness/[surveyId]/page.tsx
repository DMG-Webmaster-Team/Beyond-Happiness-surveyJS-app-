"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/shared/UserNavbar";

interface HappinessQuestion {
  id: number;
  text: string;
  category: string;
  values: number[];
  isActive: boolean;
}

interface SurveyAnswer {
  questionId: number;
  valueIndex: number; // 1-5
}

export default function HappinessSurveyPage({
  params,
}: {
  params: { surveyId: string };
}) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Guard against double submission
  const submissionCompletedRef = useRef(false);

  // State for data fetching
  const [accessData, setAccessData] = useState<any>(null);
  const [accessCheckError, setAccessCheckError] = useState<any>(null);
  const [questionsData, setQuestionsData] = useState<any>(null);
  const [questionsError, setQuestionsError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check survey access (cooldown, permissions)
  useEffect(() => {
    const fetchAccessData = async () => {
      try {
        const response = await fetch(
          `/api/happiness/surveys/${params.surveyId}/access`
        );
        if (response.ok) {
          const data = await response.json();
          setAccessData(data);
        } else {
          setAccessCheckError(new Error("Failed to fetch access data"));
        }
      } catch (error) {
        setAccessCheckError(error);
      }
    };

    fetchAccessData();
  }, [params.surveyId]);

  // Fetch active questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/happiness/questions?isActive=true");
        if (response.ok) {
          const data = await response.json();
          setQuestionsData(data);
        } else {
          setQuestionsError(new Error("Failed to fetch questions"));
        }
      } catch (error) {
        setQuestionsError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log("🔍 Happiness Survey Debug:", {
      surveyId: params.surveyId,
      accessData,
      accessCheckError,
      canAccess: accessData?.canAccess,
      requiresAuth: accessData?.requiresAuth,
      hasRedirected,
    });
  }, [params.surveyId, accessData, accessCheckError, hasRedirected]);

  const survey = accessData?.survey;
  const questions = questionsData?.questions || [];
  const canAccess = accessData?.canAccess;

  // Check if survey exists and is valid
  useEffect(() => {
    if (accessCheckError || (accessData && !survey)) {
      router.push("/404");
    } else if (accessData && !hasRedirected) {
      // PRIORITY 1: Cooldown gate — redirect immediately to results if in cooldown
      if (
        !canAccess &&
        accessData.hasPreviousResult &&
        accessData.previousResult
      ) {
        console.log(
          "⏰ User in cooldown, redirecting to previous results (priority gate)"
        );
        setHasRedirected(true);

        const resultData = {
          ok: true,
          surveyId: params.surveyId,
          code: accessData.previousResult.code,
          character: accessData.previousResult.character
            ? {
                id: accessData.previousResult.character.id,
                name: accessData.previousResult.character.name,
                description: accessData.previousResult.character.description,
                avatarUrl: accessData.previousResult.character.avatarUrl,
              }
            : {
                id: accessData.previousResult.characterId,
                name: "Your Previous Character",
                description: "Your character from previous submission",
                avatarUrl: `/characters/${accessData.previousResult.code}.png`,
              },
          categoryTotals: accessData.previousResult.categoryTotals,
        };

        localStorage.setItem(
          `happiness:lastResult:${params.surveyId}`,
          JSON.stringify(resultData)
        );
        router.push(`/happiness/${params.surveyId}/results?cooldown=true`);
        return;
      }

      // PRIORITY 2: Zero-cooldown retake — show previous results with retake option
      if (
        canAccess &&
        accessData.hasPreviousResult &&
        accessData.canRetake &&
        accessData.previousResult
      ) {
        console.log(
          "🔄 User can retake (zero cooldown), showing previous results (priority gate)"
        );
        setHasRedirected(true);

        const resultData = {
          ok: true,
          surveyId: params.surveyId,
          code: accessData.previousResult.code,
          character: accessData.previousResult.character
            ? {
                id: accessData.previousResult.character.id,
                name: accessData.previousResult.character.name,
                description: accessData.previousResult.character.description,
                avatarUrl: accessData.previousResult.character.avatarUrl,
              }
            : {
                id: accessData.previousResult.characterId,
                name: "Your Previous Character",
                description: "Your character from previous submission",
                avatarUrl: `/characters/${accessData.previousResult.code}.png`,
              },
          categoryTotals: accessData.previousResult.categoryTotals,
        };

        localStorage.setItem(
          `happiness:lastResult:${params.surveyId}`,
          JSON.stringify(resultData)
        );
        router.push(`/happiness/${params.surveyId}/results?retake=true`);
        return;
      }

      // Check for cached access grant to prevent flash
      const cachedAccess = sessionStorage.getItem(
        `happiness:access:${params.surveyId}`
      );
      let hasCachedAccess = false;

      if (cachedAccess) {
        try {
          const accessData = JSON.parse(cachedAccess);
          const cacheAge = Date.now() - accessData.grantedAt;
          // Cache is valid for 5 minutes
          if (cacheAge < 5 * 60 * 1000 && accessData.assigned) {
            hasCachedAccess = true;
            console.log("💾 Using cached access grant:", accessData);
            // Mark as authenticated and proceed
            sessionStorage.setItem("happinessAuthenticated", "true");
            localStorage.setItem("happinessAuthenticated", "true");
            setHasRedirected(true);
            return; // Skip the rest of the logic
          } else {
            // Clear expired cache
            sessionStorage.removeItem(`happiness:access:${params.surveyId}`);
            console.log("🗑️ Cleared expired access cache");
          }
        } catch (error) {
          console.error("❌ Error parsing cached access:", error);
          sessionStorage.removeItem(`happiness:access:${params.surveyId}`);
        }
      }

      // Check if user is coming from login flow (has been authenticated)
      const urlParams = new URLSearchParams(window.location.search);
      const fromLogin = urlParams.get("fromLogin");
      const authenticated =
        sessionStorage.getItem("happinessAuthenticated") ||
        localStorage.getItem("happinessAuthenticated");
      console.log("🔍 Checking authentication status:", {
        fromLogin,
        authenticated,
        canAccess,
        accessData,
        hasCachedAccess,
      });

      if (accessData.requiresAuth && !fromLogin && !authenticated) {
        // Redirect to the regular survey authentication flow
        // The regular auth system will handle OTP and assignment checks
        console.log(
          "🔀 Redirecting to login for happiness survey:",
          params.surveyId
        );
        setHasRedirected(true);

        // Use router.push for more reliable navigation
        const loginUrl = `/user/login?redirect=${params.surveyId}&type=happiness`;
        console.log("🔀 Redirecting to:", loginUrl);
        router.push(loginUrl);
      } else if (fromLogin || authenticated) {
        // User has been authenticated, check if they have cooldown
        if (accessData.hasPreviousResult && accessData.previousResult) {
          console.log(
            "🔍 Previous result data received:",
            accessData.previousResult
          );
          console.log(
            "🔍 Character data from API:",
            accessData.previousResult.character
          );

          if (accessData.canRetake) {
            // User can retake (zero cooldown), show results with retake option
            console.log(
              "🔄 User can retake, showing previous results with retake option"
            );
            setHasRedirected(true);

            // Store the previous result data for the results page
            const resultData = {
              ok: true,
              surveyId: params.surveyId,
              code: accessData.previousResult.code,
              character: accessData.previousResult.character
                ? {
                    id: accessData.previousResult.character.id,
                    name: accessData.previousResult.character.name,
                    description:
                      accessData.previousResult.character.description,
                    avatarUrl: accessData.previousResult.character.avatarUrl,
                  }
                : {
                    id: accessData.previousResult.characterId,
                    name: "Your Previous Character",
                    description: "Your character from previous submission",
                    avatarUrl: `/characters/${accessData.previousResult.code}.png`,
                  },
              categoryTotals: accessData.previousResult.categoryTotals,
            };

            console.log("🔍 Final result data to be stored:", resultData);
            console.log(
              "🔍 Character data in final result:",
              resultData.character
            );
            localStorage.setItem(
              `happiness:lastResult:${params.surveyId}`,
              JSON.stringify(resultData)
            );
            router.push(`/happiness/${params.surveyId}/results?retake=true`);
          } else {
            // User has previous result and is in cooldown, redirect to results page
            console.log("⏰ User in cooldown, redirecting to previous results");
            setHasRedirected(true);

            // Store the previous result data for the results page
            const resultData = {
              ok: true,
              surveyId: params.surveyId,
              code: accessData.previousResult.code,
              character: accessData.previousResult.character
                ? {
                    id: accessData.previousResult.character.id,
                    name: accessData.previousResult.character.name,
                    description:
                      accessData.previousResult.character.description,
                    avatarUrl: accessData.previousResult.character.avatarUrl,
                  }
                : {
                    id: accessData.previousResult.characterId,
                    name: "Your Previous Character",
                    description: "Your character from previous submission",
                    avatarUrl: `/characters/${accessData.previousResult.code}.png`,
                  },
              categoryTotals: accessData.previousResult.categoryTotals,
            };

            console.log(
              "🔍 Final result data to be stored (cooldown):",
              resultData
            );
            console.log(
              "🔍 Character data in final result (cooldown):",
              resultData.character
            );
            localStorage.setItem(
              `happiness:lastResult:${params.surveyId}`,
              JSON.stringify(resultData)
            );
            router.push(`/happiness/${params.surveyId}/results?cooldown=true`);
          }
        } else {
          // User has been authenticated, mark as authenticated and don't redirect
          console.log("✅ User authenticated, proceeding to survey");
          sessionStorage.setItem("happinessAuthenticated", "true");
          localStorage.setItem("happinessAuthenticated", "true");
          setHasRedirected(true);
        }
      } else {
        setAccessError(accessData.message);
      }
    }
  }, [
    accessCheckError,
    accessData,
    survey,
    canAccess,
    router,
    params.surveyId,
    hasRedirected,
  ]);

  const handleAnswerSelect = (valueIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(
      (a) => a.questionId === currentQuestion.id
    );

    if (existingIndex >= 0) {
      newAnswers[existingIndex] = {
        questionId: currentQuestion.id,
        valueIndex,
      };
    } else {
      newAnswers.push({ questionId: currentQuestion.id, valueIndex });
    }

    setAnswers(newAnswers);
  };

  const getCurrentAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return answers.find((a) => a.questionId === currentQuestion.id);
  };

  const canProceed = () => {
    return getCurrentAnswer() !== undefined;
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (isLastQuestion) {
        if (
          canProceed() &&
          answers.length === questions.length &&
          !isSubmitting
        ) {
          handleSubmit();
        }
      } else {
        if (canProceed()) {
          handleNext();
        }
      }
    }
  };

  const handleAnswerKeyPress = (
    event: React.KeyboardEvent,
    valueIndex: number
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAnswerSelect(valueIndex);
      // Auto-advance after selecting an answer
      setTimeout(() => {
        if (isLastQuestion) {
          if (
            canProceed() &&
            answers.length === questions.length &&
            !isSubmitting
          ) {
            handleSubmit();
          }
        } else {
          if (canProceed()) {
            handleNext();
          }
        }
      }, 100);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !canProceed() || answers.length !== questions.length) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      console.log("🔍 Submitting happiness survey...");
      console.log("🔍 Answers:", answers);
      console.log("🔍 Survey ID:", params.surveyId);

      const response = await fetch("/api/happiness/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyId: params.surveyId,
          answers: answers,
          userId:
            sessionStorage.getItem("happinessAuthenticated") ||
            localStorage.getItem("happinessAuthenticated")
              ? "user"
              : null,
        }),
      });

      const result = await response.json();
      console.log("🔍 Submission response:", result);

      if (response.ok && result.ok) {
        // Store the FULL server response including character data
        const resultData = {
          ok: result.ok,
          surveyId: result.surveyId,
          code: result.code,
          character: result.character,
          categoryTotals: result.categoryTotals,
          cooldown: result.cooldown,
          cooldownRemaining: result.cooldownRemaining,
          message: result.message,
        };

        console.log("🔍 Storing full result data:", resultData);
        console.log("🔍 Character data being stored:", resultData.character);

        localStorage.setItem(
          `happiness:lastResult:${params.surveyId}`,
          JSON.stringify(resultData)
        );

        if (result.cooldown === true) {
          // User is in cooldown, redirect to results with cooldown flag
          router.push(`/happiness/${params.surveyId}/results?cooldown=true`);
        } else {
          // Normal submission, redirect to results
          router.push(`/happiness/${params.surveyId}/results`);
        }
      } else {
        setError(result.error || "Failed to submit survey");
      }
    } catch (error) {
      console.error("❌ Error submitting survey:", error);
      setError("Failed to submit survey. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching data
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

  if (questionsError || accessCheckError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">
            Failed to load survey. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Survey Temporarily Unavailable
          </h1>
          <p className="text-gray-600 mb-6">{accessError}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading state only if we're still fetching data
  if (!accessData || !questionsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show error state if there are errors
  if (accessCheckError || questionsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Survey
          </h1>
          <p className="text-gray-600 mb-6">
            {accessCheckError?.message ||
              questionsError?.message ||
              "An error occurred while loading the survey"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // If we have data but no access, and user is not authenticated, redirect to login
  if (!canAccess && !hasRedirected) {
    // Check if user is coming from login flow (has been authenticated)
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get("fromLogin");
    const authenticated =
      sessionStorage.getItem("happinessAuthenticated") ||
      localStorage.getItem("happinessAuthenticated");

    if (!fromLogin && !authenticated) {
      // Redirect to login only if not already authenticated
      console.log(
        "🔀 Redirecting to login for happiness survey:",
        params.surveyId
      );
      setHasRedirected(true);

      const loginUrl = `/user/login?redirect=${params.surveyId}&type=happiness`;
      console.log("🔀 Redirecting to:", loginUrl);
      window.location.href = loginUrl;
      return null; // Don't render anything while redirecting
    }
  }

  // If no survey or questions, show error
  if (!survey || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Survey Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The survey you&apos;re looking for could not be found or has no
            questions.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Navbar - Only show for non-anonymous surveys */}
      {!survey?.anonymous && <UserNavbar />}

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-gray-600 mt-2">
            Discover your happiness profile through this comprehensive
            assessment
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div
          className="bg-white rounded-lg shadow-sm p-8"
          onKeyDown={handleKeyPress}
          tabIndex={0}
        >
          {/* Question Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {currentQuestion.category}
              </span>
              <span className="text-sm text-gray-500">
                #{currentQuestion.id}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4, 5].map((valueIndex) => {
              const isSelected = getCurrentAnswer()?.valueIndex === valueIndex;
              const labels = [
                "Never / Strongly Disagree",
                "Rarely / Disagree",
                "Sometimes / Neutral",
                "Often / Agree",
                "Always / Strongly Agree",
              ];

              return (
                <button
                  key={valueIndex}
                  onClick={() => handleAnswerSelect(valueIndex)}
                  onKeyDown={(e) => handleAnswerKeyPress(e, valueIndex)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-blue-400 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {labels[valueIndex - 1]}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        isSelected
                          ? "border-blue-400 bg-blue-400"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              onKeyDown={(e) => e.key === "Enter" && handlePrevious()}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2 rounded-md text-sm font-medium ${
                currentQuestionIndex === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>

            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">
                {answers.length} of {questions.length} answered
              </div>
              <div className="flex space-x-1">
                {questions.map((question: HappinessQuestion, index: number) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      answers.some((a) => a.questionId === questions[index].id)
                        ? "bg-blue-400"
                        : index === currentQuestionIndex
                        ? "bg-blue-200"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={
                  !canProceed() ||
                  isSubmitting ||
                  answers.length !== questions.length
                }
                className={`px-6 py-2 rounded-md text-sm font-medium ${
                  canProceed() &&
                  answers.length === questions.length &&
                  !isSubmitting
                    ? "bg-blue-400 hover:bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit Survey"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                disabled={!canProceed()}
                className={`px-6 py-2 rounded-md text-sm font-medium ${
                  canProceed()
                    ? "bg-blue-400 hover:bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
