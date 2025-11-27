"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import dynamic from "next/dynamic";
import "survey-core/survey-core.css";
import UserNavbar from "@/components/shared/UserNavbar";
import AnonymousNavbar from "@/components/shared/AnonymousNavbar";
import SurveySkeletonLoader from "@/components/shared/SurveySkeletonLoader";
import SurveyStatusPage from "@/components/survey/SurveyStatusPage";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ParticipantInformationForm, {
  ParticipantData,
} from "@/components/shared/ParticipantInformationForm";

// Dynamically import Survey component to avoid SSR issues
const DynamicSurvey = dynamic(
  () => import("survey-react-ui").then((mod) => mod.Survey),
  {
    ssr: false,
    loading: () => <SurveySkeletonLoader />,
  }
);

// Types for the unified API response
interface SurveySessionData {
  user?: {
    id: string;
    email: string;
    phone?: string;
    name?: string;
  };
  survey: {
    id: string;
    title: string;
    description?: string;
    json?: string;
    canTakeMultiple: boolean;
    isAnonymous: boolean;
    adminId: string;
  };
  submissionStatus: {
    hasSubmitted: boolean;
    canRetake: boolean;
    submissionCount: number;
  };
  assignment?: {
    status: string;
    dueAt?: Date | null;
  };
}

interface ApiError {
  error: string;
  requiresAuth?: boolean;
  redirect?: boolean;
  redirectUrl?: string;
  surveyType?: string;
}

