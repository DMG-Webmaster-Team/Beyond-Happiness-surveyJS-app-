"use client";

import { useEffect, useState } from "react";

interface RecaptchaWrapperProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  siteKey?: string;
  size?: "normal" | "compact" | "invisible";
  theme?: "light" | "dark";
  disabled?: boolean;
}

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

export default function RecaptchaWrapper({
  onVerify,
  onError,
  siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
  size = "normal",
  theme = "light",
  disabled = false,
}: RecaptchaWrapperProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  useEffect(() => {
    // Skip if no site key provided
    if (!siteKey) {
      console.warn(
        "reCAPTCHA site key not provided. Skipping reCAPTCHA verification."
      );
      return;
    }

    // Load reCAPTCHA script
    const loadRecaptcha = () => {
      if (window.grecaptcha) {
        setIsLoaded(true);
        return;
      }

      window.onRecaptchaLoad = () => {
        setIsLoaded(true);
      };

      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadRecaptcha();

    return () => {
      // Cleanup
      if (widgetId !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetId);
        } catch (error) {
          console.warn("Error resetting reCAPTCHA:", error);
        }
      }
    };
  }, [siteKey, widgetId]);

  useEffect(() => {
    if (isLoaded && window.grecaptcha && !widgetId && !disabled) {
      try {
        const id = window.grecaptcha.render("recaptcha-container", {
          sitekey: siteKey,
          size: size,
          theme: theme,
          callback: (token: string) => {
            console.log("🔐 reCAPTCHA verified successfully");
            onVerify(token);
          },
          "error-callback": () => {
            console.error("❌ reCAPTCHA error");
            onError?.();
          },
          "expired-callback": () => {
            console.warn("⏰ reCAPTCHA expired");
            onError?.();
          },
        });
        setWidgetId(id);
      } catch (error) {
        console.error("Error rendering reCAPTCHA:", error);
        onError?.();
      }
    }
  }, [isLoaded, siteKey, size, theme, onVerify, onError, widgetId, disabled]);

  // If no site key, render nothing (graceful degradation)
  if (!siteKey) {
    return null;
  }

  return (
    <div className="recaptcha-wrapper">
      <div id="recaptcha-container" className="flex justify-center"></div>
      {!isLoaded && (
        <div className="text-sm text-gray-500 text-center py-2">
          Loading security verification...
        </div>
      )}
    </div>
  );
}

// Utility function to verify reCAPTCHA token on the server
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.warn("reCAPTCHA secret key not configured. Skipping verification.");
    return true; // Allow through if not configured
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const result = await response.json();

    console.log("🔐 reCAPTCHA verification result:", {
      success: result.success,
      score: result.score,
      action: result.action,
      hostname: result.hostname,
    });

    return result.success && (result.score === undefined || result.score > 0.5);
  } catch (error) {
    console.error("Error verifying reCAPTCHA token:", error);
    return false;
  }
}
