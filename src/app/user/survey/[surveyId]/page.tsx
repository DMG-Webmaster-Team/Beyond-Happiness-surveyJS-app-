"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import dynamic from "next/dynamic";
import "survey-core/survey-core.css";
import UserNavbar from "@/components/shared/UserNavbar";
import AnonymousNavbar from "@/components/shared/AnonymousNavbar";
import SurveySkeletonLoader from "@/components/shared/SurveySkeletonLoader";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";
import LoadingScreen from "@/components/shared/LoadingScreen";

// Dynamically import Survey component to avoid SSR issues
const DynamicSurvey = dynamic(
  () => import("survey-react-ui").then((mod) => mod.Survey),
  {
    ssr: false,
    loading: () => <SurveySkeletonLoader />,
  }
);

// Types for the unified API response
interface SurveySessionData {
  user?: {
    id: string;
    email: string;
    phone?: string;
    name?: string;
  };
  survey: {
    id: string;
    title: string;
    description?: string;
    json?: string;
    canTakeMultiple: boolean;
    isAnonymous: boolean;
    adminId: string;
  };
  submissionStatus: {
    hasSubmitted: boolean;
    canRetake: boolean;
    submissionCount: number;
  };
  assignment?: {
    status: string;
    dueAt?: Date | null;
  };
}

interface ApiError {
  error: string;
  requiresAuth?: boolean;
  redirect?: boolean;
  redirectUrl?: string;
  surveyType?: string;
}

export default function SurveyPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params?.surveyId as string;

  // State management
  const [sessionData, setSessionData] = useState<SurveySessionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);

  // Fetch survey session data on mount
  useEffect(() => {
    if (!surveyId) {
      setError("Survey ID is required");
      setIsLoading(false);
      return;
    }

    const fetchSurveySession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/survey-session/${surveyId}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) {
          const data = await response.json();
          const apiError = data as ApiError;

          // Handle specific error cases
          if (apiError.requiresAuth) {
            // Redirect to login for non-anonymous surveys
            router.push(
              apiError.redirectUrl || `/user/login?redirect=${surveyId}`
            );
            return;
          }

          if (apiError.redirect && apiError.surveyType === "happiness") {
            // Redirect to happiness survey page
            router.push(apiError.redirectUrl || `/happiness/${surveyId}`);
            return;
          }

          throw new Error(apiError.error || "Failed to load survey session");
        }

        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        console.error("❌ Error fetching survey session:", err);
        setError(err instanceof Error ? err.message : "Failed to load survey");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurveySession();
  }, [surveyId, router]);

  // Create survey model when session data is available
  useEffect(() => {
    if (!sessionData?.survey?.json) {
      return;
    }

    try {
      const model = new Model(JSON.parse(sessionData.survey.json));

      // Configure survey model
      model.showCompletedPage = false;
      model.showLoadingButtonIn = "navigation";
      model.showPreviewBeforeComplete = "showAllQuestions";

      // Handle survey completion
      model.onComplete.add(async (sender) => {
        await handleSurveySubmission(sender.data);
      });

      setSurveyModel(model);
    } catch (err) {
      console.error("❌ Error creating survey model:", err);
      setError("Invalid survey configuration");
    }
  }, [sessionData]);

  // Handle survey submission
  const handleSurveySubmission = async (surveyData: any) => {
    if (!sessionData || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const submissionPayload = {
        surveyId: sessionData.survey.id,
        userId: sessionData.user?.id || null,
        data: surveyData,
        isAnonymous: sessionData.survey.isAnonymous,
      };

      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit survey");
      }

      // Redirect to success page or status page
      if (sessionData.survey.isAnonymous) {
        // For anonymous surveys, redirect to a thank you page
        router.push(`/survey/thank-you?surveyId=${sessionData.survey.id}`);
      } else {
        // For authenticated surveys, redirect to status page
        router.push(`/user/survey/${sessionData.survey.id}/status`);
      }
    } catch (err) {
      console.error("Error submitting survey:", err);
      setError(err instanceof Error ? err.message : "Failed to submit survey");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {sessionData?.survey?.isAnonymous ? (
          <AnonymousNavbar />
        ) : (
          <UserNavbar />
        )}
        <LoadingScreen message="Loading survey..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Error Loading Survey
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has already submitted and cannot retake
  if (
    sessionData &&
    sessionData.submissionStatus.hasSubmitted &&
    !sessionData.submissionStatus.canRetake
  ) {
    return (
      <SurveyStatusPage
        type="already-submitted"
        survey={{
          id: sessionData.survey.id,
          title: sessionData.survey.title,
          canTakeMultiple: sessionData.survey.canTakeMultiple,
        }}
        user={sessionData.user}
        anonymous={sessionData.survey.isAnonymous}
        message={`You have already completed this survey${
          sessionData.submissionStatus.submissionCount > 1
            ? ` ${sessionData.submissionStatus.submissionCount} times`
            : ""
        }.`}
      />
    );
  }

  // Render the survey
  if (!sessionData || !surveyModel) {
    return (
      <div className="min-h-screen bg-gray-50">
        {sessionData?.survey?.isAnonymous ? (
          <AnonymousNavbar />
        ) : (
          <UserNavbar />
        )}
        <LoadingScreen message="Preparing survey..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      {sessionData.survey.isAnonymous ? <AnonymousNavbar /> : <UserNavbar />}

      {/* Survey Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Survey Header */}

        {/* Survey Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Submitting your responses...</p>
              </div>
            </div>
          )}

          <DynamicSurvey model={surveyModel} />
        </div>
      </div>
    </div>
  );
}
