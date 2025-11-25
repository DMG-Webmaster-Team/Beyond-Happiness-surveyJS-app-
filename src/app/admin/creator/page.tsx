"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import useSWR, { mutate } from "swr";
import AdminNavbar from "@/components/shared/AdminNavbar";
import CompanySelect from "@/components/shared/CompanySelect";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";

// Dynamically import SurveyJS Creator to avoid SSR issues
const SurveyCreatorComponent = nextDynamic(
  () =>
    import("survey-creator-react").then((mod) => mod.SurveyCreatorComponent),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-lg">Loading survey creator...</div>
      </div>
    ),
  }
);

interface Survey {
  id: string;
  title: string;
  description: string;
  canTakeMultiple: boolean;
  isAnonymous: boolean;
  companyId?: string;
  companyName?: string;
  json: any;
}

// Error Boundary for SurveyJS Creator
class SurveyCreatorErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SurveyCreator Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">
              Survey Creator Error
            </div>
            <div className="text-gray-600 text-sm mb-4">
              There was an issue loading the survey creator. Please try
              refreshing the page.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch survey");
    return res.json();
  });

// Function to add custom language flow pages
const addCustomLanguageFlow = (creator: any) => {
  if (!creator || !creator.survey) {
    console.error("Creator or survey not available");
    return;
  }

  try {
    // Import Survey from survey-core for page creation
    const Survey = require("survey-core");

    // Page 1: Language Selection
    const languageSelectionPage = new Survey.PageModel("languageSelectionPage");

    const languageQuestion = new Survey.QuestionRadiogroupModel(
      "languageChoice"
    );
    languageQuestion.title = "Select Language / اختر اللغة";
    languageQuestion.isRequired = true;
    languageQuestion.choices = [
      { value: "arabic", text: "العربية" },
      { value: "english", text: "English" },
    ];

    languageSelectionPage.addElement(languageQuestion);

    // Arabic Pages (Multiple pages support)
    const arabicPages = [];

    // Arabic Page 1
    const arabicPage1 = new Survey.PageModel("arabicPage1");
    arabicPage1.title = "الصفحة العربية الأولى";
    arabicPage1.visibleIf = "{languageChoice} = 'arabic'";

    const arabicQuestion1 = new Survey.QuestionTextModel("arabicFeedback1");
    arabicQuestion1.title = "ما رأيك في خدماتنا؟";
    arabicQuestion1.isRequired = true;
    arabicPage1.addElement(arabicQuestion1);
    arabicPages.push(arabicPage1);

    // Arabic Page 2 (Additional page)
    const arabicPage2 = new Survey.PageModel("arabicPage2");
    arabicPage2.title = "الصفحة العربية الثانية";
    arabicPage2.visibleIf = "{languageChoice} = 'arabic'";

    const arabicQuestion2 = new Survey.QuestionRadiogroupModel("arabicRating");
    arabicQuestion2.title = "كيف تقيم تجربتك معنا؟";
    arabicQuestion2.choices = [
      { value: "excellent", text: "ممتاز" },
      { value: "good", text: "جيد" },
      { value: "average", text: "متوسط" },
      { value: "poor", text: "ضعيف" },
    ];
    arabicQuestion2.isRequired = true;
    arabicPage2.addElement(arabicQuestion2);
    arabicPages.push(arabicPage2);

    // Arabic Page 3 (Additional page)
    const arabicPage3 = new Survey.PageModel("arabicPage3");
    arabicPage3.title = "الصفحة العربية الثالثة";
    arabicPage3.visibleIf = "{languageChoice} = 'arabic'";

    const arabicQuestion3 = new Survey.QuestionCommentModel(
      "arabicSuggestions"
    );
    arabicQuestion3.title = "هل لديك أي اقتراحات للتحسين؟";
    arabicQuestion3.isRequired = false;
    arabicPage3.addElement(arabicQuestion3);
    arabicPages.push(arabicPage3);

    // English Pages (Multiple pages support)
    const englishPages = [];

    // English Page 1
    const englishPage1 = new Survey.PageModel("englishPage1");
    englishPage1.title = "English Page 1";
    englishPage1.visibleIf = "{languageChoice} = 'english'";

    const englishQuestion1 = new Survey.QuestionTextModel("englishFeedback1");
    englishQuestion1.title = "What do you think about our services?";
    englishQuestion1.isRequired = true;
    englishPage1.addElement(englishQuestion1);
    englishPages.push(englishPage1);

    // English Page 2 (Additional page)
    const englishPage2 = new Survey.PageModel("englishPage2");
    englishPage2.title = "English Page 2";
    englishPage2.visibleIf = "{languageChoice} = 'english'";

    const englishQuestion2 = new Survey.QuestionRadiogroupModel(
      "englishRating"
    );
    englishQuestion2.title = "How would you rate your experience with us?";
    englishQuestion2.choices = [
      { value: "excellent", text: "Excellent" },
      { value: "good", text: "Good" },
      { value: "average", text: "Average" },
      { value: "poor", text: "Poor" },
    ];
    englishQuestion2.isRequired = true;
    englishPage2.addElement(englishQuestion2);
    englishPages.push(englishPage2);

    // English Page 3 (Additional page)
    const englishPage3 = new Survey.PageModel("englishPage3");
    englishPage3.title = "English Page 3";
    englishPage3.visibleIf = "{languageChoice} = 'english'";

    const englishQuestion3 = new Survey.QuestionCommentModel(
      "englishSuggestions"
    );
    englishQuestion3.title = "Do you have any suggestions for improvement?";
    englishQuestion3.isRequired = false;
    englishPage3.addElement(englishQuestion3);
    englishPages.push(englishPage3);

    // Add all pages to survey
    creator.survey.addPage(languageSelectionPage);

    // Add Arabic pages
    arabicPages.forEach((page) => creator.survey.addPage(page));

    // Add English pages
    englishPages.forEach((page) => creator.survey.addPage(page));

    // Configure survey navigation and appearance for Multi Language surveys using proper SurveyJS settings
    creator.survey.title = ""; // Remove survey title
    creator.survey.showTitle = false; // Hide survey title completely
    creator.survey.showPageTitles = false; // Hide all page titles
    creator.survey.showNavigationButtons = true; // Enable navigation buttons
    creator.survey.showNavigationButtonsOnTop = false; // Hide top navigation buttons
    creator.survey.showNavigationButtonsOnBottom = true; // Show bottom navigation buttons only
    creator.survey.showPreviewBeforeComplete = "noPreview"; // Remove preview button
    creator.survey.showCompletedPage = false; // Don't show completed page
    creator.survey.completeText = "Complete"; // Set complete button text

    creator.survey.goNextPageAutomatic = false; // Don't auto-advance
    creator.survey.showQuestionNumbers = "off"; // Hide question numbers

    // Add a marker to identify this as a multi-language survey
    creator.survey.setVariable("isMultiLanguageSurvey", true);

    // Update the creator's JSON to reflect changes
    creator.JSON = creator.survey.toJSON();

    // Add CSS to hide any remaining UI elements for multi-language surveys
    setTimeout(() => {
      const addMultiLanguageStyles = () => {
        let styleElement = document.getElementById("multilang-survey-styles");
        if (!styleElement) {
          styleElement = document.createElement("style");
          styleElement.id = "multilang-survey-styles";
          document.head.appendChild(styleElement);
        }

        styleElement.textContent = `
  /* Minimal CSS for multi-language surveys - only handle edge cases */
  
  /* Hide any top footer that might still appear despite SurveyJS settings */
  .sv-survey[data-multilang="true"] .sv-footer.sv-footer-top {
    display: none !important;
  }

  /* Hide action buttons that might appear in headers */
  .sv-survey[data-multilang="true"] .sv-action--edit,
  .sv-survey[data-multilang="true"] .sv-action--preview,
  .sv-survey[data-multilang="true"] .sv-header__actions {
    display: none !important;
  }

  /* Ensure clean content area */
  .sv-survey[data-multilang="true"] .sv-body {
    padding-top: 0 !important;
  }

  /* Style bottom navigation for better appearance */
  .sv-survey[data-multilang="true"] .sv-footer {
    margin-top: 20px !important;
  }

  /* Enhanced Multi Language toolbox button styling */
  .multi-language-toolbox-btn .svc-toolbox__item-icon {
    background: #f8f9fa !important;
    border-radius: 4px !important;
    border: 1px solid #e9ecef !important;
  }

  .multi-language-toolbox-btn:hover .svc-toolbox__item-icon {
    background: #e9ecef !important;
    border-color: #0067E6 !important;
  }

  /* RTL Support for Arabic pages */
  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] {
    direction: rtl !important;
    text-align: right !important;
  }

  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] .sv-question {
    direction: rtl !important;
    text-align: right !important;
  }

  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] .sv-question__title {
    text-align: right !important;
  }

  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] input,
  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] textarea,
  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] select {
    direction: rtl !important;
    text-align: right !important;
  }

  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] .sv-selectbase__item {
    direction: rtl !important;
    text-align: right !important;
    justify-content: flex-end !important;
  }

  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] .sv-selectbase__item-text {
    text-align: right !important;
    margin-right: 8px !important;
    margin-left: 0 !important;
  }

  /* Ensure radio buttons and checkboxes align properly in RTL */
  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] .sv-selectbase__item-control {
    order: 2 !important;
  }

  .sv-survey[data-multilang="true"] .sv-page[data-name*="arabic"] .sv-selectbase__item-text {
    order: 1 !important;
  }
`;
      };

      addMultiLanguageStyles();
    }, 100);

    console.log(
      "Custom language flow added successfully with multiple pages support"
    );
  } catch (error) {
    console.error("Error adding custom language flow:", error);
  }
};

