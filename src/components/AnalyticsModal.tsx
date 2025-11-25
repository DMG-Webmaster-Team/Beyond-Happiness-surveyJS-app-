"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";
import { Model } from "survey-core";
import "survey-analytics/survey.analytics.css";
import "survey-core/i18n/english";

interface SurveyResult {
  surveyId: string;
  userId: string;
  adminId: string;
  data: Record<string, any>;
  id: string;
  submittedAt: string;
}

interface QuestionInfo {
  title: string;
  type: string;
}

interface ResultsResponse {
  surveyName: string;
  questionMap: Record<string, QuestionInfo>;
  results: SurveyResult[];
  // Support both old and new pagination formats
  items?: SurveyResult[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface Survey {
  id: string;
  title: string;
  json: any;
}

interface AnalyticsModalProps {
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AnalyticsModal({
  surveyId,
  isOpen,
  onClose,
}: AnalyticsModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch results data
  const {
    data: resultsData,
    error: resultsError,
    isLoading: resultsLoading,
  } = useSWR<ResultsResponse>(
    isOpen ? `/api/results/${surveyId}` : null,
    fetcher
  );

  // Fetch survey data
  const {
    data: surveyData,
    error: surveyError,
    isLoading: surveyLoading,
  } = useSWR<Survey>(isOpen ? `/api/surveys/${surveyId}` : null, fetcher);

  // Memoize props and inputs to avoid triggering the effect with new object references
  const memoSurveyId = surveyData?.id;
  const memoSurveyJson = useMemo(() => surveyData?.json ?? {}, [memoSurveyId]);
  const memoData = useMemo(() => {
    // Handle both old format (results) and new pagination format (items)
    const resultsArray = resultsData?.results || resultsData?.items || [];
    return resultsArray.map((result) => result.data) || [];
  }, [memoSurveyId, resultsData?.results?.length, resultsData?.items?.length]);
  const memoOptions = useMemo(() => ({ allowHideQuestions: true }), []);

  // Only initialize the panel when the modal is open and data is ready, and if it's not already initialized
  useEffect(() => {
    if (!isOpen) return;
    if (!containerRef.current) return;
    if (panelRef.current) return;
    if (!memoSurveyJson || memoData == null) return;

    const initializeAnalytics = async () => {
      try {
        // Import SurveyJS analytics
        const { VisualizationPanel } = await import("survey-analytics");

        // Create survey model
        const surveyModel = new Model(memoSurveyJson);
        const questions = surveyModel.getAllQuestions();

        // Create visualization panel with basic options
        const panel = new VisualizationPanel(questions, memoData, memoOptions);

        // Render panel
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          panel.render(containerRef.current);
          panelRef.current = panel;

        }
      } catch (error) {
        console.error("Error initializing analytics:", error);
        // Show error message
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="p-8 text-center">
              <div class="text-red-600 text-lg mb-4">Unable to load analytics</div>
              <div class="text-gray-600">${error}</div>
              <div class="mt-4 p-4 bg-gray-100 rounded">
                <div class="text-sm">Data available: ${
                  memoData.length
                } responses</div>
                <div class="text-sm">Survey: ${
                  surveyData?.title || "Unknown"
                }</div>
              </div>
            </div>
          `;
        }
      }
    };

    initializeAnalytics();

    // Cleanup
    return () => {
      try {
        if (panelRef.current?.destroy) panelRef.current.destroy();
      } catch {}
      try {
        if (panelRef.current?.dispose) panelRef.current.dispose();
      } catch {}
      panelRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [
    isOpen,
    memoSurveyId,
    memoSurveyJson,
    memoData,
    memoOptions,
    surveyData?.title,
  ]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen && panelRef.current) {
      try {
        if (panelRef.current?.destroy) panelRef.current.destroy();
      } catch {}
      try {
        if (panelRef.current?.dispose) panelRef.current.dispose();
      } catch {}
      panelRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLoading = resultsLoading || surveyLoading;
  const hasError = resultsError || surveyError;
  const surveyName =
    resultsData?.surveyName || surveyData?.title || "Unknown Survey";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-50 bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-blue-400 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-black hover:text-gray-700 p-2"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="text-xl font-semibold pr-8">Survey Analytics</h2>
          <p className="text-sm opacity-90 mt-1">{surveyName}</p>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(90vh-5rem)]">
          {/* Simple Info Bar */}
          <div className="p-4 border-b bg-gray-50">
            <div className="text-sm text-gray-600">
              {memoData.length} response
              {memoData.length !== 1 ? "s" : ""} available for analysis
            </div>
          </div>

          {/* Analytics Content */}
          <div className="flex flex-col h-full overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading analytics...</p>
                </div>
              </div>
            ) : hasError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-600 text-xl mb-4">
                    Could not load analytics. Try again.
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : !resultsData?.results.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-500 text-xl mb-4">
                    No submissions yet for this survey
                  </div>
                  <p className="text-gray-400">
                    Analytics will appear once users start submitting responses.
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                style={{ width: "100%", height: 480, overflow: "auto" }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
