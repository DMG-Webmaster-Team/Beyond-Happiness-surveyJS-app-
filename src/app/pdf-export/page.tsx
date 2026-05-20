"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Model } from "survey-core";
import { SurveyPDF } from "survey-pdf";
import PDFExportButton from "@/components/PDFExportButton";

interface Survey {
  id: string;
  title: string;
  description: string;
  definition: string;
  canTakeMultiple: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PdfExport() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      setError("No survey ID provided");
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch survey");
        }
        const surveyData = await response.json();
        setSurvey(surveyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch survey");
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-lg text-gray-600">Loading survey...</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-lg text-gray-600">{error || "Survey not found"}</p>
          <a
            href="/admin/dashboard"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Get the survey JSON structure
  const surveyJson = survey.definition || {};

  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        SurveyJS PDF Generator
      </h1>

      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {survey.title}
          </h2>
          {survey.description && (
            <p className="text-gray-600 mb-4">{survey.description}</p>
          )}
          <div className="text-sm text-gray-500">
            <p>Survey ID: {survey.id}</p>
            <p>
              Type:{" "}
              {survey.canTakeMultiple
                ? "Multiple submissions allowed"
                : "One-time submission"}
            </p>
            <p>Created: {new Date(survey.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-lg text-blue-800">
            <p className="mb-2">
              <strong>SurveyJS PDF Generator</strong> is a client-side extension
              over SurveyJS Form Library that enables users to save surveys as
              PDF documents.
            </p>
            <p className="text-sm text-blue-700">
              <strong>NOTE:</strong> Dynamic elements and characteristics
              (visibility, validation, navigation buttons) are not supported.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <PDFExportButton
            surveyJson={surveyJson}
            className="text-lg px-8 py-3"
          >
            Export Survey to PDF
          </PDFExportButton>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/admin/dashboard"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