export default function AdminCreator() {
  const [creator, setCreator] = useState<any>(null);
  const [localSurvey, setLocalSurvey] = useState<Survey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isCreatorReady, setIsCreatorReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [newSurveySettings, setNewSurveySettings] = useState({
    canTakeMultiple: false,
    isAnonymous: false,
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("surveyId") || searchParams.get("id");

  // Use SWR to fetch survey data with live updates
  const {
    data: survey,
    error: fetchError,
    isLoading,
  } = useSWR<Survey>(idParam ? `/api/surveys/${idParam}` : null, fetcher, {
    refreshInterval: 3000, // Refresh every 3 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem("admin");
    if (!adminData) {
      router.push("/admin/login");
      return;
    }

    // Initialize creator only on client side
    const initCreator = async () => {
      try {
        // Check if we're in the browser and component is mounted
        if (typeof window === "undefined" || !mounted) return;

        // Set SurveyJS license
        const { setSurveyJSLicense } = await import("@/lib/surveyjs-config");
        setSurveyJSLicense();

        const { SurveyCreator } = await import("survey-creator-react");

        const creatorOptions = {
          showLogicTab: true,
          isAutoSave: false,
          showJSONEditorTab: true,
          showTestSurveyTab: false,
        };

        const newCreator = new SurveyCreator(creatorOptions);

        // Configure save function
        newCreator.saveSurveyFunc = (
          no: number,
          callback: (num: number, status: boolean) => void
        ) => {
          callback(no, true);
        };

        // Set default theme colors to #0067E6
        setTimeout(() => {
          try {
            // Set the theme colors programmatically
            if (newCreator.theme) {
              newCreator.theme.colorPalette = "light";
              newCreator.theme.isPanelless = false;

              // Set primary color
              if (newCreator.theme.cssVariables) {
                newCreator.theme.cssVariables["--svc-primary-color"] =
                  "#0067E6";
                newCreator.theme.cssVariables[
                  "--svc-primary-foreground-color"
                ] = "#ffffff";
              }
            }

            // Also set survey theme colors
            if (newCreator.survey && newCreator.survey.applyTheme) {
              newCreator.survey.applyTheme({
                colorPalette: "light",
                cssVariables: {
                  "--primary-color": "#0067E6",
                  "--primary-foreground-color": "#ffffff",
                  "--primary-color-light": "#E6F3FF",
                  "--primary-color-dark": "#0052B8",
                },
              });
            }
          } catch (error) {
            console.log("Theme setting fallback - using CSS overrides");
          }
        }, 100);

        // Add Multi Language button to SurveyJS Creator toolbox
        setTimeout(() => {
          try {
            console.log(
              "🎯 Adding Multi Language button to Creator toolbox..."
            );
            console.log("Creator toolbox available:", !!newCreator.toolbox);

            if (newCreator && newCreator.toolbox) {
              // Add to toolbox using General category and force to top position
              const toolboxItem = {
                name: "multilanguage",
                title: "Multi Language",
                svgIcon: `<svg xmlns='http://www.w3.org/2000/svg' fill='#0067E6' viewBox='0 0 24 24' width='18' height='18'><path d='M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z'/></svg>`,
                category: "General", // Move it to top category
                isCopied: false,
                json: {
                  type: "html", // Use valid HTML type to avoid getType errors
                  name: "multilanguage_placeholder",
                  html: "<div style='text-align: center; color: #0067E6; font-weight: bold;'>🌐 Multi Language</div>",
                  title: "Multi Language Selector",
                },
              };

              newCreator.toolbox.addItem(toolboxItem, 0); // 👈 This '0' ensures it's inserted at the first position
              console.log(
                "✅ Multi Language item added to toolbox at top position (General category, index 0)"
              );

              // Debug: Check toolbox item positions
              setTimeout(() => {
                console.log(
                  "🔍 Toolbox items order:",
                  newCreator.toolbox.items.map((i) => i.name)
                );
                console.log(
                  "🔍 Multi Language position:",
                  newCreator.toolbox.items.findIndex(
                    (i) => i.name === "multilanguage"
                  )
                );
              }, 100);

              // Override behavior when this item is added to survey
              newCreator.onQuestionAdded.add((sender: any, options: any) => {
                if (
                  options.question &&
                  options.question.name &&
                  options.question.name.includes("multilanguage_placeholder")
                ) {
                  console.log(
                    "🎯 Multi Language item detected - replacing with custom flow"
                  );

                  // Remove the placeholder question immediately
                  setTimeout(() => {
                    try {
                      if (options.question.parent) {
                        options.question.parent.removeElement(options.question);
                      } else if (options.question.survey) {
                        options.question.survey
                          .getAllQuestions()
                          .forEach((q: any) => {
                            if (
                              q.name &&
                              q.name.includes("multilanguage_placeholder")
                            ) {
                              q.delete();
                            }
                          });
                      }

                      // Execute our custom language flow
                      addCustomLanguageFlow(newCreator);
                    } catch (removeError) {
                      console.error(
                        "Error removing placeholder question:",
                        removeError
                      );
                      // Still execute the language flow even if removal fails
                      addCustomLanguageFlow(newCreator);
                    }
                  }, 50);
                }
              });

              console.log("✅ Multi Language behavior override registered");
            } else {
              console.log("❌ Creator toolbox not available");
            }
          } catch (error) {
            console.error(
              "❌ Error adding Multi Language button to toolbox:",
              error
            );
          }
        }, 1000);

        // Apply custom primary color #0067E6
        setTimeout(() => {
          const applyCustomColors = () => {
            // Create or update custom style element
            let styleElement = document.getElementById(
              "surveyjs-custom-colors"
            );
            if (!styleElement) {
              styleElement = document.createElement("style");
              styleElement.id = "surveyjs-custom-colors";
              document.head.appendChild(styleElement);
            }

            styleElement.textContent = `
              /* Primary color overrides for SurveyJS Creator */
              :root {
                --svc-primary-color: #0067E6 !important;
                --svc-primary-foreground-color: #ffffff !important;
                --primary-color: #0067E6 !important;
                --primary-light: #E6F3FF !important;
                --primary-dark: #0052B8 !important;
              }

              /* SurveyJS Creator primary color overrides */
              .svc-creator {
                --svc-primary-color: #0067E6 !important;
                --svc-primary-foreground-color: #ffffff !important;
                --primary: #0067E6 !important;
                --primary-light: #E6F3FF !important;
                --primary-foreground: #ffffff !important;
              }

              /* Creator Settings Panel */
              .svc-creator-settings {
                --svc-primary-color: #0067E6 !important;
              }

              /* Theme Settings - Primary Color Display */
              .svc-creator-settings .spg-color-editor__color-swatch {
                background-color: #0067E6 !important;
              }

              /* Color picker and inputs in settings */
              .svc-creator-settings input[type="color"] {
                background-color: #0067E6 !important;
              }

              /* Toolbox active states */
              .svc-toolbox__item:hover,
              .svc-toolbox__item--active {
                background-color: #E6F3FF !important;
                border-color: #0067E6 !important;
              }

              /* Tab active states */
              .svc-tab-designer--active,
              .svc-tab-logic--active,
              .svc-tab-json-editor--active {
                color: #0067E6 !important;
                border-bottom-color: #0067E6 !important;
              }

              /* Buttons */
              .svc-button--primary,
              .sv-action-bar-item--primary {
                background-color: #0067E6 !important;
                border-color: #0067E6 !important;
              }

              .svc-button--primary:hover,
              .sv-action-bar-item--primary:hover {
                background-color: #0052B8 !important;
                border-color: #0052B8 !important;
              }

              /* Property grid */
              .spg-panel__title--expanded {
                color: #0067E6 !important;
              }

              /* Survey elements */
              .sv-question__title {
                color: #0067E6 !important;
              }

              /* Focus states */
              .sv-text:focus,
              .sv-dropdown:focus,
              input:focus,
              textarea:focus {
                border-color: #0067E6 !important;
                box-shadow: 0 0 0 2px rgba(0, 103, 230, 0.2) !important;
              }

              /* Checkboxes and radio buttons */
              .sv-checkbox__svg,
              .sv-radio__svg {
                fill: #0067E6 !important;
              }

              /* Progress bar */
              .sv-progress__bar {
                background-color: #0067E6 !important;
              }

              /* Links */
              .sv-link,
              .svc-link {
                color: #0067E6 !important;
              }

              .sv-link:hover,
              .svc-link:hover {
                color: #0052B8 !important;
              }

              /* Settings panel color values */
              .spg-color-editor__input {
                color: #0067E6 !important;
              }

              /* Ensure settings show the correct primary color */
              .svc-creator-settings [data-name="primaryColor"] .spg-color-editor__color-swatch,
              .svc-creator-settings [data-name="primary"] .spg-color-editor__color-swatch {
                background-color: #0067E6 !important;
              }

              /* Custom language button styling */
              .custom-language-btn {
                border: 1px solid transparent !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                z-index: 1000 !important;
                min-height: 48px !important;
                width: 100% !important;
              }

              .custom-language-btn:hover {
                background-color: #E6F3FF !important;
                border-color: #0067E6 !important;
              }

              .custom-language-btn .svc-toolbox__item-icon svg {
                fill: #0067E6 !important;
                width: 24px !important;
                height: 24px !important;
              }

              .custom-language-btn:hover .svc-toolbox__item-icon svg {
                fill: #0052B8 !important;
              }

              /* Ensure proper spacing and alignment */
              .custom-language-btn .svc-toolbox__item-container {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 12px 8px !important;
                width: 100% !important;
                box-sizing: border-box !important;
              }

              .custom-language-btn .svc-toolbox__item-banner {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important;
              }

              .custom-language-btn .svc-toolbox__item-icon {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 24px !important;
                height: 24px !important;
              }

              /* Prevent the button from being hidden by SurveyJS */
              .svc-toolbox .custom-language-btn {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* Force visibility in all states */
              .custom-language-btn[data-persistent="true"] {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* Multi Language toolbar item styling */
              .svc-toolbar-item--multi-language {
                color: #0067E6 !important;
              }

              .svc-toolbar-item--multi-language:hover {
                background-color: #E6F3FF !important;
                color: #0052B8 !important;
              }

              .svc-toolbar-item--multi-language .svc-toolbar-item__icon {
                fill: #0067E6 !important;
              }

              .svc-toolbar-item--multi-language:hover .svc-toolbar-item__icon {
                fill: #0052B8 !important;
              }

              /* Sidebar item styling for Multi Language */
              .svc-side-bar__item[data-sv-drop-target-item-value="multi-language"] {
                color: #0067E6 !important;
              }

              .svc-side-bar__item[data-sv-drop-target-item-value="multi-language"]:hover {
                background-color: #E6F3FF !important;
                color: #0052B8 !important;
              }

              /* Multi Language toolbox button styling */
              .multi-language-toolbox-btn {
                border: 1px solid transparent !important;
                transition: all 0.2s ease !important;
              }

              .multi-language-toolbox-btn:hover {
                background-color: #E6F3FF !important;
                border-color: #0067E6 !important;
              }

              .multi-language-toolbox-btn .svc-toolbox__item-icon {
                font-size: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }

              .multi-language-toolbox-btn .svc-toolbox__item-title {
                color: #0067E6 !important;
                font-weight: 500 !important;
                text-align: center !important;
              }

              .multi-language-toolbox-btn:hover .svc-toolbox__item-title {
                color: #0052B8 !important;
              }

              /* Ensure proper spacing like other toolbox items */
              .multi-language-toolbox-btn .svc-toolbox__item-container {
                padding: 8px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 4px !important;
              }

              .multi-language-toolbox-btn .svc-toolbox__item-banner {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-bottom: 4px !important;
              }
            `;

            console.log("✅ Custom primary color #0067E6 applied");
          };

          applyCustomColors();
        }, 500);

        // Initialize with empty survey to prevent undefined errors
        if (!newCreator.JSON || Object.keys(newCreator.JSON).length === 0) {
          newCreator.JSON = {
            title: "Untitled Survey",
            pages: [
              {
                name: "page1",
                elements: [],
              },
            ],
          };
        }

        // Wait a bit to ensure the creator is fully initialized
        setTimeout(() => {
          // Ensure creator has a valid survey object
          if (newCreator.survey) {
            setCreator(newCreator);
            setIsCreatorReady(true);
            console.log("SurveyCreator initialized successfully");
          } else {
            console.error("Creator survey object not properly initialized");
            setError("Failed to initialize survey creator properly");
          }
        }, 150);
      } catch (error) {
        console.error("Failed to initialize SurveyCreator:", error);
        setError("Failed to initialize survey creator");
      }
    };

    initCreator();
  }, [router, mounted]);

  // Initialize local survey state from SWR data (only once per survey)
  useEffect(() => {
    if (survey && (!localSurvey || localSurvey.id !== survey.id)) {
      console.log("Setting local survey:", survey.title, survey.id);
      setLocalSurvey(survey);

      // Set company if survey has one
      if (survey.companyId) {
        setSelectedCompanyId(survey.companyId);
      }
    }
  }, [survey, localSurvey]);

  // Keep creator JSON synced from loaded survey (only when both creator and survey are ready)
  useEffect(() => {
    if (survey && creator && isCreatorReady) {
      try {
        console.log(
          "Loading survey data into creator:",
          survey.title,
          survey.json
        );

        // Use a small delay to ensure creator is ready for JSON updates
        setTimeout(() => {
          try {
            // Ensure the survey JSON has required structure
            const validSurveyJson = {
              title: survey.json.title || "Untitled Survey",
              pages: survey.json.pages || [
                {
                  name: "page1",
                  elements: survey.json.elements || [],
                },
              ],
              ...survey.json,
            };

            creator.JSON = validSurveyJson;

            // Also update the creator's text if it exists
            if (creator.text) {
              creator.text = JSON.stringify(validSurveyJson, null, 2);
            }

            console.log("Survey data loaded successfully");
          } catch (error) {
            console.error("Error setting creator JSON:", error);
            setError("Failed to load survey data into creator");
          }
        }, 50);

        setLocalSurvey(survey);
      } catch (error) {
        console.error("Error loading survey into creator:", error);
        setError("Failed to load survey data");
      }
    }
  }, [survey, creator, isCreatorReady]);

  // Note: Title and description are now managed entirely by the SurveyJS Creator
  // No need to sync these fields since they're removed from Survey Settings

  // Note: No reverse sync needed since title and description are managed entirely by SurveyJS Creator

  const handleSave = async () => {
    if (!creator) return;

    setSaving(true);
    setError("");

    try {
      const adminData = JSON.parse(localStorage.getItem("admin") || "{}");
      const surveyJson = creator.JSON;

      // Get company name if company is selected
      let companyName = null;
      if (selectedCompanyId) {
        try {
          const companyResponse = await fetch(
            `/api/companies/${selectedCompanyId}`
          );
          if (companyResponse.ok) {
            const companyData = await companyResponse.json();
            companyName = companyData.name;
          }
        } catch (error) {
          console.error("Error fetching company name:", error);
        }
      }

      const surveyData = {
        title: surveyJson.title || localSurvey?.title || "Untitled Survey",
        description: surveyJson.description || localSurvey?.description || "",
        canTakeMultiple:
          localSurvey?.canTakeMultiple ?? newSurveySettings.canTakeMultiple,
        isAnonymous: localSurvey?.isAnonymous ?? newSurveySettings.isAnonymous,
        companyId: selectedCompanyId,
        companyName: companyName,
        adminId: adminData.id,
        json: surveyJson,
      };

      let response: Response;
      if (idParam) {
        // Update existing survey
        response = await fetch(`/api/surveys/${idParam}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(surveyData),
        });
      } else {
        // Create new survey
        response = await fetch("/api/surveys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(surveyData),
        });
      }

      if (response.ok) {
        const result = await response.json();
        // Trigger revalidation of all survey data
        await mutate(`/api/surveys/${idParam || result.id}`);
        router.push("/admin/dashboard");
      } else {
        setError("Failed to save survey");
      }
    } catch (error) {
      setError("An error occurred while saving the survey");
    } finally {
      setSaving(false);
    }
  };

  if ((isLoading && idParam) || !isCreatorReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading survey creator...</div>
      </div>
    );
  }

  if (fetchError) {
    setError(fetchError.message);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {idParam ? "Edit Survey" : "Create New Survey"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Use the SurveyJS Creator to design your survey
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Survey"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Survey Settings */}
        <div className="mb-6 px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Survey Settings
            </h3>
            <div className="space-y-4">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <CompanySelect
                  value={selectedCompanyId}
                  onChange={setSelectedCompanyId}
                  allowNone={true}
                  placeholder="Select a company (optional)"
                  className="max-w-xs"
                />
              </div> */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      localSurvey
                        ? localSurvey.canTakeMultiple
                        : newSurveySettings.canTakeMultiple
                    }
                    onChange={(e) => {
                      if (localSurvey) {
                        setLocalSurvey({
                          ...localSurvey,
                          canTakeMultiple: e.target.checked,
                        });
                      } else {
                        setNewSurveySettings({
                          ...newSurveySettings,
                          canTakeMultiple: e.target.checked,
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Allow multiple submissions per user
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      localSurvey
                        ? localSurvey.isAnonymous
                        : newSurveySettings.isAnonymous
                    }
                    onChange={(e) => {
                      if (localSurvey) {
                        setLocalSurvey({
                          ...localSurvey,
                          isAnonymous: e.target.checked,
                        });
                      } else {
                        setNewSurveySettings({
                          ...newSurveySettings,
                          isAnonymous: e.target.checked,
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Anonymous survey (no login required)
                  </span>
                </label>
                <p className="ml-6 mt-1 text-xs text-gray-500">
                  When enabled, anyone with the link can take this survey
                  without logging in. Assignment checks and one-time limits are
                  ignored.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Survey Creator */}
        <div className="px-4 sm:px-0">
          <div
            className="bg-white shadow rounded-lg"
            style={{ height: "70vh" }}
          >
            {creator &&
            isCreatorReady &&
            mounted &&
            (!idParam || (idParam && localSurvey)) ? (
              <SurveyCreatorErrorBoundary>
                <SurveyCreatorComponent
                  creator={creator}
                  key={`creator-${localSurvey?.id || "new"}-${isCreatorReady}`}
                />
              </SurveyCreatorErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-500 text-lg">
                    {!creator || !isCreatorReady
                      ? "Initializing survey creator..."
                      : idParam && !localSurvey
                      ? "Loading survey data..."
                      : "Survey creator ready"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
