"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Model } from "survey-core";
import dynamic from "next/dynamic";
import "survey-analytics/survey.analytics.css";

// Dynamically import VisualizationPanel to avoid SSR issues
const DynamicVisualizationPanel = dynamic(
  () => import("survey-analytics").then((mod) => mod.VisualizationPanel),
  {
    ssr: false,
    loading: () => <div className="text-center py-8">Loading analytics...</div>,
  }
);

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
  const [visualizationPanel, setVisualizationPanel] = useState<any>(null);
  const analyticsContainerRef = useRef<HTMLDivElement>(null);

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

  // Simple data transformation for analytics
  const analyticsData = resultsData?.results.map((result) => result.data) || [];

  // Initialize analytics when data is ready
  useEffect(() => {
    if (
      !mounted ||
      !surveyData ||
      !analyticsData.length ||
      !analyticsContainerRef.current ||
      !isOpen
    ) {
      return;
    }

    const initializeAnalytics = async () => {
      try {
        // Import SurveyJS analytics
        const { VisualizationPanel } = await import("survey-analytics");

        // Clear previous panel
        if (visualizationPanel) {
          visualizationPanel.destroy();
        }

        // Create survey model
        const surveyModel = new Model(surveyData.json);
        const questions = surveyModel.getAllQuestions();

        console.log("Analytics Setup:", {
          questionsCount: questions.length,
          dataCount: analyticsData.length,
          surveyTitle: surveyData.title
        });

        // Create visualization panel with basic options
        const panel = new VisualizationPanel(questions, analyticsData);

        // Render panel
        if (analyticsContainerRef.current) {
          analyticsContainerRef.current.innerHTML = "";
          panel.render(analyticsContainerRef.current);
          setVisualizationPanel(panel);
          console.log("Analytics panel rendered successfully!");
        }
      } catch (error) {
        console.error("Error initializing analytics:", error);
        // Show error message
        if (analyticsContainerRef.current) {
          analyticsContainerRef.current.innerHTML = `
            <div class="p-8 text-center">
              <div class="text-red-600 text-lg mb-4">Unable to load analytics</div>
              <div class="text-gray-600">${error}</div>
              <div class="mt-4 p-4 bg-gray-100 rounded">
                <div class="text-sm">Data available: ${analyticsData.length} responses</div>
                <div class="text-sm">Survey: ${surveyData?.title || 'Unknown'}</div>
              </div>
            </div>
          `;
        }
      }
    };

    initializeAnalytics();

    // Cleanup
    return () => {
      if (visualizationPanel) {
        visualizationPanel.destroy();
        setVisualizationPanel(null);
      }
    };
  }, [mounted, surveyData, analyticsData, isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen && visualizationPanel) {
      visualizationPanel.destroy();
      setVisualizationPanel(null);
    }
  }, [isOpen, visualizationPanel]);

  if (!isOpen) return null;

  const isLoading = resultsLoading || surveyLoading;
  const hasError = resultsError || surveyError;
  const surveyName = resultsData?.surveyName || surveyData?.title || "Unknown Survey";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-brand-primary text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200 p-2"
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
              {analyticsData.length} response{analyticsData.length !== 1 ? 's' : ''} available for analysis
            </div>
          </div>

          {/* Analytics Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
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
                    className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary/90"
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
            ) : !filteredResults.length ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-500 text-xl mb-4">
                    No submissions match your search
                  </div>
                  <p className="text-gray-400">
                    Try adjusting your search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={analyticsContainerRef}
                className="w-full h-full"
                style={{ minHeight: "500px" }}
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
