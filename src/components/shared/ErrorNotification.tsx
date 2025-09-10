"use client";

import { useState, useEffect } from "react";
import { ErrorCode, getErrorMessage, ErrorMessage } from "@/utils/errors";

interface ErrorNotificationProps {
  error: ErrorCode | string | null;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function ErrorNotification({
  error,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | null>(null);

  useEffect(() => {
    if (error) {
      let message: ErrorMessage;

      if (typeof error === "string") {
        // Handle legacy string errors
        message = {
          title: "Error",
          message: error,
          variant: "error" as const,
        };
      } else {
        // Handle ErrorCode enum
        message = getErrorMessage(error);
      }

      setErrorMessage(message);
      setIsVisible(true);

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setErrorMessage(null);
    }
  }, [error, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible || !errorMessage) {
    return null;
  }

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-400",
          title: "text-red-800",
          message: "text-red-700",
          button: "text-red-500 hover:text-red-600",
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "text-yellow-400",
          title: "text-yellow-800",
          message: "text-yellow-700",
          button: "text-yellow-500 hover:text-yellow-600",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-400",
          title: "text-blue-800",
          message: "text-blue-700",
          button: "text-blue-500 hover:text-blue-600",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: "text-gray-400",
          title: "text-gray-800",
          message: "text-gray-700",
          button: "text-gray-500 hover:text-gray-600",
        };
    }
  };

  const styles = getVariantStyles(errorMessage.variant);

  const getIcon = (variant: string) => {
    switch (variant) {
      case "error":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "info":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className={`rounded-md p-4 mb-4 border ${styles.bg} ${styles.border}`}>
      <div className="flex">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getIcon(errorMessage.variant)}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {errorMessage.title}
          </h3>
          <div className={`mt-2 text-sm ${styles.message}`}>
            <p>{errorMessage.message}</p>
            {errorMessage.action && (
              <p className="mt-1 font-medium">{errorMessage.action}</p>
            )}
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={handleClose}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing error notifications
 */
export function useErrorNotification() {
  const [error, setError] = useState<ErrorCode | string | null>(null);

  const showError = (errorCode: ErrorCode | string) => {
    setError(errorCode);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    error,
    showError,
    clearError,
  };
}

