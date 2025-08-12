"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import useSWR from "swr";
import dynamic from "next/dynamic";
import "survey-core/survey-core.css";
import UserNavbar from "@/components/shared/UserNavbar";
import PDFExportButton from "@/components/PDFExportButton";

// Dynamically import Survey component to avoid SSR issues
const DynamicSurvey = dynamic(
  () => import("survey-react-ui").then((mod) => mod.Survey),
  {
    ssr: false,
    loading: () => <div className="text-center py-8">Loading survey...</div>,
  }
);

interface User {
  id: string;
  email: string;
  phone: string;
  assignedSurveys: string[];
  submittedSurveys: {
    surveyId: string;
    submittedAt: string;
  }[];
  loginTime?: string;
}

interface SurveyData {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  adminId: string;
  json: any;
}

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch survey");
    return res.json();
  });

export default function UserSurvey() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  // Ensure component is mounted before rendering survey
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check user session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/check-session");
        const data = await response.json();

        if (!data.isAuthenticated) {
          router.push(`/user/login?redirect=${surveyId}`);
          return;
        }

        setUser(data.user);

        // Check if user is assigned to this survey
        if (!data.user.assignedSurveys.includes(surveyId)) {
          setError("You are not assigned to this survey");
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Session check error:", error);
        router.push(`/user/login?redirect=${surveyId}`);
      }
    };

    checkSession();
  }, [surveyId, router]);

  // Use SWR for live survey data fetching - only when user is authenticated AND assigned to this survey
  const {
    data: survey,
    error: fetchError,
    isLoading,
  } = useSWR<SurveyData>(
    user && surveyId && user.assignedSurveys.includes(surveyId)
      ? `/api/surveys/${surveyId}`
      : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Create survey model from the latest data
  const surveyModel = useMemo(() => {
    if (!survey?.json || !mounted) return null;

    try {
      // Ensure canTakeMultiple defaults to false if not present
      const surveyData = {
        ...survey,
        canTakeMultiple: survey.canTakeMultiple ?? false,
      };
      const model = new Model(surveyData.json);

      // Add error handling for survey rendering
      model.onAfterRenderSurvey.add(() => {
        console.log("Survey rendered successfully");
      });

      return model;
    } catch (error) {
      console.error("Error creating survey model:", error);
      return null;
    }
  }, [survey?.json, mounted]);

  // Handle fetch errors and check submission status
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message || "Failed to load survey");
    }
  }, [fetchError]);

  // Check if user has already submitted this survey after survey data is loaded
  useEffect(() => {
    if (user && survey && user.assignedSurveys.includes(surveyId)) {
      const hasSubmittedThisSurvey = user.submittedSurveys.some(
        (submission) => submission.surveyId === surveyId
      );
      if (hasSubmittedThisSurvey) {
        setSurveySubmitted(true);
      }
    }
  }, [user, survey, surveyId]);

  const handleSurveyComplete = async (sender: any) => {
    if (!user || !survey) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surveyId: survey.id,
          userId: user.id,
          adminId: survey.adminId,
          data: sender.data,
        }),
      });

      if (response.ok) {
        // Immediately show completion without refresh
        setSurveySubmitted(true);

        // Update user data to reflect submission
        const updatedUser = {
          ...user,
          hasSubmitted: true,
          submittedAt: new Date().toISOString(),
        };
        setUser(updatedUser);

        // Auto-logout after 5 seconds for completed surveys
        setTimeout(() => {
          fetch("/api/auth/logout", { method: "POST" })
            .then(() => router.push("/user/login"))
            .catch(console.error);
        }, 5000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to submit survey");
      }
    } catch (error) {
      setError("An error occurred while submitting the survey");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeSurvey = () => {
    setSurveySubmitted(false);
    // The survey model will be recreated automatically via useMemo when survey data changes
    // or we can trigger a manual clear if the model exists
    if (surveyModel) {
      surveyModel.clear();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-xl">Loading survey...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (surveySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                ✅ Survey completed successfully!
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {survey?.canTakeMultiple
                  ? "You can retake this survey if needed."
                  : "Thank you for completing the survey."}
              </p>
            </div>

            {/* PDF Export Option */}
            {survey && (
              <div className="text-center">
                <PDFExportButton
                  surveyJson={survey.json}
                  surveyData={surveyModel?.data}
                  className="w-full py-2 px-4 text-sm font-medium rounded-md"
                >
                  📄 Export Survey to PDF
                </PDFExportButton>
              </div>
            )}

            {survey?.canTakeMultiple ? (
              <div className="text-center">
                <button
                  onClick={handleRetakeSurvey}
                  className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary/90"
                >
                  Retake Survey
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  This survey can only be completed once.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!survey || !surveyModel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex flex-col gap-10 items-center justify-center h-[calc(100vh-64px)]">
          <img
            src="/beyond-happiness-logo.svg"
            alt="logo"
            className="w-100 h-100"
          />
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              You dont have access for this survey
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY CHECK: Ensure user is authenticated and assigned to this survey
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              Access Denied: Authentication required
            </div>
            <p className="text-gray-600">
              Please authenticate to access this survey.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SECURITY CHECK: Ensure user is assigned to this specific survey
  if (!user.assignedSurveys.includes(surveyId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">
              Access Denied: Survey not assigned
            </div>
            <p className="text-gray-600">
              You are not authorized to access this survey.
              {user.assignedSurveys.length > 0
                ? ` You are assigned to surveys: ${user.assignedSurveys.join(
                    ", "
                  )}`
                : " You have no survey assignments."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has already submitted (for one-time surveys)
  if (survey && !survey.canTakeMultiple && user) {
    const hasSubmittedThisSurvey = user.submittedSurveys.some(
      (submission) => submission.surveyId === surveyId
    );
    if (hasSubmittedThisSurvey) {
      return (
        <div className="min-h-screen bg-gray-50">
          <UserNavbar />
          <div className="flex items-center justify-center h-[calc(100vh-64px)]">
            <div className="text-center">
              <div className="text-red-600 text-xl mb-4">
                You have already submitted this survey
              </div>
              <p className="text-gray-600">
                This survey can only be completed once and you have already
                submitted it.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center"></div>
        </div>

        {submitting && (
          <div className="mb-4 px-4 py-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            Submitting survey...
          </div>
        )}

        {/* Survey */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            {mounted && surveyModel ? (
              <DynamicSurvey
                model={surveyModel}
                onComplete={handleSurveyComplete}
              />
            ) : (
              <div className="text-center py-8">Loading survey...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
