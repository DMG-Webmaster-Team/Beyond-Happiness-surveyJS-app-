"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { Model } from "survey-core";
import dynamic from "next/dynamic";
import "survey-analytics/survey.analytics.css";
import "survey-analytics/survey.analytics.tabulator.css";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [visualizationPanel, setVisualizationPanel] = useState<any>(null);
  const [showPercentages, setShowPercentages] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"list" | "compact">("list");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
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

  // Debug logging
  console.log("Analytics Modal Debug:", {
    isOpen,
    surveyId,
    resultsData,
    surveyData,
    resultsError,
    surveyError,
    isLoading: resultsLoading || surveyLoading
  });

  // Filter results by search term (User ID)
  const filteredResults =
    resultsData?.results.filter((result) =>
      result.userId.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // Transform results data for analytics (filter out invalid entries and flatten nested objects)
  const analyticsData = filteredResults
    .map((result) => {
      if (!result.data || Object.keys(result.data).length === 0) return null;
      
      // Flatten nested objects for analytics compatibility
      const flattenedData: Record<string, any> = {};
      
      Object.entries(result.data).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Handle nested objects (like Quality ratings)
          Object.entries(value).forEach(([subKey, subValue]) => {
            flattenedData[`${key}.${subKey}`] = subValue;
          });
        } else {
          flattenedData[key] = value;
        }
      });
      
      return flattenedData;
    })
    .filter((data) => data !== null) as Record<string, any>[];

  // Debug analytics data
  console.log("Analytics Data Debug:", {
    filteredResults: filteredResults?.length || 0,
    analyticsData: analyticsData?.length || 0,
    sampleData: analyticsData?.[0],
    allKeys: analyticsData.length > 0 ? Object.keys(analyticsData[0]) : [],
    searchTerm
  });

  // Initialize survey model and analytics panel
  useEffect(() => {
    if (!mounted || !surveyData || !isOpen) return;

    try {
      console.log("Creating survey model with data:", surveyData.json);
      const model = new Model(surveyData.json);
      console.log("Survey model created successfully:", {
        questions: model.getAllQuestions().map(q => ({ name: q.name, title: q.title, type: q.getType() }))
      });
      setSurveyModel(model);
    } catch (error) {
      console.error("Error creating survey model:", error, surveyData);
    }
  }, [mounted, surveyData, isOpen]);

  // Initialize visualization panel when data is ready
  useEffect(() => {
    if (
      !mounted ||
      !surveyModel ||
      !analyticsData.length ||
      !analyticsContainerRef.current ||
      !isOpen
    ) {
      return;
    }

    const initializeAnalytics = async () => {
      try {
        // Import and configure chart libraries
        const [
          { VisualizationPanel },
          plotly,
          Chart
        ] = await Promise.all([
          import("survey-analytics"),
          import("plotly.js-dist-min"),
          import("chart.js/auto")
        ]);

        // Configure global chart settings
        if (typeof window !== "undefined") {
          (window as any).Plotly = plotly;
          (window as any).Chart = Chart;
        }

        // Clear previous panel
        if (visualizationPanel) {
          visualizationPanel.destroy();
        }

        // Create new visualization panel with enhanced options
        const questions = surveyModel.getAllQuestions();
        
        console.log("Initializing visualization panel:", {
          questionsCount: questions.length,
          dataCount: analyticsData.length,
          questions: questions.map(q => ({ name: q.name, title: q.title, type: q.getType() })),
          sampleData: analyticsData[0]
        });
        
        // Enhanced options for better interactivity
        const options = {
          // Basic options
          allowHideQuestions: true,
          allowShowPercentages: true,
          allowTopNAnswers: true,
          allowChangeChartType: true,
          allowDynamicLayout: true,
          
          // Advanced options
          allowSearch: true,
          allowMakePrivate: false,
          allowSetFilter: true,
          allowTransposeData: true,
          
          // Chart specific options
          seriesValues: ["count", "percentage"],
          seriesLabels: ["Count", "Percentage"],
          
          // Layout options
          layoutEngine: "advanced",
          haveCommercialLicense: false,
          
          // Export options
          allowDataExport: true,
          
          // UI customization
          showHeader: true,
          showToolbar: true,
        };

        // If no questions found in survey model, create them from the data
        let effectiveQuestions = questions;
        if (questions.length === 0 && analyticsData.length > 0) {
          console.log("No questions found in model, creating from data keys");
          const dataKeys = Object.keys(analyticsData[0]);
          effectiveQuestions = dataKeys.map(key => ({
            name: key,
            title: key,
            getType: () => 'text' // Default type
          }));
        }

        console.log("Creating panel with effective questions:", effectiveQuestions);
        const panel = new VisualizationPanel(effectiveQuestions, analyticsData, options);
        
        // Enable additional features and customizations
        panel.showHeader = true;
        panel.allowDynamicLayout = true;
        
        // Add custom event handlers for better interactivity
        panel.onVisibilityChanged.add((sender: any, options: any) => {
          console.log("Question visibility changed:", options);
        });
        
        // Customize chart types per question type
        effectiveQuestions.forEach((question: any) => {
          const questionVisualizer = panel.getVisualizer(question.name);
          if (questionVisualizer) {
            // Enable specific chart types based on question type
            const questionType = typeof question.getType === 'function' ? question.getType() : 'text';
            switch (questionType) {
              case "radiogroup":
              case "dropdown":
                questionVisualizer.chartTypes = ["bar", "pie", "doughnut"];
                break;
              case "checkbox":
                questionVisualizer.chartTypes = ["bar", "pie", "doughnut"];
                break;
              case "rating":
                questionVisualizer.chartTypes = ["bar", "line"];
                break;
              case "text":
              case "comment":
                questionVisualizer.chartTypes = ["wordcloud", "text"];
                break;
              case "matrix":
                questionVisualizer.chartTypes = ["bar", "stackedbar"];
                break;
              default:
                questionVisualizer.chartTypes = ["bar", "pie", "table"];
            }
          }
        });

        // Render panel
        if (analyticsContainerRef.current) {
          analyticsContainerRef.current.innerHTML = "";
          panel.render(analyticsContainerRef.current);
          setVisualizationPanel(panel);
        }
      } catch (error) {
        console.error("Error initializing analytics:", error);
      }
    };

    initializeAnalytics();

    // Cleanup function
    return () => {
      if (visualizationPanel) {
        visualizationPanel.destroy();
        setVisualizationPanel(null);
      }
    };
  }, [mounted, surveyModel, analyticsData, isOpen, showPercentages, layoutMode]);

  // Update panel settings when filters change
  useEffect(() => {
    if (visualizationPanel) {
      // Update percentage display
      visualizationPanel.showPercentages = showPercentages;
      
      // Update layout mode
      if (layoutMode === "compact") {
        visualizationPanel.layoutEngine = "compact";
      } else {
        visualizationPanel.layoutEngine = "advanced";
      }
      
      // Refresh the panel
      visualizationPanel.refresh();
    }
  }, [visualizationPanel, showPercentages, layoutMode]);

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
  const surveyName =
    resultsData?.surveyName || surveyData?.title || "Unknown Survey";

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
          {/* Enhanced Filter Bar */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <input
                  type="text"
                  placeholder="Search by User ID..."
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  {filteredResults.length} of {resultsData?.results.length || 0}{" "}
                  submissions
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 text-sm">
                    <input
                      type="checkbox"
                      checked={showPercentages}
                      onChange={(e) => setShowPercentages(e.target.checked)}
                      className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <span>Show %</span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Layout:</label>
                  <select
                    value={layoutMode}
                    onChange={(e) => setLayoutMode(e.target.value as "list" | "compact")}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="list">List View</option>
                    <option value="compact">Compact View</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    // Reset all filters
                    setSearchTerm("");
                    setShowPercentages(true);
                    setLayoutMode("list");
                    setSelectedQuestions([]);
                  }}
                  className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
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
                className="w-full h-full sa-analytics"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="flex space-x-2">
            {/* Export Options */}
            {analyticsData.length > 0 && (
              <>
                <button
                  onClick={() => {
                    if (visualizationPanel) {
                      // Export raw data as CSV
                      const csvContent = [
                        Object.keys(analyticsData[0]).join(','),
                        ...analyticsData.map(row => 
                          Object.values(row).map(val => 
                            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
                          ).join(',')
                        )
                      ].join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${surveyName.replace(/[^a-z0-9]/gi, '_')}_analytics.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }
                  }}
                  className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    // Copy analytics data as JSON
                    navigator.clipboard.writeText(JSON.stringify(analyticsData, null, 2));
                  }}
                  className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Copy JSON
                </button>
              </>
            )}
          </div>
          
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
