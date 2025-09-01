"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HappinessResult {
  id: string;
  surveyId: string;
  userId: string | null;
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
    userId: "",
    startDate: "",
    endDate: "",
  });
  const [selectedResult, setSelectedResult] = useState<HappinessResult | null>(
    null
  );
  const [page, setPage] = useState(1);

  // Build query string
  const queryParams = new URLSearchParams();
  if (filters.surveyId) queryParams.set("surveyId", filters.surveyId);
  if (filters.userId) queryParams.set("userId", filters.userId);
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Survey
          </label>
          <select
            value={filters.surveyId}
            onChange={(e) =>
              setFilters({ ...filters, surveyId: e.target.value })
            }
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
            User ID
          </label>
          <input
            type="text"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Filter by user ID..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
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
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
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
                        {result.userId || "Anonymous"}
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
              <h3 className="text-lg font-semibold text-black">
                Survey Result Details
              </h3>
              <p className="text-sm text-black opacity-90">
                {result.userId || "Anonymous"} • {result.surveyTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-black hover:text-gray-700 p-2"
            >
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
          <details className="border border-gray-200 rounded-lg">
            <summary className="p-3 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
              Raw Answer Data (Click to expand)
            </summary>
            <div className="p-3 border-t bg-gray-50">
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(result.answers, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
