"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Model } from "survey-core";
import { Survey as SurveyComponent } from "survey-react-ui";
import useSWR from "swr";
import "survey-core/survey-core.css";

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

export default function AdminPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  // Use SWR for live data fetching with 2-second refresh interval
  const {
    data: survey,
    error,
    isLoading,
  } = useSWR<SurveyData>(
    surveyId ? `/api/surveys/${surveyId}` : null,
    fetcher,
    {
      refreshInterval: 2000, // Refresh every 2 seconds
      revalidateOnFocus: true, // Revalidate when window gains focus
      revalidateOnReconnect: true, // Revalidate when reconnecting
    }
  );

  // Create survey model from the latest data
  const model = useMemo(() => {
    if (!survey?.json) return null;
    return new Model(survey.json);
  }, [survey?.json]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading preview...</div>
      </div>
    );
  }

  if (error || !survey || !model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">
            {error?.message || "Survey not found"}
          </div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
          {survey.description && (
            <p className="mt-1 text-sm text-gray-600">{survey.description}</p>
          )}
        </div>
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <SurveyComponent model={model} />
          </div>
        </div>
      </div>
    </div>
  );
}