export default function SurveyPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params?.surveyId as string;

  // State management
  const [sessionData, setSessionData] = useState<SurveySessionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [showUserInfoCollection, setShowUserInfoCollection] = useState(false);
  // Initialize collectedUserData from sessionStorage if available (persist across re-renders)
  const getStoredUserData = () => {
    if (typeof window === "undefined") {
      return { name: "", email: "", phone: "", gender: "", ageRange: "" };
    }
    try {
      const stored = sessionStorage.getItem(`survey:userData:${surveyId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore errors
    }
    return { name: "", email: "", phone: "", gender: "", ageRange: "" };
  };

  const [collectedUserData, setCollectedUserData] = useState(getStoredUserData);

  // Fetch survey session data on mount
  useEffect(() => {
    console.log(`[SurveyPage] 🔍 Component mounted, surveyId: ${surveyId}`);

    if (!surveyId) {
      console.log(`[SurveyPage] ❌ No surveyId provided`);
      setError("Survey ID is required");
      setIsLoading(false);
      return;
    }

    const fetchSurveySession = async () => {
      try {
        console.log(
          `[SurveyPage] 📡 Fetching survey session for ${surveyId}...`
        );
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/survey-session/${surveyId}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        console.log(
          `[SurveyPage] 📡 Response status: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          const data = await response.json();
          const apiError = data as ApiError;
          console.log(`[SurveyPage] ❌ API error:`, apiError);

          // Handle specific error cases
          if (apiError.requiresAuth) {
            console.log(
              `[SurveyPage] 🔒 Authentication required, redirecting to login...`
            );
            // Redirect to login for non-anonymous surveys
            router.push(
              apiError.redirectUrl || `/user/login?redirect=${surveyId}`
            );
            return;
          }

          if (apiError.redirect && apiError.surveyType === "happiness") {
            console.log(
              `[SurveyPage] 🎭 Happiness survey detected, redirecting...`
            );
            // Redirect to happiness survey page
            router.push(apiError.redirectUrl || `/happiness/${surveyId}`);
            return;
          }

          throw new Error(apiError.error || "Failed to load survey session");
        }

        const data = await response.json();
        console.log(`[SurveyPage] ✅ Session data received:`, {
          surveyId: data.survey?.id,
          title: data.survey?.title,
          isAnonymous: data.survey?.isAnonymous,
          hasUser: !!data.user,
          submissionStatus: data.submissionStatus,
        });
        setSessionData(data);
      } catch (err) {
        console.error("[SurveyPage] ❌ Error fetching survey session:", err);
        setError(err instanceof Error ? err.message : "Failed to load survey");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurveySession();
  }, [surveyId, router]);

  // Check if we need to show user info collection (separate from model creation)
  useEffect(() => {
    if (!sessionData) {
      console.log(`[SurveyPage] ⏳ Waiting for session data...`);
      return;
    }

    console.log(`[SurveyPage] 🔍 Checking if user info collection needed...`);
    console.log(
      `[SurveyPage] 📋 Session data survey isAnonymous:`,
      sessionData.survey.isAnonymous,
      `(type: ${typeof sessionData.survey.isAnonymous})`
    );

    // For anonymous surveys, check if we need to show user info collection
    const isAnonymous =
      sessionData.survey.isAnonymous === true ||
      (sessionData.survey.isAnonymous as any) === 1;

    console.log(`[SurveyPage] 🔐 isAnonymous check result: ${isAnonymous}`);

    if (isAnonymous) {
      console.log(
        `[SurveyPage] 🎭 Anonymous survey detected - checking for collected user data...`
      );
      // Check both state and sessionStorage for collected data
      let storedData = collectedUserData;
      if (typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem(`survey:userData:${surveyId}`);
          if (stored) {
            storedData = JSON.parse(stored);
            console.log(
              `[SurveyPage] 💾 Found stored user data in sessionStorage:`,
              storedData
            );
            // Update state if we found stored data and state is empty
            if (
              storedData.name &&
              storedData.email &&
              !collectedUserData.name
            ) {
              console.log(
                `[SurveyPage] ✅ Updating state with stored user data`
              );
              setCollectedUserData(storedData);
            }
          } else {
            console.log(
              `[SurveyPage] 💾 No stored user data in sessionStorage`
            );
          }
        } catch (e) {
          console.error(`[SurveyPage] ❌ Error reading sessionStorage:`, e);
        }
      }

      // Show user info collection if data not collected yet
      const hasCollectedData = storedData.name && storedData.email;
      console.log(
        `[SurveyPage] 📝 Has collected data: ${hasCollectedData} (name: ${!!storedData.name}, email: ${!!storedData.email})`
      );
      setShowUserInfoCollection(!hasCollectedData);
      console.log(
        `[SurveyPage] 📝 Setting showUserInfoCollection to: ${!hasCollectedData}`
      );
    } else {
      console.log(
        `[SurveyPage] 🔒 Non-anonymous survey - skipping user info collection`
      );
      setShowUserInfoCollection(false);
    }
  }, [sessionData, surveyId, collectedUserData]);

  // Create survey model when session data is available AND user info is collected (if needed)
  useEffect(() => {
    console.log(
      `[SurveyPage] 🔍 Checking if survey model should be created...`
    );
    console.log(
      `[SurveyPage] 📋 Has sessionData: ${!!sessionData}, Has JSON: ${!!sessionData
        ?.survey?.json}, showUserInfoCollection: ${showUserInfoCollection}`
    );

    if (!sessionData?.survey?.json) {
      console.log(`[SurveyPage] ⏳ Waiting for survey JSON...`);
      return;
    }

    // Don't create model if we need to show user info collection first
    if (showUserInfoCollection) {
      console.log(`[SurveyPage] ⏳ Waiting for user info collection...`);
      return;
    }

    console.log(`[SurveyPage] 🏗️ Creating survey model...`);
    try {
      const originalSurveyJson = JSON.parse(sessionData.survey.json);
      let surveyJson = { ...originalSurveyJson };
      console.log(
        `[SurveyPage] 📋 Survey JSON parsed, pages: ${
          surveyJson.pages?.length || 0
        }`
      );

      // For anonymous surveys, filter out personal info fields that are already collected via ParticipantInformationForm
      // Handle MySQL boolean values (1/0) vs JavaScript boolean (true/false)
      const isAnonymous =
        sessionData.survey.isAnonymous === true ||
        (sessionData.survey.isAnonymous as any) === 1;

      console.log(
        `[SurveyPage] 🔐 Filtering check - isAnonymous: ${isAnonymous}`
      );

      if (isAnonymous) {
        console.log(
          `[SurveyPage] 🎭 Anonymous survey - filtering personal info fields...`
        );
        // List of personal info field names to filter out
        // Simple field names (exact match)
        const simplePersonalInfoFields = [
          "name",
          "email",
          "phone",
          "gender",
          "ageRange",
          "fullName",
        ];
        // Nested field names (prefix match for nested structures)
        const nestedPersonalInfoFields = [
          "anonymousInfo.name",
          "anonymousInfo.email",
          "anonymousInfo.phone",
          "anonymousInfo.gender",
          "anonymousInfo.ageRange",
        ];

        // Filter out personal info fields from all pages
        if (surveyJson.pages && Array.isArray(surveyJson.pages)) {
          surveyJson.pages = surveyJson.pages.map((page: any) => {
            if (page.elements && Array.isArray(page.elements)) {
              return {
                ...page,
                elements: page.elements.filter((el: any) => {
                  const elementName = el.name;
                  if (!elementName) return true; // Keep elements without names

                  // Check exact match for simple fields
                  if (simplePersonalInfoFields.includes(elementName)) {
                    return false;
                  }

                  // Check prefix match for nested fields
                  if (
                    nestedPersonalInfoFields.some((field) =>
                      elementName.startsWith(field)
                    )
                  ) {
                    return false;
                  }

                  return true;
                }),
              };
            }
            return page;
          });

          // Remove empty pages after filtering
          surveyJson.pages = surveyJson.pages.filter(
            (page: any) => !page.elements || page.elements.length > 0
          );
        }
      }

      const model = new Model(surveyJson);

      // Configure survey model
      model.showCompletedPage = false;
      model.showLoadingButtonIn = "navigation";
      model.showPreviewBeforeComplete = "showAllQuestions";

      // Remove progress bar from all regular surveys
      model.showProgressBar = "off";

      // Ensure navigation buttons are visible for all surveys
      model.showNavigationButtons = true;
      model.showNavigationButtonsOnTop = false;
      model.showNavigationButtonsOnBottom = true;

      // Explicitly set button texts
      model.completeText = "Submit";
      model.pageNextText = "Next";
      model.pagePrevText = "Previous";

      // Enable validation to control button state
      model.checkErrorsMode = "onValueChanged"; // Check errors as user types

      // Add handler to ensure footer visibility and make it fixed at bottom
      model.onAfterRenderSurvey.add((sender, options) => {
        const surveyElement = options.htmlElement;
        if (surveyElement) {
          // Find all footer elements
          const footers = surveyElement.querySelectorAll(".sv-footer");

          // Make footer fixed and always visible at bottom with !important styles
          footers.forEach((footer) => {
            const footerEl = footer as HTMLElement;
            footerEl.style.cssText = `
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              width: 100% !important;
              background-color: #ffffff !important;
              border-top: 1px solid #e5e7eb !important;
              padding: 1rem !important;
              z-index: 9999 !important;
              box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
            `;
          });

          // Add padding to survey body so content doesn't hide behind footer
          const surveyBody = surveyElement.querySelector(".sv-body");
          if (surveyBody) {
            (surveyBody as HTMLElement).style.paddingBottom = "80px";
          }
        }
      });

      // Ensure footer buttons are always visible and add visual feedback
      model.onAfterRenderPage.add((sender, options) => {
        const pageElement = options.htmlElement;
        if (pageElement) {
          // Find footer in page or parent
          const findAndStyleFooter = (element: Element) => {
            const footer = element.querySelector(".sv-footer");
            if (footer) {
              const footerEl = footer as HTMLElement;
              footerEl.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                background-color: #ffffff !important;
                border-top: 1px solid #e5e7eb !important;
                padding: 1rem !important;
                z-index: 9999 !important;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
              `;
            }
          };

          // Try to find footer in page element
          findAndStyleFooter(pageElement);

          // Also check parent survey element
          const surveyElement = pageElement.closest(".sv-root");
          if (surveyElement) {
            findAndStyleFooter(surveyElement);
          }

          // Add smooth transitions to navigation buttons for state changes
          const buttons = pageElement.querySelectorAll(".sv-btn");
          buttons.forEach((btn) => {
            const button = btn as HTMLElement;
            button.style.transition = "all 0.3s ease";
          });

          // Add padding to page so content doesn't hide behind fixed footer
          (pageElement as HTMLElement).style.paddingBottom = "80px";
        }
      });

      // Check if this is a multi-language survey and apply UI customizations
      const isMultiLanguageSurvey =
        model.getVariable("isMultiLanguageSurvey") === true ||
        model.getQuestionByName("languageChoice") !== null;

      if (isMultiLanguageSurvey) {
        // Apply UI customizations for multi-language surveys only using proper SurveyJS settings
        model.showTitle = false; // Hide survey title
        model.showPageTitles = false; // Hide page titles
        model.showNavigationButtons = true; // Enable navigation buttons
        model.showNavigationButtonsOnTop = false; // Hide top navigation buttons
        model.showNavigationButtonsOnBottom = true; // Show bottom navigation buttons
        model.showPreviewBeforeComplete = "noPreview"; // Remove preview button
        model.completeText = "Complete"; // Set complete button text
        model.showQuestionNumbers = "off"; // Hide question numbers

        // Add data attribute to survey element for CSS targeting
        model.onAfterRenderSurvey.add((sender, options) => {
          const surveyElement = options.htmlElement;
          if (surveyElement) {
            surveyElement.setAttribute("data-multilang", "true");
          }
        });

        // Safe cleanup - only hide top footer if SurveyJS still renders it
        model.onAfterRenderPage.add((sender, options) => {
          const pageElement = options.htmlElement;
          if (pageElement) {
            // Only hide top footer elements that might still appear
            const topFooters = pageElement.querySelectorAll(
              ".sv-footer.sv-footer-top"
            );
            topFooters.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.display = "none";
            });
          }
        });
      }

      // Handle survey completion
      model.onComplete.add(async (sender) => {
        await handleSurveySubmission(sender.data);
      });

      setSurveyModel(model);
      setIsLoading(false);
      console.log(`[SurveyPage] ✅ Survey model set and loading complete`);
    } catch (err) {
      console.error("[SurveyPage] ❌ Error creating survey model:", err);
      setError("Invalid survey configuration");
      setIsLoading(false);
    }
  }, [sessionData, showUserInfoCollection]);

  // Handle survey submission
  const handleSurveySubmission = async (surveyData: any) => {
    if (!sessionData || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Include collected user data for anonymous surveys
      // Handle MySQL boolean values (1/0) vs JavaScript boolean (true/false)
      const isAnonymous =
        sessionData.survey.isAnonymous === true ||
        (sessionData.survey.isAnonymous as any) === 1;

      let finalSurveyData = surveyData;
      if (isAnonymous && collectedUserData.name) {
        finalSurveyData = {
          ...surveyData,
          "anonymousInfo.name": collectedUserData.name,
          "anonymousInfo.email": collectedUserData.email,
          "anonymousInfo.phone": collectedUserData.phone,
          "anonymousInfo.gender": collectedUserData.gender,
          "anonymousInfo.ageRange": collectedUserData.ageRange,
        };
      }

      const submissionPayload = {
        surveyId: sessionData.survey.id,
        userId: sessionData.user?.id || null,
        data: finalSurveyData,
        isAnonymous: Boolean(isAnonymous), // Ensure we send a proper boolean
      };

      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit survey");
      }

      // Redirect to success page or status page
      if (isAnonymous) {
        // For anonymous surveys, redirect to a thank you page
        router.push(`/survey/thank-you?surveyId=${sessionData.survey.id}`);
      } else {
        // For authenticated surveys, redirect to status page
        router.push(`/user/survey/${sessionData.survey.id}/status`);
      }
    } catch (err) {
      console.error("Error submitting survey:", err);
      setError(err instanceof Error ? err.message : "Failed to submit survey");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {sessionData?.survey?.isAnonymous ? (
          <AnonymousNavbar />
        ) : (
          <UserNavbar />
        )}
        <LoadingScreen message="Loading survey..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <div className="max-w-4xl pt-40 mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⛔️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show user info collection for anonymous surveys
  if (showUserInfoCollection && sessionData?.survey?.isAnonymous) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AnonymousNavbar />

        <div className="bg-white shadow-sm">
          <div className="max-w-4xl text-center mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-blue-600">
              Participant Information
            </h1>
            <p className="text-blue-500 mt-2">
              Please fill in your information to continue to the survey
            </p>
          </div>
        </div>

        <ParticipantInformationForm
          language="en"
          onSubmit={(data: ParticipantData) => {
            console.log(
              `[SurveyPage] 📝 ParticipantInformationForm submitted:`,
              data
            );
            // Persist collected data to sessionStorage (like happiness survey)
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem(
                  `survey:userData:${surveyId}`,
                  JSON.stringify(data)
                );
                console.log(
                  `[SurveyPage] 💾 Saved user data to sessionStorage`
                );
              } catch (e) {
                console.error(
                  "[SurveyPage] ❌ Failed to save user data to sessionStorage:",
                  e
                );
              }
            }
            // Update collected user data
            setCollectedUserData(data);
            console.log(`[SurveyPage] ✅ Updated collectedUserData state`);
            // This will trigger the useEffect that checks if we need to show user info collection
            // Since data is now collected, showUserInfoCollection will be set to false
            // which will then trigger the survey model creation useEffect
          }}
          initialData={collectedUserData}
          showHeader={false}
        />
      </div>
    );
  }

  // Check if user has already submitted and cannot retake
  if (
    sessionData &&
    sessionData.submissionStatus.hasSubmitted &&
    !sessionData.submissionStatus.canRetake
  ) {
    return (
      <SurveyStatusPage
        type="already-submitted"
        survey={{
          id: sessionData.survey.id,
          title: sessionData.survey.title,
          canTakeMultiple: sessionData.survey.canTakeMultiple,
        }}
        user={sessionData.user}
        anonymous={sessionData.survey.isAnonymous}
        message={`You have already completed this survey${
          sessionData.submissionStatus.submissionCount > 1
            ? ` ${sessionData.submissionStatus.submissionCount} times`
            : ""
        }.`}
      />
    );
  }

  // Render the survey
  if (!sessionData || !surveyModel) {
    return (
      <div className="min-h-screen bg-gray-50">
        {sessionData?.survey?.isAnonymous ? (
          <AnonymousNavbar />
        ) : (
          <UserNavbar />
        )}
        <LoadingScreen message="Preparing survey..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      {sessionData.survey.isAnonymous ? <AnonymousNavbar /> : <UserNavbar />}

      {/* Survey Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Survey Header */}

        {/* Survey Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Submitting your responses...</p>
              </div>
            </div>
          )}

          <DynamicSurvey model={surveyModel} />
        </div>
      </div>
    </div>
  );
}
