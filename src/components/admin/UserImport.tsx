"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import CompanySelect from "@/components/shared/CompanySelect";
import SurveySelectorSeparate from "@/components/shared/SurveySelectorSeparate";

interface ImportResult {
  success: boolean;
  message?: string;
  totalRows: number;
  validRows: number;
  errors?: Array<{
    row: number;
    data: {
      email: string;
      name: string;
      phone: string;
      companyId: string;
    };
    errors: string[];
  }>;
  importResults?: {
    insertedUsers: number;
    updatedUsers: number;
    insertedAssignments: number;
    skippedAssignments?: number;
    duplicateAssignments?: number;
    processingTime?: number;
    processingTimeMs?: number; // Legacy support
    errors?: Array<{
      row: number;
      email: string;
      error: string;
      type: "duplicate" | "error" | "constraint";
    }>;
  };
  processingTime?: number;
  dryRun?: boolean;
}

export default function UserImport() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([]);
  const [selectedHappinessSurveyIds, setSelectedHappinessSurveyIds] = useState<
    string[]
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [companySurveys, setCompanySurveys] = useState<
    { id: string; title: string }[]
  >([]);
  const [companyHappinessSurveys, setCompanyHappinessSurveys] = useState<
    { id: string; title: string }[]
  >([]);
  const [showCompanyWarning, setShowCompanyWarning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company surveys when company is selected
  useEffect(() => {
    const fetchCompanySurveys = async () => {
      if (!selectedCompanyId) {
        setCompanySurveys([]);
        setCompanyHappinessSurveys([]);
        setShowCompanyWarning(false);
        return;
      }

      try {
        const [surveysRes, happinessRes] = await Promise.all([
          fetch(`/api/surveys?companyId=${selectedCompanyId}`),
          fetch(`/api/happiness/surveys?companyId=${selectedCompanyId}`),
        ]);

        let companySurveysData: any[] = [];
        let companyHappinessData: any[] = [];

        if (surveysRes.ok) {
          const data = await surveysRes.json();
          companySurveysData = data.items || [];
        }

        if (happinessRes.ok) {
          const data = await happinessRes.json();
          companyHappinessData = data.surveys || [];
        }

        setCompanySurveys(companySurveysData);
        setCompanyHappinessSurveys(companyHappinessData);

        // Show warning if company has no surveys
        if (
          companySurveysData.length === 0 &&
          companyHappinessData.length === 0
        ) {
          setShowCompanyWarning(true);
        } else {
          setShowCompanyWarning(false);
        }
      } catch (error) {
        console.error("Failed to fetch company surveys:", error);
        setCompanySurveys([]);
        setCompanyHappinessSurveys([]);
      }
    };

    fetchCompanySurveys();
  }, [selectedCompanyId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    // Must have at least one assignment: company OR surveys
    const hasCompany = !!selectedCompanyId;
    const hasSurveys =
      selectedSurveyIds.length > 0 || selectedHappinessSurveyIds.length > 0;

    if (!hasCompany && !hasSurveys) {
      setError(
        "Please select at least one of the following: Company, Regular Survey, or Happiness Survey."
      );
      return;
    }

    // Show warning if company has no surveys and user wants to continue
    if (showCompanyWarning && hasCompany && !hasSurveys) {
      const confirmContinue = window.confirm(
        "The selected company has no surveys assigned. Are you sure you want to continue? Users will be created but not assigned to any surveys."
      );
      if (!confirmContinue) {
        return;
      }
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Add survey info - multiple surveys supported
      if (selectedSurveyIds.length > 0) {
        selectedSurveyIds.forEach((id) => formData.append("surveyIds", id));
      }

      if (selectedHappinessSurveyIds.length > 0) {
        selectedHappinessSurveyIds.forEach((id) =>
          formData.append("happinessSurveyIds", id)
        );
      }

      if (selectedCompanyId) {
        formData.append("companyId", selectedCompanyId);
      }
      formData.append("dryRun", dryRun ? "1" : "0");

      const response = await fetch("/api/admin/import-users", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors (400) differently from other errors
        if (
          response.status === 400 &&
          data.errors &&
          Array.isArray(data.errors)
        ) {
          // Set the result with validation errors so they can be displayed
          setResult({
            ...data,
            success: false,
          });
          setError(data.error || "Validation errors found in uploaded file");
        } else {
          // Handle other types of errors (500, etc.)
          throw new Error(data.error || "Upload failed");
        }
      } else {
        // Success case
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setDryRun(false);
    await handleUpload();
  };

  const downloadTemplate = () => {
    // Use Excel-compatible format with leading zeros preserved by prefixing with apostrophe
    const csvContent = `email,name,phone
user1@example.com,John Doe,'01012345678
user2@example.com,Jane Smith,'01112345678
user3@example.com,,'01298765432
user4@example.com,Bob Johnson,`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Users</h2>
        <p className="text-gray-600">
          Upload an Excel (.xlsx, .xls) or CSV file to import users and assign
          surveys.
        </p>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {!file ? (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-medium text-blue-400 hover:text-blue-400/80"
                >
                  Click to upload
                </button>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Excel (.xlsx, .xls) or CSV files up to 10MB
              </p>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">{file.name}</span>
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Remove file
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Company Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Company for Users
        </label>
        <CompanySelect
          value={selectedCompanyId}
          onChange={setSelectedCompanyId}
          allowNone={true}
          placeholder="Choose a company (optional)"
          className="max-w-xs"
        />
        <p className="mt-1 text-sm text-gray-500">
          Users will be assigned to the selected company. Leave empty if no
          company assignment is needed.
        </p>
      </div>

      {/* Company Surveys Info */}
      {/* {selectedCompanyId &&
        (companySurveys.length > 0 || companyHappinessSurveys.length > 0) && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Company Surveys (Auto-assigned)
            </h4>
            {companySurveys.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-green-700 font-medium">
                  Regular Surveys:
                </p>
                <ul className="text-xs text-green-600 ml-4">
                  {companySurveys.map((survey) => (
                    <li key={survey.id}>• {survey.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {companyHappinessSurveys.length > 0 && (
              <div>
                <p className="text-xs text-green-700 font-medium">
                  Happiness Surveys:
                </p>
                <ul className="text-xs text-green-600 ml-4">
                  {companyHappinessSurveys.map((survey) => (
                    <li key={survey.id}>• {survey.title}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-green-600 mt-2">
              All users will be automatically assigned to these company surveys.
            </p>
          </div>
        )} */}

      {/* Company Warning */}
      {showCompanyWarning && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-yellow-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> The selected company has no surveys
              assigned.
            </p>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Users will be created but not assigned to any surveys unless you
            select additional surveys below.
          </p>
        </div>
      )}

      {/* Survey Selection - Regular Surveys */}
      <div className="mb-6">
        <SurveySelectorSeparate
          value={selectedSurveyIds}
          onChange={setSelectedSurveyIds}
          surveyType="regular"
          label="Additional Regular Surveys (Optional)"
          placeholder="Select regular surveys to assign to imported users..."
          multiple={true}
          includeDeleted={false}
        />
        <p className="mt-1 text-xs text-gray-500">
          These regular surveys will be assigned to all imported users in
          addition to any company surveys.
        </p>
      </div>

      {/* Survey Selection - Happiness Surveys */}
      <div className="mb-6">
        <SurveySelectorSeparate
          value={selectedHappinessSurveyIds}
          onChange={setSelectedHappinessSurveyIds}
          surveyType="happiness"
          label="Additional Happiness Surveys (Optional)"
          placeholder="Select happiness surveys to assign to imported users..."
          multiple={true}
          includeDeleted={false}
        />
        <p className="mt-1 text-xs text-gray-500">
          These happiness surveys will be assigned to all imported users in
          addition to any company surveys.
        </p>
      </div>

      {/* Selection Summary */}
      {/* {(selectedCompanyId ||
        selectedSurveyIds.length > 0 ||
        selectedHappinessSurveyIds.length > 0) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Import Summary
          </h4>

          {selectedCompanyId && (
            <div className="mb-2">
              <p className="text-xs text-blue-700">
                <strong>Company:</strong> Selected (users will get all company
                surveys automatically)
              </p>
            </div>
          )}

          {selectedSurveyIds.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-blue-700 font-medium">
                Additional Regular Surveys ({selectedSurveyIds.length}):
              </p>
              <ul className="text-xs text-blue-600 ml-4">
                {selectedSurveyIds.map((id) => {
                  const survey = surveys.find((s) => s.id === id);
                  return <li key={id}>• {survey?.title || id}</li>;
                })}
              </ul>
            </div>
          )}

          {selectedHappinessSurveyIds.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-blue-700 font-medium">
                Additional Happiness Surveys (
                {selectedHappinessSurveyIds.length}):
              </p>
              <ul className="text-xs text-blue-600 ml-4">
                {selectedHappinessSurveyIds.map((id) => {
                  const survey = happinessSurveys.find((s) => s.id === id);
                  return <li key={id}>• {survey?.title || id}</li>;
                })}
              </ul>
            </div>
          )}

          <p className="text-xs text-blue-600 mt-2">
            All users in the uploaded file will be assigned to the selected
            surveys.
          </p>
        </div>
      )} */}

      {/* Options */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-gray-300 text-blue-400 focus:ring-blue-400"
          />
          <span className="ml-2 text-sm text-gray-700">
            Dry run (validate only, don&apos;t import)
          </span>
        </label>
      </div>

      {/* Template Download */}
      <div className="mb-6">
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm text-blue-400 hover:text-blue-400/80 underline"
        >
          Download CSV template
        </button>
      </div>

      {/* Upload Button */}
      <div className="mb-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUpload}
          disabled={
            !file ||
            isUploading ||
            (!dryRun && result && result.errors && result.errors.length > 0) ||
            false
          }
          className="w-full bg-blue-400 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </div>
          ) : dryRun ? (
            "Validate File"
          ) : (
            "Import Users"
          )}
        </motion.button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                {result.dryRun ? "Validation Results" : "Import Results"}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>Total Rows:</strong> {result.totalRows}
                </p>
                <p>
                  <strong>Valid Rows:</strong> {result.validRows}
                </p>
                {((result.errors && result.errors.length > 0) ||
                  (result.importResults &&
                    result.importResults.errors &&
                    result.importResults.errors.length > 0)) && (
                  <p>
                    <strong>Errors:</strong>{" "}
                    {(result.errors?.length || 0) +
                      (result.importResults?.errors?.length || 0)}
                  </p>
                )}
                {result.importResults && (
                  <div className="mt-2">
                    <p>
                      <strong>Inserted Users:</strong>{" "}
                      {result.importResults.insertedUsers || 0}
                    </p>
                    <p>
                      <strong>Updated Users:</strong>{" "}
                      {result.importResults.updatedUsers || 0}
                    </p>
                    <p>
                      <strong>Inserted Assignments:</strong>{" "}
                      {result.importResults.insertedAssignments || 0}
                    </p>
                    {(result.importResults.skippedAssignments || 0) > 0 && (
                      <p>
                        <strong>Skipped Assignments:</strong>{" "}
                        {result.importResults.skippedAssignments}
                      </p>
                    )}
                    {(result.importResults.duplicateAssignments || 0) > 0 && (
                      <p>
                        <strong>Duplicate Assignments:</strong>{" "}
                        {result.importResults.duplicateAssignments}
                      </p>
                    )}
                    <p>
                      <strong>Processing Time:</strong>{" "}
                      {result.importResults.processingTime ||
                        result.importResults.processingTimeMs ||
                        0}
                      ms
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confirm Import Button for Dry Run */}
          {result.dryRun && result.validRows > 0 && (
            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirmImport}
                disabled={
                  isUploading || (result.errors && result.errors.length > 0)
                }
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {result.errors && result.errors.length > 0
                  ? `Fix ${result.errors.length} error(s) before importing`
                  : `Confirm Import (${result.validRows} users)`}
              </motion.button>
              {result.errors && result.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Please fix the validation errors above before proceeding with
                  the import.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Validation Errors Table */}
      {result && result.errors && result.errors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            ❌ Validation Errors ({result.errors.length} rows)
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-700">
              <strong>Fix these errors before importing:</strong> The following
              rows contain validation errors and must be corrected in your file
              before they can be imported.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Row #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validation Errors
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.errors.map((error: any, index: number) => (
                  <tr key={`validation-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {error.row}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {error.data?.email || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {error.data?.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {error.data?.phone || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        {Array.isArray(error.errors) ? (
                          error.errors.map((err: string, errIndex: number) => (
                            <div key={errIndex} className="flex items-center">
                              <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0"></span>
                              <span className="text-red-700 text-xs">
                                {err}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0"></span>
                            <span className="text-red-700 text-xs">
                              {error.error || "Validation failed"}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Processing Errors Table */}
      {result &&
        result.importResults &&
        result.importResults.errors &&
        result.importResults.errors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              ⚠️ Import Processing Errors ({result.importResults.errors.length}{" "}
              rows)
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-700">
                <strong>Processing Issues:</strong> These rows passed validation
                but encountered errors during import processing.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.importResults.errors.map(
                    (error: any, index: number) => (
                      <tr key={`import-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {error.row}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {error.email || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {error.error || "Import failed"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              error.type === "duplicate"
                                ? "bg-yellow-100 text-yellow-800"
                                : error.type === "constraint"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {error.type || "Error"}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
