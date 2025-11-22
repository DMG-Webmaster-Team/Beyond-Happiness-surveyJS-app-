"use client";

import { useState } from "react";
import { motion } from "motion/react";
// Local fallback filename generator (replaces legacy jsPDF helper)
function getSafePdfFilename(
  characterName: string,
  language: "en" | "ar" = "en"
): string {
  const clean = characterName
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
  return `${clean || "Character"}_Happiness_Report.pdf`;
}

interface HappinessResult {
  id?: string;
  surveyId: string;
  code: string;
  character: {
    id: number;
    nameEn: string;
    nameAr: string;
    description: string;
    detailedDescription?: string;
    avatarUrl: string;
  };
  categoryTotals: {
    Meaning: number;
    Delight: number;
    Freedom: number;
    Engagement: number;
    Vitality: number;
  };
  essentialTotals?: Record<string, number>;
}

interface DownloadPDFButtonProps {
  result: HappinessResult;
  language?: "en" | "ar";
  userName?: string;
  surveyTitle?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export default function DownloadPDFButton({
  result,
  language = "en",
  userName,
  surveyTitle,
  className = "",
  variant = "primary",
  size = "md",
}: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multilingual button text
  const buttonTexts = {
    download: {
      en: "Download Your Report",
      ar: "تحميل التقرير الخاص بك",
    },
    generating: {
      en: "Generating PDF...",
      ar: "جاري إنشاء ملف PDF...",
    },
    error: {
      en: "Failed to generate PDF",
      ar: "فشل في إنشاء ملف PDF",
    },
    retry: {
      en: "Retry Download",
      ar: "إعادة المحاولة",
    },
  };

  const getText = (key: keyof typeof buttonTexts) => {
    return buttonTexts[key][language] || buttonTexts[key].en;
  };

  // Button styling based on variant and size
  const getButtonClasses = () => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeClasses = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const variantClasses = {
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-md hover:shadow-lg",
      secondary:
        "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 shadow-md hover:shadow-lg",
      outline:
        "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500",
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      console.log("🔄 Generating PDF for character:", language === "ar" ? result.character.nameAr : result.character.nameEn);

      // Get answers from localStorage or result object for accurate subtype calculation
      const getStoredAnswers = () => {
        try {
          // First try localStorage
          const storedAnswers = localStorage.getItem(
            `happiness:answers:${result.surveyId}`
          );
          if (storedAnswers) {
            return JSON.parse(storedAnswers);
          }

          // Fallback to result object
          if (
            (result as any).answers &&
            Array.isArray((result as any).answers)
          ) {
            return (result as any).answers;
          }

          return [];
        } catch (error) {
          console.error("Error getting stored answers:", error);
          return [];
        }
      };

      // Use new stateless approach - pass result data directly with answers
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";

      const response = await fetch(`${baseUrl}/api/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: {
            id: result.id,
            surveyId: result.surveyId,
            code: result.code,
            character: result.character,
            categoryTotals: result.categoryTotals,
            essentialTotals: result.essentialTotals,
            answers: getStoredAnswers(), // Include answers for accurate subtype calculation
          },
          lang: language,
        }),
      });

      if (!response.ok) {
        let msg = "Failed to generate PDF";
        try {
          const text = await response.text();
          msg = text || msg;
        } catch {}
        throw new Error(msg);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();

      // Extract filename from response headers or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : getSafePdfFilename(language === "ar" ? result.character.nameAr : result.character.nameEn, language);

      console.log("📄 PDF generated successfully, downloading as:", filename);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Track download event (optional)
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "pdf_download", {
          event_category: "happiness_survey",
          event_label: language === "ar" ? result.character.nameAr : result.character.nameEn,
          character_code: result.code,
          language: language,
        });
      }
    } catch (err) {
      console.error("❌ Failed to generate PDF:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDownload}
        disabled={isGenerating}
        className={getButtonClasses()}
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {/* Download Icon */}
        <svg
          className={`w-5 h-5 ${language === "ar" ? "ml-2" : "mr-2"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isGenerating ? (
            // Loading spinner
            <motion.path
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          ) : (
            // Download icon
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          )}
        </svg>

        {/* Button Text */}
        {isGenerating
          ? getText("generating")
          : error
          ? getText("retry")
          : getText("download")}
      </motion.button>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-600 text-sm text-center max-w-xs"
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          {getText("error")}: {error}
        </motion.div>
      )}

      {/* Success Message (optional) */}
      {!isGenerating && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className="text-gray-500 text-xs text-center"
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          {language === "ar"
            ? "سيتم تحميل ملف PDF تلقائياً"
            : "PDF will download automatically"}
        </motion.div>
      )}
    </div>
  );
}

// Export types for use in other components
export type { DownloadPDFButtonProps, HappinessResult };
