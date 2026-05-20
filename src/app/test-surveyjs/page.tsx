"use client";

import { useEffect, useState } from "react";
import SimpleTableView from "@/components/analytics/SimpleTableView";

export default function TestSurveyJSPage() {
  const [imports, setImports] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testImports = async () => {
      try {

        // Test survey-core
        const { Model } = await import("survey-core");

        // Test survey-analytics
        const { Tabulator } = await import(
          "survey-analytics/survey.analytics.tabulator"
        );

        // Test jsPDF
        const jsPDF = await import("jspdf");

        // Test XLSX
        const XLSX = await import("xlsx");

        setImports({
          Model: typeof Model,
          Tabulator: typeof Tabulator,
          jsPDF: typeof jsPDF.default,
          XLSX: typeof XLSX,
        });
      } catch (e) {
        console.error("❌ Import test failed:", e);
        setError(e instanceof Error ? e.message : "Import failed");
      }
    };

    testImports();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SurveyJS Import Test</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Import Status</h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <span className="w-32 font-medium">survey-core Model:</span>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  imports.Model === "function"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {imports.Model || "Not loaded"}
              </span>
            </div>

            <div className="flex items-center">
              <span className="w-32 font-medium">
                survey-analytics Tabulator:
              </span>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  imports.Tabulator === "function"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {imports.Tabulator || "Not loaded"}
              </span>
            </div>

            <div className="flex items-center">
              <span className="w-32 font-medium">jsPDF:</span>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  imports.jsPDF === "function"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {imports.jsPDF || "Not loaded"}
              </span>
            </div>

            <div className="flex items-center">
              <span className="w-32 font-medium">XLSX:</span>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  imports.XLSX === "object"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {imports.XLSX ? "Loaded" : "Not loaded"}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-medium mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Check browser console for detailed import logs</li>
              <li>If all imports succeed, test the TableView component</li>
              <li>If imports fail, check package versions and compatibility</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Table Test</h2>
          <SimpleTableView />
        </div>
      </div>
    </div>
  );
}
