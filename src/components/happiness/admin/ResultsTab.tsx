"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useDebounce } from "@/hooks/useDebounce";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessResult {
  id: string;
  surveyId: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  answers: Array<{ questionId: number; valueIndex: number }>;
  categoryTotals: {
    Meaning: number;
    Delight: number;
    Freedom: number;
    Engagement: number;
    Vitality: number;
  };
  code: string;
  characterId: number;
  createdAt: number;
  surveyTitle: string;
  characterName: string;
}

export default function ResultsTab() {
  const [filters, setFilters] = useState({
    surveyId: "",
    userEmail: "",
    startDate: "",
    endDate: "",
  });
  const [userEmailInput, setUserEmailInput] = useState("");
  const [selectedResult, setSelectedResult] = useState<HappinessResult | null>(
    null
  );
  const [page, setPage] = useState(1);

  // Debounce the user email input with 2 second delay
  const debouncedUserEmail = useDebounce(userEmailInput, 2000);

  // Update filters when debounced value changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, userEmail: debouncedUserEmail }));
    setPage(1); // Reset to first page when search changes
  }, [debouncedUserEmail]);

  // Function to export all results to CSV
  const handleExportAllCSV = () => {
    if (!data?.results || data.results.length === 0) return;

    // Prepare CSV data
    const csvData = [
      // Headers
      [
        "Result ID",
        "Survey ID",
        "Survey Title",
        "User Email",
        "User Name",
        "Character Code",
        "Character Name",
        "Meaning Score",
        "Delight Score",
        "Freedom Score",
        "Engagement Score",
        "Vitality Score",
        "Total Score",
        "Submission Date",
        "Export Date",
      ],
      // Data rows
      ...data.results.map((result: HappinessResult) => [
        result.id,
        result.surveyId,
        result.surveyTitle,
        result.userEmail || "Anonymous",
        result.userName || "N/A",
        result.code,
        result.characterName,
        result.categoryTotals.Meaning,
        result.categoryTotals.Delight,
        result.categoryTotals.Freedom,
        result.categoryTotals.Engagement,
        result.categoryTotals.Vitality,
        Object.values(result.categoryTotals).reduce(
          (sum, score) => sum + score,
          0
        ),
        new Date(result.createdAt).toISOString().split("T")[0],
        new Date().toISOString().split("T")[0],
      ]),
    ];

    // Convert to CSV string
    const csvContent = csvData.map((row) => row.join(",")).join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `happiness_survey_results_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Build query string
  const queryParams = new URLSearchParams();
  if (filters.surveyId) queryParams.set("surveyId", filters.surveyId);
  if (filters.userEmail) queryParams.set("userEmail", filters.userEmail);
  if (filters.startDate) queryParams.set("startDate", filters.startDate);
  if (filters.endDate) queryParams.set("endDate", filters.endDate);
  queryParams.set("page", page.toString());
  queryParams.set("limit", "20");

  const { data, error, isLoading } = useSWR(
    `/api/happiness/results?${queryParams.toString()}`,
    fetcher
  );

  // Also fetch surveys for filter dropdown
  const { data: surveysData } = useSWR("/api/happiness/surveys", fetcher);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Meaning":
        return "bg-purple-100 text-purple-800";
      case "Delight":
        return "bg-yellow-100 text-yellow-800";
      case "Freedom":
        return "bg-green-100 text-green-800";
      case "Engagement":
        return "bg-blue-100 text-blue-800";
      case "Vitality":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-red-600">
          Failed to load results. Please try again.
        </div>
      </div>
    );
  }

  const results = data?.results || [];
  const surveys = surveysData?.surveys || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Happiness Survey Results ({results.length})
        </h2>
        <p className="text-sm text-gray-600">
          View and analyze happiness survey responses and character assignments
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">Filter Results</h3>
          <div className="flex gap-3">
            <button
              onClick={handleExportAllCSV}
              disabled={!data?.results || data.results.length === 0}
              className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => {
                setFilters({
                  surveyId: "",
                  userEmail: "",
                  startDate: "",
                  endDate: "",
                });
                setUserEmailInput("");
                setPage(1);
              }}
              className="text-sm text-blue-400 hover:text-blue-600 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Survey
            </label>
            <select
              value={filters.surveyId}
              onChange={(e) => {
                setFilters({ ...filters, surveyId: e.target.value });
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Surveys</option>
              {surveys.map((survey: any) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Email
            </label>
            <div className="relative">
              <input
                type="text"
                value={userEmailInput}
                onChange={(e) => setUserEmailInput(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Filter by user email..."
              />
              {userEmailInput !== debouncedUserEmail &&
                userEmailInput.length > 0 && (
                  <div className="absolute right-2 top-2 text-xs text-gray-500">
                    Searching...
                  </div>
                )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.surveyId ||
          filters.userEmail ||
          filters.startDate ||
          filters.endDate) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Active filters:</span>
              {filters.surveyId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Survey:{" "}
                  {surveys.find((s: any) => s.id === filters.surveyId)?.title ||
                    filters.surveyId}
                  <button
                    onClick={() => {
                      setFilters({ ...filters, surveyId: "" });
                      setPage(1);
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.userEmail && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Email: {filters.userEmail}
                  <button
                    onClick={() => {
                      setFilters({ ...filters, userEmail: "" });
                      setUserEmailInput("");
                      setPage(1);
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.startDate && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  From: {filters.startDate}
                  <button
                    onClick={() => {
                      setFilters({ ...filters, startDate: "" });
                      setPage(1);
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.endDate && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  To: {filters.endDate}
                  <button
                    onClick={() => {
                      setFilters({ ...filters, endDate: "" });
                      setPage(1);
                    }}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User / Survey
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Character
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Scores
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result: HappinessResult) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {result.userName || result.userEmail || "Anonymous"}
                      </div>
                      <div className="text-gray-500">{result.surveyTitle}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {result.characterName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(result.categoryTotals).map(
                        ([category, score]) => (
                          <span
                            key={category}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                              category
                            )}`}
                          >
                            {category}: {score}
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {result.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(result.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No results found matching your filters.
        </div>
      )}

      {/* Pagination */}
      {data?.hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setPage(page + 1)}
            className="bg-blue-400 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Load More Results
          </button>
        </div>
      )}

      {/* Result Detail Modal */}
      {selectedResult && (
        <ResultDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}

interface ResultDetailModalProps {
  result: HappinessResult;
  onClose: () => void;
}

function ResultDetailModal({ result, onClose }: ResultDetailModalProps) {
  // We'd need to fetch question details to show the breakdown
  // For now, just show the summary

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-4xl bg-white rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b bg-blue-400 text-white sticky top-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold ">Survey Result Details</h3>
              <p className="text-sm  opacity-90">
                {result.userEmail || "Anonymous"} • {result.surveyTitle}
              </p>
            </div>
            <button onClick={onClose} className=" hover:text-gray-700 p-2">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Character Result */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              Character Assignment
            </h4>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-1 shadow">
                <img
                  src={`/characters/${result.code}.png`}
                  alt={result.characterName}
                  className="w-full h-full rounded-full object-cover bg-white"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = "/characters/00000.png";
                  }}
                />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {result.characterName}
                </div>
                <div className="text-sm text-gray-600">Code: {result.code}</div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Category Scores
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(result.categoryTotals).map(
                ([category, score]) => {
                  const percentage = Math.min((score / 8000) * 100, 100); // Assuming max possible is around 8000
                  return (
                    <div key={category} className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {score}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {category}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            category === "Meaning"
                              ? "bg-purple-500"
                              : category === "Delight"
                              ? "bg-yellow-500"
                              : category === "Freedom"
                              ? "bg-green-500"
                              : category === "Engagement"
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {score >= 6000 ? "High" : "Low"}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Answer Summary */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Answer Summary ({result.answers.length} questions)
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Questions:</span>{" "}
                  {result.answers.length}
                </div>
                <div>
                  <span className="font-medium">Submitted:</span>{" "}
                  {new Date(result.createdAt * 1000).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Survey ID:</span>{" "}
                  {result.surveyId}
                </div>
                <div>
                  <span className="font-medium">Result ID:</span> {result.id}
                </div>
              </div>
            </div>
          </div>

          {/* Raw Data (for debugging) */}
        </div>
      </div>
    </div>
  );
}
