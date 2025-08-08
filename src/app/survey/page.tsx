"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Model } from "survey-core";
import { Survey as SurveyComponent } from "survey-react-ui";
import "survey-core/survey-core.css";

interface SurveyData {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  adminId: string;
  json: any;
}

export default function Survey() {
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");

  useEffect(() => {
    if (surveyId) {
      fetchSurvey(surveyId);
    } else {
      setError("No survey ID provided");
      setLoading(false);
    }
  }, [surveyId]);

  const fetchSurvey = async (id: string) => {
    try {
      const response = await fetch(`/api/surveys/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSurvey(data);

        // Create survey model with the fetched JSON
        const model = new Model(data.json);
        setSurveyModel(model);
      } else {
        setError("Failed to load survey");
      }
    } catch (error) {
      setError("An error occurred while loading the survey");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          <div className="text-red-600 text-xl mb-4">{error}</div>
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
