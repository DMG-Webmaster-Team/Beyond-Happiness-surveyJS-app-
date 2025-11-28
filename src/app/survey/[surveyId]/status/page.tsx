"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserNavbar from "@/components/shared/UserNavbar";
import LoadingScreen from "@/components/shared/LoadingScreen";

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
    canTakeMultiple: boolean;
    isAnonymous: boolean;
  };
  submissionStatus: {
    hasSubmitted: boolean;
    canRetake: boolean;
    submissionCount: number;
  };
}

export default function SurveyStatusPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params?.surveyId as string;

  const [sessionData, setSessionData] = useState<SurveySessionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      setError("Survey ID is required");
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/survey-session/${surveyId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load survey status");
        }

        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        console.error("Error fetching survey status:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load status please refresh the page "
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [surveyId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <LoadingScreen message="Loading survey status..." />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="max-w-2xl mx-auto p-6 pt-20">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-6">
              {error || "Failed to load survey status"}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />

      <div className="max-w-2xl mx-auto p-6 pt-40">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="text-green-500 text-6xl mb-6">✅</div>

          {/* Completion Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Survey Completed!
          </h1>

          <p className="text-lg text-gray-600 mb-2">Thank you for completing</p>

          {/* Actions */}
          <div className="space-y-3">
            {sessionData.survey.canTakeMultiple && (
              <button
                onClick={() => router.push(`/user/survey/${surveyId}`)}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Take Survey Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
