"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/shared/UserNavbar";
import AnonymousNavbar from "@/components/shared/AnonymousNavbar";
import LoadingScreen from "@/components/shared/LoadingScreen";
import {
  extendSessionForRetake,
  validateSurveySession,
  canAccessNewSurvey,
} from "../../../lib/auth/survey-session";
import {
  setSurveySubmitted,
  hasSurveyBeenSubmitted,
  canRetakeSurveyInSession,
  clearSurveySubmissionState,
} from "@/lib/session-storage";

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
  // Removed accessError state - using redirects to standard error pages instead
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
    // Prevent access check if we've already redirected
    if (hasRedirected) {
      console.log("🚫 Skipping access check - redirect already initiated");
      return;
    }

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

        // ✅ The access API already handles all authentication logic
        // No need for additional session validation here since the backend is authoritative

        // Check for cached access data (120s TTL) to avoid flicker, but always revalidate
        const cacheKey = `happiness:access:${params.surveyId}`;
        let cachedData = null;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            if (age < 120000) {
              // 120s TTL
              cachedData = parsed.data;
              console.log("🔍 Using cached access data (age:", age, "ms)");
            }
          }
        } catch (e) {
          console.log("🔍 Cache read error (ignoring):", e);
        }

        // Always make the API call for authoritative data
        const response = await fetch(
          `/api/happiness/surveys/${params.surveyId}/access`,
          {
            credentials: "include", // Ensure cookies are sent
          }
        );

        if (!isMounted) {
          console.log("🚫 Component unmounted during access check");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.log("🔍 Access check failed:", response.status, errorData);

          // Handle different error cases with redirects
          if (response.status === 401) {
            console.log("🔍 Unauthorized - redirecting to login");
            setHasRedirected(true);
            setIsRedirecting(true);
            router.push("/user/login");
            return;
          } else if (response.status === 404) {
            console.log("🔍 Survey not found - redirecting to 404");
            setHasRedirected(true);
            setIsRedirecting(true);
            router.push("/not-found");
            return;
          } else if (response.status === 403) {
            console.log("🔍 Access forbidden - redirecting to home");
            setHasRedirected(true);
            setIsRedirecting(true);
            router.push("/user/home");
            return;
          } else {
            // Generic error - redirect to home
            console.log("🔍 Generic error - redirecting to home");
            setHasRedirected(true);
            setIsRedirecting(true);
            router.push("/user/home");
            return;
          }
        }

        const data = await response.json();
        console.log("🔍 CROSS-TAB TEST - Access check response:", data);

        // Cache the successful response
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          console.log("🔍 Cache write error (ignoring):", e);
        }

        // Handle cooldown case
        if (data.cooldown === true && (data.cooldownRemaining ?? 0) > 0) {
          console.log("🔍 Survey in cooldown - redirecting to results");
          setHasRedirected(true);
          setIsRedirecting(true);
          router.push(
            `/happiness/${params.surveyId}/results?cooldown=true&remaining=${data.cooldownRemaining}`
          );
          return;
        }

        // Handle retake case
        if (data.retake === true) {
          console.log("🔍 Retake allowed - proceeding with survey");
          // Clear any previous submission state for retakes
          clearSurveySubmissionState(params.surveyId);
        }

        // Success - set access data
        setAccessData(data);
        setAccessCheckComplete(true);
      } catch (error) {
        console.error("🔍 Access check error:", error);
        if (isMounted) {
          // On network error, redirect to home
          setHasRedirected(true);
          setIsRedirecting(true);
          router.push("/user/home");
        }
      } finally {
        if (isMounted) {
          setAccessLoading(false);
        }
      }
    };

    performSingleAccessCheck();

    return () => {
      isMounted = false;
    };
  }, [params.surveyId, router, hasRedirected]);

  // Fetch questions data
  useEffect(() => {
    if (!accessCheckComplete || !accessData) {
      return;
    }

    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setQuestionsError(null);

        const response = await fetch("/api/happiness/questions");
        if (!response.ok) {
          throw new Error("Failed to fetch questions");
        }

        const data = await response.json();
        console.log("🔍 Questions fetched:", data);
        setQuestionsData(data);
      } catch (error) {
        console.error("❌ Error fetching questions:", error);
        setQuestionsError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [accessCheckComplete, accessData]);

  const handleAnswer = (valueIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswer: SurveyAnswer = {
      questionId: currentQuestion.id,
      valueIndex,
    };

    setAnswers((prev) => {
      const existingIndex = prev.findIndex(
        (a) => a.questionId === currentQuestion.id
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });
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

  const canProceed = () => {
    const currentQuestion = questions[currentQuestionIndex];
    return answers.some((a) => a.questionId === currentQuestion.id);
  };

  const handleSubmit = async () => {
    if (isSubmitting || submissionCompletedRef.current) {
      console.log("🚫 Submission already in progress or completed");
      return;
    }

    try {
      setIsSubmitting(true);
      submissionCompletedRef.current = true;

      console.log("🔍 Submitting happiness survey:", {
        surveyId: params.surveyId,
        answers: answers.length,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(`/api/happiness/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          surveyId: params.surveyId,
          answers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Submission failed:", errorData);
        throw new Error(errorData.error || "Failed to submit survey");
      }

      const result = await response.json();
      console.log("✅ Survey submitted successfully:", result);

      // Store result in localStorage for results page
      localStorage.setItem(
        `happiness:lastResult:${params.surveyId}`,
        JSON.stringify({
          ok: true,
          surveyId: result.surveyId,
          code: result.code,
          character: result.character,
          categoryTotals: result.categoryTotals,
          cooldown: result.cooldown,
          cooldownRemaining: result.cooldownRemaining,
          message: result.message,
        })
      );

      // Mark survey as submitted in session storage
      setSurveySubmitted(params.surveyId);

      // Navigate to results page
      router.push(`/happiness/${params.surveyId}/results`);
    } catch (error) {
      console.error("❌ Error submitting survey:", error);
      setError(error instanceof Error ? error.message : "Submission failed");
      submissionCompletedRef.current = false; // Reset on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle global Enter key press
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only proceed if we have questions data and can proceed
      if (!questionsData?.questions || questionsData.questions.length === 0)
        return;

      const questions = questionsData.questions;
      const currentQuestion = questions[currentQuestionIndex];
      const isLastQuestion = currentQuestionIndex === questions.length - 1;

      // Check if user can proceed (has answered current question)
      const canProceedNow = answers.some(
        (a) => a.questionId === currentQuestion?.id
      );

      if (e.key === "Enter" && canProceedNow) {
        e.preventDefault();
        if (isLastQuestion) {
          if (answers.length === questions.length && !isSubmitting) {
            handleSubmit();
          }
        } else {
          handleNext();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [
    currentQuestionIndex,
    answers,
    questionsData,
    isSubmitting,
    handleNext,
    handleSubmit,
  ]);

  // Show loading screen if redirecting
  if (isRedirecting) {
    return <LoadingScreen message="Redirecting..." />;
  }

  // Error handling is now done through redirects to standard error pages

  // Show loading state while access check is in progress or data is loading
  if (accessLoading || !accessCheckComplete || isLoading || !questionsData) {
    return (
      <>
        {/* Show navbar based on survey type */}
        {accessData?.survey?.anonymous ? <AnonymousNavbar /> : <UserNavbar />}
        <LoadingScreen message="Loading survey..." />
      </>
    );
  }

  // Handle questions error
  if (questionsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to Load Survey
          </h1>
          <p className="text-gray-600 mb-6">
            There was an error loading the survey questions.
          </p>
          <button
            onClick={() => router.push("/user/home")}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const questions = questionsData?.questions || [];

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No Questions Available
          </h1>
          <p className="text-gray-600 mb-6">
            This survey doesn&apos;t have any active questions yet.
          </p>
          <button
            onClick={() => router.push("/user/home")}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conditional Navbar based on survey type */}
      {accessData?.survey?.anonymous ? <AnonymousNavbar /> : <UserNavbar />}

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl text-center mx-auto px-4 py-6">
          <p className="text-blue-500 mt-2">
            Discover your happiness profile through this comprehensive
            assessment
          </p>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQuestion.text}
            </h2>

            <div className="space-y-3">
              {[
                "Never / Strongly Disagree",
                "Rarely / Disagree",
                "Sometimes / Neutral",
                "Often / Agree",
                "Always / Strongly Agree",
              ].map((label, index) => {
                const isSelected = answers.some(
                  (a) =>
                    a.questionId === currentQuestion.id &&
                    a.valueIndex === index + 1
                );

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index + 1)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{label}</span>
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          isSelected
                            ? "border-blue-400 bg-blue-400"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2 rounded-md text-sm font-medium ${
                currentQuestionIndex === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              }`}
            >
              Previous
            </button>

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

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
