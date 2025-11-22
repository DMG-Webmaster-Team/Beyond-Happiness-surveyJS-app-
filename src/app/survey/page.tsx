"use client";

export const dynamic = 'force-dynamic';

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
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

export default function Survey() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");

  // Use SWR for live data fetching
  const {
    data: survey,
    error,
    isLoading,
  } = useSWR<SurveyData>(
    surveyId ? `/api/surveys/${surveyId}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Create survey model from the latest data
  const surveyModel = useMemo(() => {
    if (!survey?.json) return null;
    return new Model(survey.json);
  }, [survey?.json]);

  if (!surveyId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">No survey ID provided</div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-xl">Loading survey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">
            {error.message || "Failed to load survey"}
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!survey || !surveyModel) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Survey not found</div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="text-gray-600">{survey.description}</p>
          )}
        </div>
        <SurveyComponent model={surveyModel} />
      </div>
    </div>
  );
}
