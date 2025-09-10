"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";

interface SurveyResult {
  surveyId: string;
  userId: string;
  adminId: string;
  data: Record<string, any>;
  id: string;
  submittedAt: string;
  userName?: string;
  userEmail?: string;
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

interface ResultsModalProps {
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatAnswer = (value: any): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
};

export default function ResultsModal({
  surveyId,
  isOpen,
  onClose,
}: ResultsModalProps) {
  const [selectedResult, setSelectedResult] = useState<SurveyResult | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, any>>(new Map());
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const itemsPerPage = 20;

  const {
    data: responseData,
    error,
    isLoading,
  } = useSWR<ResultsResponse>(
    isOpen ? `/api/results/${surveyId}` : null,
    fetcher
  );

  // Get display name for a user
  const getDisplayName = useCallback(
    (userId: string, result?: any) => {
      // Use backend-provided user data if available, fallback to fetched data
      if (result?.userName || result?.userEmail) {
        return result.userName || result.userEmail;
      }
      const user = userMap.get(userId);
      return user?.name || user?.email || "Anonymous User";
    },
    [userMap]
  );

  // Fetch user information for all results
  const fetchUserInfo = useCallback(async (results: SurveyResult[]) => {
    if (results.length === 0) return;

    setIsLoadingUsers(true);
    try {
      const userPromises = results.map(async (result) => {
        try {
          const response = await fetch(`/api/users/${result.userId}`);
          if (response.ok) {
            const userData = await response.json();
            return { userId: result.userId, user: userData.data };
          }
        } catch (error) {
          console.error(`Error fetching user ${result.userId}:`, error);
        }
        return { userId: result.userId, user: null };
      });

      const userResults = await Promise.all(userPromises);
      const newUserMap = new Map();
      userResults.forEach(({ userId, user }) => {
        newUserMap.set(userId, user);
      });
      setUserMap(newUserMap);
    } catch (error) {
      console.error("Error fetching user information:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Fetch user info when results change
  useEffect(() => {
    if (responseData?.results) {
      fetchUserInfo(responseData.results);
    }
  }, [responseData?.results, fetchUserInfo]);

  // Filter results by search term - handle undefined data safely
  const filteredResults =
    responseData?.results?.filter((result) => {
      const displayName = getDisplayName(result.userId, result);
      return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];

  // Paginate results
  const paginatedResults = filteredResults.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  const handleCopyJson = (result: SurveyResult) => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-50 bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b bg-blue-400 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-black hover:text-gray-700 p-2"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="text-xl font-semibold pr-8">Survey Results</h2>
          <p className="text-sm opacity-90 mt-1">{responseData?.surveyName}</p>
        </div>

        <div className="flex h-[calc(90vh-7rem)]">
          {/* Results List */}
          <div className="w-1/2 border-r p-4 overflow-y-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full p-2 border rounded"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-4">Loading results...</div>
            ) : error ? (
              <div className="text-red-600 text-center py-4">
                Error loading results
              </div>
            ) : !responseData?.results?.length ? (
              <div className="text-center py-4">
                No submissions yet for this survey.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedResults?.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => setSelectedResult(result)}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedResult?.id === result.id
                          ? "bg-blue-400 text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium">
                        {isLoadingUsers
                          ? "Loading..."
                          : getDisplayName(result.userId, result)}
                      </div>
                      <div className="text-sm">
                        {new Date(result.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`px-3 py-1 rounded ${
                          page === i + 1
                            ? "bg-blue-400 text-white"
                            : "bg-gray-200"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Result Detail */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {selectedResult ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium">Result Details</h3>
                  <button
                    onClick={() => handleCopyJson(selectedResult)}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Copy JSON
                  </button>
                </div>

                {/* Metadata */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium mb-3">Submission Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="w-24 text-gray-600">User:</span>
                      <span>
                        {getDisplayName(selectedResult.userId, selectedResult)}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-gray-600">Email:</span>
                      <span>
                        {userMap.get(selectedResult.userId)?.email || "N/A"}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-24 text-gray-600">Submitted:</span>
                      <span>
                        {new Date(selectedResult.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div>
                  <h4 className="font-medium mb-3">Answers</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedResult.data).map(([key, value]) => (
                      <div key={key} className="bg-white p-3 rounded-lg border">
                        <div className="text-sm text-gray-600 mb-1">
                          {responseData?.questionMap[key]?.title || key}
                        </div>
                        <div className="font-medium">{formatAnswer(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                Select a result to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy Toast */}
      {showCopyToast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
          Result JSON copied to clipboard
        </div>
      )}
    </div>
  );
}
