"use client";

import useSWR from "swr";
import PDFExportButton from "@/components/PDFExportButton";

interface PDFExportModalProps {
  surveyId: string;
  isOpen: boolean;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PDFExportModal({
  surveyId,
  isOpen,
  onClose,
}: PDFExportModalProps) {
  const { data, error, isLoading } = useSWR(
    surveyId ? `/api/surveys/${surveyId}` : null,
    fetcher
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-blue-400 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-black hover:text-gray-700 p-2"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="text-xl text-black font-semibold pr-8">
            Export Survey to PDF
          </h2>
          {data?.title && (
            <h5 className="text-md text-black opacity-90 mt-1">{data.title}</h5>
          )}
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Loading survey...</div>
          ) : error || !data ? (
            <div className="text-center py-8 text-red-600">
              Failed to load survey.
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <PDFExportButton surveyJson={data.json}>
                  Export Survey to PDF
                </PDFExportButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
