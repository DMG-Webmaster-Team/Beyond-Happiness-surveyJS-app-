"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Model } from "survey-core";
import "survey-core/i18n/english";
// Import CSS files
import "tabulator-tables/dist/css/tabulator.css";
import "survey-analytics/survey.analytics.tabulator.css";
import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import * as XLSX from "xlsx";

// Apply jsPDF plugin
applyPlugin(jsPDF);

type SurveyDoc = { id: string; title?: string; json: any };

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

export default function TableView({
  surveyId,
  surveyTitle,
}: {
  surveyId: string;
  surveyTitle?: string;
}) {
  const containerId = "surveyDataTable";
  const panelRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [schema, setSchema] = useState<any | null>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load schema & results
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const survey: SurveyDoc = await fetchJSON(`/api/surveys/${surveyId}`);
        const resultsResponse = await fetchJSON(
          `/api/results?surveyId=${surveyId}`
        );

        const results = (resultsResponse as any).items || resultsResponse;

        if (!cancelled) {
          // Validate survey schema
          if (
            !survey.json ||
            !survey.json.pages ||
            !Array.isArray(survey.json.pages)
          ) {
            throw new Error("Invalid survey schema: missing pages array");
          }

          // Ensure results is an array
          if (!Array.isArray(results)) {
            console.warn("Results is not an array:", results);
            setRows([]);
            setSchema(survey.json);
            return;
          }

          // Transform results to match SurveyJS expected format
          const transformedResults = results.map((result) => {
            // Parse the JSON string from result.data
            let responseData = {};
            try {
              responseData =
                typeof result.data === "string"
                  ? JSON.parse(result.data)
                  : result.data;
            } catch (error) {
              console.warn("Failed to parse result data:", error);
              responseData = {};
            }

            // Add metadata fields that SurveyJS might need
            return {
              ...responseData,
              _userId: result.userId,
              _submittedAt: result.submittedAt,
              _adminId: result.adminId,
              _resultId: result.id,
            };
          });

          setSchema(survey.json);
          setRows(transformedResults);
        }
      } catch (e) {
        console.error("Failed to load table data", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const model = useMemo(() => {
    if (!schema) return null;

    try {
      const surveyModel = new Model(schema);
      return surveyModel;
    } catch (error) {
      setError("Failed to create survey model");
      return null;
    }
  }, [schema]);

  // Initialize Table View once
  useEffect(() => {
    if (!containerRef.current || panelRef.current) return;
    if (!model || !rows) return;

    const initializeTable = async () => {
      try {
        // Dynamically import SurveyJS components (client-only)
        const { Tabulator: SurveyTable } = await import(
          "survey-analytics/survey.analytics.tabulator"
        );

        const table = new SurveyTable(model, rows, {
          jspdf: jsPDF,
          xlsx: XLSX,
        });
        panelRef.current = table;
        table.render(containerId);
      } catch (error) {
        setError("Failed to initialize table view");
      }
    };

    initializeTable();

    return () => {
      try {
        (panelRef.current as any)?.destroy?.();
      } catch (e) {
        console.warn("Error destroying table:", e);
      }
      try {
        (panelRef.current as any)?.dispose?.();
      } catch (e) {
        console.warn("Error disposing table:", e);
      }
      panelRef.current = null;
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    };
  }, [model, rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error Loading Table</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 text-xl mb-4">No Data Available</div>
          <p className="text-gray-400">This survey has no responses yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Survey Title */}
      {surveyTitle && (
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">{surveyTitle}</h2>
          <p className="text-gray-600 mt-2">Survey Data Table View</p>
        </div>
      )}

      {/* SurveyJS Table Container */}
      <div
        ref={containerRef}
        id={containerId}
        className="min-h-[400px] border-2 border-dashed border-gray-300"
      />
    </div>
  );
}
