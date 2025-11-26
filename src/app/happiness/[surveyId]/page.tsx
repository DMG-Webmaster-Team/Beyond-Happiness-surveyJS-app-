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
  text: string | { en: string; ar: string };
  category: string;
  values: number[];
  isActive: boolean;
}

interface SurveyAnswer {
  questionId: number;
  valueIndex: number; // 1-5
  questionText?: { en: string; ar: string };
  answerText?: { en: string; ar: string };
}

interface MultilingualChoice {
  value: number;
  text: { en: string; ar: string };
}

export default function HappinessSurveyPage({
  params,
}: {
  params: { surveyId: string };
}) {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [showLanguageSelection, setShowLanguageSelection] = useState(true);
  const [showUserInfoCollection, setShowUserInfoCollection] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed accessError state - using redirects to standard error pages instead
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // User data collection for collect_info mode
  const [collectedUserData, setCollectedUserData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    ageRange: "",
  });

  // Guard against double submission
  const submissionCompletedRef = useRef(false);

  // State for data fetching
  const [accessData, setAccessData] = useState<any>(null);
  const [accessCheckError, setAccessCheckError] = useState<any>(null);
  const [questionsData, setQuestionsData] = useState<any>(null);
  const [questionsError, setQuestionsError] = useState<any>(null);
  const [multilingualChoices, setMultilingualChoices] = useState<
    MultilingualChoice[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessCheckComplete, setAccessCheckComplete] = useState(false);

  // Store surveyId in sessionStorage for logout recovery and check for language parameter
  useEffect(() => {
    if (params.surveyId) {
      sessionStorage.setItem("currentSurveyId", params.surveyId);
      sessionStorage.setItem("currentSurveyType", "happiness");

    }

    // Check for language parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam === "ar" || langParam === "en") {
      setSelectedLanguage(langParam);
      setShowLanguageSelection(false);

      // Apply RTL/LTR direction
      if (langParam === "ar") {
        document.body.dir = "rtl";
        document.documentElement.dir = "rtl";
      } else {
        document.body.dir = "ltr";
        document.documentElement.dir = "ltr";
      }
    }
  }, [params.surveyId]);

  // SINGLE AUTHORITATIVE ACCESS CHECK - No sessionStorage, optional cache with TTL
  useEffect(() => {
    // Prevent access check if we've already redirected
    if (hasRedirected) {

      return;
    }

    let isMounted = true; // Prevent state updates if component unmounts

    const performSingleAccessCheck = async () => {
      try {
        setAccessLoading(true);
        setAccessCheckError(null);

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

            }
          }
        } catch (e) {

        }

        // Always make the API call for authoritative data
        const response = await fetch(
          `/api/happiness/surveys/${params.surveyId}/access`,
          {
            credentials: "include", // Ensure cookies are sent
          }
        );

        if (!isMounted) {

          return;
        }

        if (!response.ok) {
          const errorData = await response.json();

          // ✅ ANONYMOUS FIX: For anonymous/collect_info surveys, don't redirect to login
          // Allow access even on error - they don't need authentication
          if (errorData.accessMode === "anonymous" || errorData.accessMode === "collect_info") {
            // Allow access - will show language selection first, then user info collection
            setAccessData(errorData);
            setAccessCheckComplete(true);
            // Don't set showUserInfoCollection here - let language selection happen first
            return;
          }

          // Handle different error cases with redirects for NON-ANONYMOUS surveys
          if (response.status === 401) {

            setHasRedirected(true);
            setIsRedirecting(true);
            router.push(`/user/login?redirect=${params.surveyId}`);
            return;
          } else if (response.status === 404) {

            setHasRedirected(true);
            setIsRedirecting(true);
            router.push("/not-found");
            return;
          } else if (response.status === 403) {

            setHasRedirected(true);
            setIsRedirecting(true);
            router.push(`/user/login?redirect=${params.surveyId}`);
            return;
          } else {
            // Generic error - redirect to home

            setHasRedirected(true);
            setIsRedirecting(true);
            router.push("/user/login");
            return;
          }
        }

        const data = await response.json();

        // ✅ ANONYMOUS FIX: For anonymous/collect_info surveys, skip assignment checks
        if (data.accessMode === "anonymous" || data.accessMode === "collect_info") {
          setAccessData(data);
          setAccessCheckComplete(true);
          // Don't set showUserInfoCollection here - let language selection happen first
          return;
        }

        // ✅ SECURITY FIX: Check if user is assigned and has access (NON-ANONYMOUS only)
        if (data.assigned === false || data.canAccess === false) {

          setHasRedirected(true);
          setIsRedirecting(true);
          // Show error message and redirect to login
          alert(data.message || "You are not assigned to this survey");
          router.push("/user/login");
          return;
        }

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

        }

        // Handle cooldown case
        if (data.cooldown === true && (data.cooldownRemaining ?? 0) > 0) {

          setHasRedirected(true);
          setIsRedirecting(true);
          router.push(
            `/happiness/${params.surveyId}/results?cooldown=true&remaining=${data.cooldownRemaining}`
          );
          return;
        }

        // Handle retake case
        if (data.retake === true) {

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
          router.push("/user/login");
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

  // Handle language selection
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);

    // Apply RTL/LTR direction
    if (language === "ar") {
      document.body.dir = "rtl";
      document.documentElement.dir = "rtl";
    } else {
      document.body.dir = "ltr";
      document.documentElement.dir = "ltr";
    }

    // Check if we need to show user info collection
    const accessMode = accessData?.accessMode || accessData?.survey?.accessMode;
    if (accessMode === "collect_info") {
      setShowLanguageSelection(false);
      setShowUserInfoCollection(true);
    } else {
      setShowLanguageSelection(false);
      setShowUserInfoCollection(false);
    }
  };

  // Get localized text
  const getLocalizedText = (
    text: string | { en: string; ar: string } | undefined | null
  ) => {
    if (!text) return "";
    if (typeof text === "string") return text;
    const lang = selectedLanguage || "en";
    return text[lang as "en" | "ar"] || text.en || "";
  };

  // Fetch questions data
  useEffect(() => {
    if (!accessCheckComplete || !accessData) {
      return;
    }

    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setQuestionsError(null);

        // Fetch multilingual questions
        const multilingualResponse = await fetch(
          "/data/happiness-questions-multilingual.json"
        );
        if (multilingualResponse.ok) {
          const multilingualData = await multilingualResponse.json();

          setQuestionsData(multilingualData);
          setMultilingualChoices(multilingualData.choices || []);
        } else {
          // Fallback to original API
          const response = await fetch("/api/happiness/questions");
          if (!response.ok) {
            throw new Error("Failed to fetch questions");
          }
          const data = await response.json();

          setQuestionsData(data);
        }
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
    const selectedChoice = multilingualChoices.find(
      (c) => c.value === valueIndex
    );

    const newAnswer: SurveyAnswer = {
      questionId: currentQuestion.id,
      valueIndex,
      questionText:
        typeof (currentQuestion.question || currentQuestion.text) === "object"
          ? currentQuestion.question || currentQuestion.text
          : {
              en: currentQuestion.question || currentQuestion.text,
              ar: currentQuestion.question || currentQuestion.text,
            },
      answerText: selectedChoice
        ? selectedChoice.text
        : { en: `Choice ${valueIndex}`, ar: `الخيار ${valueIndex}` },
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

      return;
    }

    try {
      setIsSubmitting(true);
      submissionCompletedRef.current = true;

      // Prepare submission data
      const accessMode =
        accessData?.accessMode || accessData?.survey?.accessMode;
      const submissionData: any = {
        surveyId: params.surveyId,
        answers,
        language: selectedLanguage,
      };

      // Include collected user data for collect_info mode (always required now)
      if (accessMode === "collect_info") {
        submissionData.collectedUserData = collectedUserData;
      }

      const response = await fetch(`/api/happiness/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Submission failed:", errorData);
        throw new Error(errorData.error || "Failed to submit survey");
      }

      const result = await response.json();

      // Store answers separately for subtype calculation
      localStorage.setItem(
        `happiness:answers:${params.surveyId}`,
        JSON.stringify(answers)
      );

      // Store result in localStorage for results page
      localStorage.setItem(
        `happiness:lastResult:${params.surveyId}`,
        JSON.stringify({
          id: result.id, // Include the ID for PDF generation
          ok: true,
          surveyId: result.surveyId,
          code: result.code,
          character: result.character,
          categoryTotals: result.categoryTotals,
          cooldown: result.cooldown,
          cooldownRemaining: result.cooldownRemaining,
          message: result.message,
          answers: answers, // Include answers for subtype calculation
        })
      );

      // Mark survey as submitted in session storage
      setSurveySubmitted(params.surveyId);

      // Navigate to results page with language parameter
      router.push(
        `/happiness/${params.surveyId}/results?lang=${selectedLanguage}`
      );
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
    const isAnonymousSurvey = 
      accessData?.survey?.anonymous || 
      accessData?.accessMode === "anonymous" || 
      accessData?.accessMode === "collect_info";
    return (
      <>
        {/* Show navbar based on survey type */}
        {isAnonymousSurvey ? <AnonymousNavbar /> : <UserNavbar />}
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
            onClick={() => router.push("/user/login")}
            className="bg-blue-400 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const questions = questionsData?.questions || [];

  // Show language selection if not selected yet
  if (showLanguageSelection) {
    const isAnonymousSurvey = 
      accessData?.survey?.anonymous || 
      accessData?.accessMode === "anonymous" || 
      accessData?.accessMode === "collect_info";
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Conditional Navbar based on survey type */}
        {isAnonymousSurvey ? <AnonymousNavbar /> : <UserNavbar />}

        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl text-center mx-auto px-4 py-6">
            <h1 className="text-2xl  font-bold text-blue-600">
              اختر اللغة / Select Language
            </h1>
          </div>
        </div>

        {/* Language Selection */}
        <div className="max-w-2xl text-center mx-auto px-4 py-8">
          <div className="bg-white  rounded-lg  shadow-sm p-8">
            <div className="space-y-4">
              <button
                onClick={() => handleLanguageSelect("en")}
                className="w-full  p-6 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-900">
                      English
                    </h3>
                    <p className="text-gray-600 mt-1">Continue in English</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleLanguageSelect("ar")}
                className="w-full p-6  border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className=" text-right">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-900">
                      العربية
                    </h3>
                    <p className="text-gray-600 mt-1">
                      المتابعة باللغة العربية
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show user info collection for collect_info mode
  if (showUserInfoCollection) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <AnonymousNavbar />

        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl text-center mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-blue-600">
              {selectedLanguage === "ar"
                ? "معلومات المشارك"
                : "Participant Information"}
            </h1>
            <p className="text-blue-500 mt-2">
              {selectedLanguage === "ar"
                ? "يرجى إدخال معلوماتك للمتابعة إلى الاستطلاع"
                : "Please fill in your information to continue to the survey"}
            </p>
          </div>
        </div>

        {/* User Info Form */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Form fields - all required */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedLanguage === "ar" ? "الاسم الكامل" : "Full Name"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={collectedUserData.name}
                  onChange={(e) =>
                    setCollectedUserData({
                      ...collectedUserData,
                      name: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={
                    selectedLanguage === "ar"
                      ? "أدخل اسمك الكامل"
                      : "Enter your full name"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedLanguage === "ar" ? "البريد الإلكتروني" : "Email"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={collectedUserData.email}
                  onChange={(e) =>
                    setCollectedUserData({
                      ...collectedUserData,
                      email: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={
                    selectedLanguage === "ar"
                      ? "example@email.com"
                      : "example@email.com"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedLanguage === "ar" ? "رقم الهاتف" : "Phone Number"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={collectedUserData.phone}
                  onChange={(e) =>
                    setCollectedUserData({
                      ...collectedUserData,
                      phone: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={
                    selectedLanguage === "ar"
                      ? "+20 123 456 7890"
                      : "+20 123 456 7890"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedLanguage === "ar" ? "الجنس" : "Gender"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={collectedUserData.gender}
                  onChange={(e) =>
                    setCollectedUserData({
                      ...collectedUserData,
                      gender: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">
                    {selectedLanguage === "ar" ? "اختر الجنس" : "Select Gender"}
                  </option>
                  <option value="male">
                    {selectedLanguage === "ar" ? "ذكر" : "Male"}
                  </option>
                  <option value="female">
                    {selectedLanguage === "ar" ? "أنثى" : "Female"}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedLanguage === "ar" ? "الفئة العمرية" : "Age Range"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={collectedUserData.ageRange}
                  onChange={(e) =>
                    setCollectedUserData({
                      ...collectedUserData,
                      ageRange: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">
                    {selectedLanguage === "ar"
                      ? "اختر الفئة العمرية"
                      : "Select Age Range"}
                  </option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45-54">45-54</option>
                  <option value="55-64">55-64</option>
                  <option value="65+">65+</option>
                </select>
              </div>
            </div>

            {/* Continue Button with validation */}
            <div className="mt-6">
              <button
                onClick={() => {
                  // Validate all required fields
                  if (
                    !collectedUserData.name.trim() ||
                    !collectedUserData.email.trim() ||
                    !collectedUserData.phone.trim() ||
                    !collectedUserData.gender ||
                    !collectedUserData.ageRange
                  ) {
                    alert(
                      selectedLanguage === "ar"
                        ? "يرجى ملء جميع الحقول المطلوبة"
                        : "Please fill in all required fields"
                    );
                    return;
                  }

                  // Basic email validation
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(collectedUserData.email)) {
                    alert(
                      selectedLanguage === "ar"
                        ? "يرجى إدخال بريد إلكتروني صحيح"
                        : "Please enter a valid email address"
                    );
                    return;
                  }

                  setShowUserInfoCollection(false);
                }}
                className="w-full px-6 py-3 bg-blue-400 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
              >
                {selectedLanguage === "ar"
                  ? "متابعة إلى الاستطلاع"
                  : "Continue to Survey"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => router.push("/user/login")}
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

  // Removed debug logging - fixes applied successfully

  // Safety check: don't render if current question is undefined
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Loading Question...
          </h1>
          <p className="text-gray-600">
            Please wait while we load the survey question.
          </p>
        </div>
      </div>
    );
  }

  const isAnonymousSurvey = 
    accessData?.survey?.anonymous || 
    accessData?.accessMode === "anonymous" || 
    accessData?.accessMode === "collect_info";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conditional Navbar based on survey type */}
      {isAnonymousSurvey ? <AnonymousNavbar /> : <UserNavbar />}

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl text-center mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-blue-600">
            {selectedLanguage === "ar" ? "استطلاع السعادة" : "Happiness Survey"}
          </h1>
          <p className="text-blue-500 mt-2">
            {selectedLanguage === "ar"
              ? "اكتشف ملف السعادة الخاص بك من خلال هذا التقييم الشامل"
              : "Discover your happiness profile through this comprehensive assessment"}
          </p>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {getLocalizedText(
                currentQuestion.question || currentQuestion.text
              )}
            </h2>

            <div className="space-y-3">
              {multilingualChoices.length > 0
                ? multilingualChoices.map((choice, index) => {
                    const label = getLocalizedText(choice.text);
                    const isSelected = answers.some(
                      (a) =>
                        a.questionId === currentQuestion.id &&
                        a.valueIndex === choice.value
                    );

                    return (
                      <button
                        key={choice.value}
                        onClick={() => handleAnswer(choice.value)}
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
                  })
                : [
                    {
                      value: 1,
                      text: {
                        en: "Never / Strongly Disagree",
                        ar: "أبداً / أعارض بشدة",
                      },
                    },
                    {
                      value: 2,
                      text: { en: "Rarely / Disagree", ar: "نادراً / أعارض" },
                    },
                    {
                      value: 3,
                      text: {
                        en: "Sometimes / Neutral",
                        ar: "أحياناً / محايد",
                      },
                    },
                    {
                      value: 4,
                      text: { en: "Often / Agree", ar: "غالباً / أوافق" },
                    },
                    {
                      value: 5,
                      text: {
                        en: "Always / Strongly Agree",
                        ar: "دائماً / أوافق بشدة",
                      },
                    },
                  ].map((choice) => {
                    const label = getLocalizedText(choice.text);
                    const isSelected = answers.some(
                      (a) =>
                        a.questionId === currentQuestion.id &&
                        a.valueIndex === choice.value
                    );

                    return (
                      <button
                        key={choice.value}
                        onClick={() => handleAnswer(choice.value)}
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
              {selectedLanguage === "ar" ? "السابق" : "Previous"}
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
                {isSubmitting
                  ? selectedLanguage === "ar"
                    ? "جاري الإرسال..."
                    : "Submitting..."
                  : selectedLanguage === "ar"
                  ? "إرسال الاستطلاع"
                  : "Submit Survey"}
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
                {selectedLanguage === "ar" ? "التالي" : "Next"}
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
