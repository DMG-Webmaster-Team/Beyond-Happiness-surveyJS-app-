"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/shared/UserNavbar";
import {
  validateSurveySession,
  extendSessionForRetake,
} from "../../../lib/auth/survey-session";

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
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessCheckComplete, setAccessCheckComplete] = useState(false);

  // Store surveyId in sessionStorage for logout recovery
  useEffect(() => {
    if (params.surveyId) {
      sessionStorage.setItem("currentSurveyId", params.surveyId);
      sessionStorage.setItem("currentSurveyType", "happiness");
      console.log("💾 Stored surveyId for logout recovery:", params.surveyId);
    }
  }, [params.surveyId]);

  // SINGLE AUTHORITATIVE ACCESS CHECK - No sessionStorage, optional cache with TTL
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const performSingleAccessCheck = async () => {
      try {
        setAccessLoading(true);
        setAccessCheckError(null);

        console.log(
          "🔍 CROSS-TAB TEST - Single access check starting for:",
          params.surveyId,
          {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 100),
            tabId: Math.random().toString(36).substr(2, 9), // Random tab identifier
          }
        );

        // ✅ Check survey-scoped session first
        const sessionValidation = validateSurveySession(params.surveyId);
        if (!sessionValidation.isValid) {
          console.log("🚫 Survey session invalid:", sessionValidation.reason);
          // Redirect to login with survey context
          router.push(
            `/user/login?redirect=${encodeURIComponent(
              params.surveyId
            )}&type=happiness`
          );
          return;
        }

        console.log("✅ Survey session valid for:", params.surveyId);

        // Check for cached access data (120s TTL) to avoid flicker, but always revalidate
        const cacheKey = `happiness:access:${params.surveyId}`;
        let cachedData = null;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const now = Date.now();
            if (parsed.timestamp && now - parsed.timestamp < 120000) {
              // 120s TTL
              cachedData = parsed.data;
              console.log("🔍 Using cached access data (will revalidate)");
              if (isMounted) {
                setAccessData(cachedData);
                setAccessLoading(false);
                setAccessCheckComplete(true);
              }
            } else {
              localStorage.removeItem(cacheKey); // Expired cache
            }
          }
        } catch (error) {
          console.warn("Cache read error:", error);
          localStorage.removeItem(cacheKey);
        }

        // Always revalidate with server (single source of truth)
        const response = await fetch(
          `/api/happiness/surveys/${params.surveyId}/access`,
          { credentials: "include" } // Ensure cookies are sent
        );

        if (!isMounted) return; // Component unmounted, don't update state

        if (response.ok) {
          const data = await response.json();
          console.log(
            "🔍 CROSS-TAB TEST - Access check response (authoritative):",
            {
              ...data,
              timestamp: new Date().toISOString(),
              cacheUsed: !!cachedData,
            }
          );

          // Cache the response for 120s to avoid flicker on subsequent loads
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: data,
                timestamp: Date.now(),
              })
            );
          } catch (error) {
            console.warn("Cache write error:", error);
          }

          setAccessData(data);
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("❌ Access check failed:", errorData);
          setAccessCheckError(
            new Error(errorData.error || "Failed to fetch access data")
          );

          // Clear cache on error
          localStorage.removeItem(cacheKey);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("❌ Access check exception:", error);
        setAccessCheckError(error);

        // Clear cache on error
        const cacheKey = `happiness:access:${params.surveyId}`;
        localStorage.removeItem(cacheKey);
      } finally {
        if (isMounted) {
          setAccessLoading(false);
          setAccessCheckComplete(true);
        }
      }
    };

    performSingleAccessCheck();

    // Cleanup function
    return () => {
      isMounted = false;
    };
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

  // SINGLE AUTHORITATIVE ACCESS GATE - Backend is source of truth
  useEffect(() => {
    // Only process access decisions after the access check is complete
    if (!accessCheckComplete || hasRedirected) return;

    // Handle access check errors
    if (accessCheckError) {
      console.error("❌ Access check failed, redirecting to 404");
      router.push("/404");
      return;
    }

    // Handle missing survey data
    if (accessData && !accessData.survey) {
      console.error("❌ Survey not found, redirecting to 404");
      router.push("/404");
      return;
    }

    // If no access data yet, wait
    if (!accessData) return;

    console.log("🛡️ SINGLE ACCESS GATE - Backend Decision:", {
      canAccess: accessData.canAccess,
      requiresAuth: accessData.requiresAuth,
      assigned: accessData.assigned,
      cooldown: accessData.cooldown,
      cooldownRemaining: accessData.cooldownRemaining,
      hasPreviousResult: accessData.hasPreviousResult,
    });

    // Check if this is a retake request
    const urlParams = new URLSearchParams(window.location.search);
    const isRetake = urlParams.get("retake") === "1";

    // ✅ Extend session for retakes
    if (isRetake) {
      const extended = extendSessionForRetake(params.surveyId, 30); // 30 more minutes
      console.log("🔄 Extended session for retake:", extended);
    }

    // PRIORITY 1: Handle cooldown (redirect to results)
    if (accessData.cooldown === true) {
      console.log("⏰ Cooldown active, redirecting to results");
      setHasRedirected(true);

      if (accessData.previousResult) {
        localStorage.setItem(
          `happiness:lastResult:${params.surveyId}`,
          JSON.stringify(accessData.previousResult)
        );
      }

      router.push(`/happiness/${params.surveyId}/results?cooldown=true`);
      return;
    }

    // PRIORITY 2: Handle authentication requirement
    if (accessData.requiresAuth === true && accessData.canAccess === false) {
      console.log("🔐 Authentication required, redirecting to login");
      setHasRedirected(true);
      router.push(`/user/login?redirect=${params.surveyId}&type=happiness`);
      return;
    }

    // PRIORITY 3: Handle assignment issues
    if (accessData.assigned === false) {
      console.log("❌ User not assigned, showing error");
      setAccessError(
        accessData.message || "You are not assigned to this survey"
      );
      return;
    }

    // PRIORITY 4: Handle retake requests when cooldown has expired
    if (
      isRetake &&
      accessData.hasPreviousResult &&
      accessData.canAccess === true
    ) {
      console.log("🔄 Valid retake request - clearing previous result");
      localStorage.removeItem(`happiness:lastResult:${params.surveyId}`);
      // Continue to render survey
    }

    // PRIORITY 5: Check final access permission
    if (accessData.canAccess !== true) {
      console.log("🚫 Access denied by backend");
      setAccessError(accessData.message || "Access denied");
      return;
    }

    // If we reach here, access is granted - survey will render
    console.log("✅ Access granted - survey will render");
  }, [
    accessCheckComplete,
    accessData,
    accessCheckError,
    hasRedirected,
    params.surveyId,
    router,
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
        credentials: "include", // Ensure cookies are sent
        body: JSON.stringify({
          surveyId: params.surveyId,
          answers: answers,
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

  // Show loading state while access check is in progress or data is loading
  if (accessLoading || !accessCheckComplete || isLoading || !questionsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">
            {accessLoading ? "Checking survey access..." : "Loading survey..."}
          </div>
        </div>
      </div>
    );
  }

  // Cooldown and other access checks are now handled in the single access gate above
  // This eliminates race conditions and ensures backend is the single source of truth

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
  // Backend handles all authentication and access control now
  // No client-side authentication checks needed

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
