"use client";

import { useEffect, useRef, useState } from "react";
import HappinessReportExporter, {
  HappinessReportExporterHandle,
} from "@/components/HappinessReportExporter";

export default function SvgPreviewPage({ params }: { params: { surveyId: string } }) {
  const exporterRef = useRef<HappinessReportExporterHandle>(null);
  const [result, setResult] = useState<any>(null);
  const [unified, setUnified] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const surveyId = params.surveyId;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Load result from localStorage first
        const stored = localStorage.getItem(`happiness:lastResult:${surveyId}`);
        let resObj: any = stored ? JSON.parse(stored) : null;

        if (!resObj) {
          // Fallback to API if needed (optional endpoint; if not available, keep localStorage only)
          try {
            const r = await fetch(`/api/happiness/results?surveyId=${surveyId}`);
            if (r.ok) {
              resObj = await r.json();
            }
          } catch {}
        }

        setResult(resObj);

        // Unified scoring to match results page
        if (resObj?.answers?.length) {
          const u = await fetch("/api/happiness/unified-scoring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: resObj.answers, language: "en" }),
          });
          if (u.ok) {
            const data = await u.json();
            setUnified(data.data);
          } else {
            setUnified(null);
          }
        } else {
          setUnified(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [surveyId]);

  const onExport = async () => {
    await exporterRef.current?.exportHappinessChartsAsSVG(`happiness-result-${surveyId}.svg`);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">SVG Preview & Export</h1>
        <p className="text-gray-600 mb-6">
          This page renders an off-screen clone of the results layout and lets you export a pixel-perfect SVG.
        </p>
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onExport}
            disabled={loading || !result || !unified}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
          >
            {loading ? "Preparing..." : "Export as SVG"}
          </button>
        </div>

        {/* Optional tiny preview of final result meta */}
        {result && unified ? (
          <div className="text-sm text-gray-700 mb-4">
            <div>Character: {result.character?.nameEn || result.character?.name}</div>
            <div>Overall: {unified.overallPercentage}%</div>
          </div>
        ) : null}
      </div>

      {/* Off-screen exporter container */}
      {result && unified ? (
        <HappinessReportExporter ref={exporterRef} result={result} unified={unified} surveyTitle="Happiness Survey" />
      ) : null}
    </div>
  );
}



