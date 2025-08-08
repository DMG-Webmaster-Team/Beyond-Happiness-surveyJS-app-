"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function AdminPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!surveyId) return;
    (async () => {
      try {
        const res = await fetch(`/api/surveys/${surveyId}`);
        if (!res.ok) throw new Error("Failed to fetch survey");
        const data = await res.json();
        setSurvey(data);
        setModel(new Model(data.json));
      } catch (e: any) {
        setError(e?.message || "Failed to load survey");
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  if (loading) {
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
            {error || "Survey not found"}
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
