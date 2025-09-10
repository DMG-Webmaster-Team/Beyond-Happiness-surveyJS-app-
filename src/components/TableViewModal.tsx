"use client";

import { useState, useEffect } from "react";
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

interface Survey {
  id: string;
  title: string;
  json: any;
}

interface TableViewModalProps {
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TableViewModal({
  surveyId,
  isOpen,
  onClose,
}: TableViewModalProps) {
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Process data for table view
  useEffect(() => {
    if (resultsData?.results && surveyData?.json) {
      setIsProcessing(true);

      try {
        // Extract question titles from survey definition
        const surveyDefinition =
          typeof surveyData.json === "string"
            ? JSON.parse(surveyData.json)
            : surveyData.json;

        const questions = surveyDefinition.pages?.[0]?.elements || [];
        const questionMap = new Map();

        questions.forEach((question: any) => {
          if (question.name && question.title) {
            questionMap.set(question.name, question.title);
          }
        });

        // Fetch user information for all results
        const fetchUserInfo = async () => {
          const userPromises = resultsData.results.map(async (result) => {
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
          const userMap = new Map();
          userResults.forEach(({ userId, user }) => {
            userMap.set(userId, user);
          });

          // Prepare table data with user information
          const processedData = resultsData.results.map((result, index) => {
            // Use backend-provided user data if available, fallback to fetched data
            const displayName =
              result.userName ||
              result.userEmail ||
              userMap.get(result.userId)?.name ||
              userMap.get(result.userId)?.email ||
              "Unknown User";
            const email =
              result.userEmail || userMap.get(result.userId)?.email || "-";

            const row: any = {
              "#": index + 1,
              User: displayName,
              Email: email,
              Submitted: new Date(result.submittedAt).toLocaleString(),
              "Admin ID": result.adminId || "-",
            };

            // Add survey answers
            if (result.data && typeof result.data === "string") {
              try {
                const parsedData = JSON.parse(result.data);
                Object.entries(parsedData).forEach(([key, value]) => {
                  const questionTitle = questionMap.get(key) || key;
                  row[questionTitle] = formatAnswer(value);
                });
              } catch (e) {
                console.error("Error parsing result data:", e);
              }
            } else if (result.data) {
              Object.entries(result.data).forEach(([key, value]) => {
                const questionTitle = questionMap.get(key) || key;
                row[questionTitle] = formatAnswer(value);
              });
            }

            return row;
          });

          // Extract all unique column names
          const allColumns = new Set<string>();
          processedData.forEach((row) => {
            Object.keys(row).forEach((key) => allColumns.add(key));
          });

          const columnOrder = [
            "#",
            "User",
            "Email",
            "Submitted",
            "Admin ID",
            ...Array.from(allColumns).filter(
              (col) =>
                !["#", "User", "Email", "Submitted", "Admin ID"].includes(col)
            ),
          ];

          setColumns(columnOrder);
          setTableData(processedData);
        };

        fetchUserInfo();
      } catch (error) {
        console.error("Error processing table data:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [resultsData, surveyData]);

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

  const exportToCSV = () => {
    if (!tableData.length || !columns.length) return;

    const csvContent = [
      columns.join(","),
      ...tableData.map((row) =>
        columns
          .map((col) => {
            const value = row[col] || "";
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${surveyData?.title || "survey"}_results.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isLoading = resultsLoading || surveyLoading;
  const hasError = resultsError || surveyError;
  const hasResults = (resultsData?.results?.length || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b bg-blue-400 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200 p-2"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="text-xl font-semibold pr-8">
            SurveyJS Table View - Survey Results
          </h2>
          <p className="text-sm opacity-90 mt-1">{surveyData?.title}</p>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading table data...</p>
              </div>
            </div>
          ) : hasError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 text-xl mb-4">
                  Could not load table data. Try again.
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !hasResults ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-gray-500 text-xl mb-4">
                  No submissions yet for this survey
                </div>
                <p className="text-gray-400">
                  Table view will appear once users start submitting responses.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  📊 Export to CSV
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={
                          rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }
                      >
                        {columns.map((column) => (
                          <td
                            key={column}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b"
                          >
                            {row[column] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="text-sm text-gray-600 text-center">
                Showing {tableData.length} submission
                {tableData.length !== 1 ? "s" : ""} with {columns.length} column
                {columns.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
