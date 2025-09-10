import { useState, useEffect, useCallback } from "react";
import { UserSurveySession } from "@/db/schema/user-survey-sessions";

interface UseSurveySessionOptions {
  userId: string;
  surveyId: string;
  autoCreate?: boolean; // Automatically create session if none exists
}

interface SurveySessionState {
  session: UserSurveySession | null;
  isLoading: boolean;
  error: string | null;
  hasActiveSession: boolean;
}

export function useSurveySession({
  userId,
  surveyId,
  autoCreate = true,
}: UseSurveySessionOptions) {
  const [state, setState] = useState<SurveySessionState>({
    session: null,
    isLoading: true,
    error: null,
    hasActiveSession: false,
  });

  // Get or create survey session
  const initializeSession = useCallback(async () => {
    if (!userId || !surveyId) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Missing userId or surveyId",
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // First, check for existing active session
      const response = await fetch(
        `/api/survey-sessions?userId=${userId}&surveyId=${surveyId}&action=active`
      );

      if (!response.ok) {
        throw new Error("Failed to check for existing session");
      }

      const data = await response.json();

      if (data.session) {
        // Found existing session
        setState({
          session: data.session,
          isLoading: false,
          error: null,
          hasActiveSession: true,
        });
        return data.session;
      }

      // No existing session found
      if (autoCreate) {
        // Create new session
        const createResponse = await fetch("/api/survey-sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
            userId,
            surveyId,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create survey session");
        }

        const createData = await createResponse.json();

        setState({
          session: createData.session,
          isLoading: false,
          error: null,
          hasActiveSession: true,
        });

        return createData.session;
      } else {
        // Don't auto-create, just return null
        setState({
          session: null,
          isLoading: false,
          error: null,
          hasActiveSession: false,
        });
        return null;
      }
    } catch (error) {
      console.error("Error initializing survey session:", error);
      setState({
        session: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
        hasActiveSession: false,
      });
      return null;
    }
  }, [userId, surveyId, autoCreate]);

  // Update session progress
  const updateProgress = useCallback(
    async (progress: any) => {
      if (!state.session) {
        throw new Error("No active session to update");
      }

      try {
        const response = await fetch("/api/survey-sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update-progress",
            userId,
            sessionId: state.session.id,
            progress,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update session progress");
        }

        const data = await response.json();
        setState((prev) => ({
          ...prev,
          session: data.session,
        }));

        return data.session;
      } catch (error) {
        console.error("Error updating session progress:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update progress",
        }));
        throw error;
      }
    },
    [state.session, userId]
  );

  // Complete session
  const completeSession = useCallback(async () => {
    if (!state.session) {
      throw new Error("No active session to complete");
    }

    try {
      const response = await fetch("/api/survey-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "complete",
          userId,
          sessionId: state.session.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete session");
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        session: data.session,
        hasActiveSession: false,
      }));

      return data.session;
    } catch (error) {
      console.error("Error completing session:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to complete session",
      }));
      throw error;
    }
  }, [state.session, userId]);

  // Abandon session
  const abandonSession = useCallback(async () => {
    if (!state.session) {
      throw new Error("No active session to abandon");
    }

    try {
      const response = await fetch("/api/survey-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "abandon",
          userId,
          sessionId: state.session.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to abandon session");
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        session: data.session,
        hasActiveSession: false,
      }));

      return data.session;
    } catch (error) {
      console.error("Error abandoning session:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to abandon session",
      }));
      throw error;
    }
  }, [state.session, userId]);

  // Get survey configuration from session (frozen at session creation time)
  const getSurveyConfig = useCallback(() => {
    if (!state.session) {
      return null;
    }

    try {
      return {
        definition: JSON.parse(state.session.surveyConfig),
        title: state.session.surveyTitle,
        description: state.session.surveyDescription,
        canTakeMultiple: state.session.canTakeMultiple,
        isAnonymous: state.session.isAnonymous,
      };
    } catch (error) {
      console.error("Error parsing survey config from session:", error);
      return null;
    }
  }, [state.session]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return {
    ...state,
    initializeSession,
    updateProgress,
    completeSession,
    abandonSession,
    getSurveyConfig,
    // Convenience getters
    sessionId: state.session?.id || null,
    sessionStatus: state.session?.status || null,
    sessionProgress: state.session?.progress
      ? JSON.parse(state.session.progress)
      : null,
  };
}

