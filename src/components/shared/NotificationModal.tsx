"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "info" | "warning" | "error" | "success";
  buttonText?: string;
}

export default function NotificationModal({
  isOpen,
  onClose,
  title = "Notification",
  message,
  type = "info",
  buttonText = "OK",
}: NotificationModalProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "error":
        return {
          icon: "text-red-500",
          iconBg: "bg-red-100",
          title: "text-red-800",
          message: "text-red-700",
          button: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "warning":
        return {
          icon: "text-yellow-500",
          iconBg: "bg-yellow-100",
          title: "text-yellow-800",
          message: "text-yellow-700",
          button: "bg-yellow-600 hover:bg-yellow-700 text-white",
        };
      case "success":
        return {
          icon: "text-green-500",
          iconBg: "bg-green-100",
          title: "text-green-800",
          message: "text-green-700",
          button: "bg-green-600 hover:bg-green-700 text-white",
        };
      default: // info
        return {
          icon: "text-blue-500",
          iconBg: "bg-blue-100",
          title: "text-blue-800",
          message: "text-blue-700",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case "success":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      default: // info
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden"
          >
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-start">
                <div
                  className={`flex-shrink-0 ${styles.iconBg} rounded-full p-2`}
                >
                  <div className={styles.icon}>{getIcon()}</div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className={`text-lg font-semibold ${styles.title}`}>
                    {title}
                  </h3>
                  <div className={`mt-2 text-sm ${styles.message}`}>
                    <p>{message}</p>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${styles.button}`}
                >
                  {buttonText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
