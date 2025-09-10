/**
 * Unified Error Handling System
 *
 * This module provides consistent error messages and handling across
 * both Regular and Happiness surveys, for all user types and flows.
 */

export enum ErrorCode {
  // Survey Access Errors
  SURVEY_NOT_FOUND = "SURVEY_NOT_FOUND",
  SURVEY_NOT_ASSIGNED = "SURVEY_NOT_ASSIGNED",
  SURVEY_ACCESS_DENIED = "SURVEY_ACCESS_DENIED",
  SURVEY_AUTHENTICATION_REQUIRED = "SURVEY_AUTHENTICATION_REQUIRED",

  // Survey Submission Errors
  SURVEY_ALREADY_SUBMITTED = "SURVEY_ALREADY_SUBMITTED",
  SURVEY_SINGLE_COMPLETION_ONLY = "SURVEY_SINGLE_COMPLETION_ONLY",
  SURVEY_COOLDOWN_ACTIVE = "SURVEY_COOLDOWN_ACTIVE",
  SURVEY_SUBMISSION_FAILED = "SURVEY_SUBMISSION_FAILED",

  // User/Authentication Errors
  USER_NOT_FOUND = "USER_NOT_FOUND",
  INVALID_OTP = "INVALID_OTP",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_SESSION = "INVALID_SESSION",
  PHONE_INVALID = "PHONE_INVALID",
  EMAIL_INVALID = "EMAIL_INVALID",

  // Admin/Management Errors
  SURVEY_CREATE_FAILED = "SURVEY_CREATE_FAILED",
  SURVEY_UPDATE_FAILED = "SURVEY_UPDATE_FAILED",
  SURVEY_DELETE_FAILED = "SURVEY_DELETE_FAILED",
  USER_CREATE_FAILED = "USER_CREATE_FAILED",
  CSV_IMPORT_FAILED = "CSV_IMPORT_FAILED",

  // General Errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
  variant: "error" | "warning" | "info";
}

/**
 * Error message mappings for consistent user-facing messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, ErrorMessage> = {
  // Survey Access Errors
  [ErrorCode.SURVEY_NOT_FOUND]: {
    title: "Survey Not Found",
    message:
      "The requested survey could not be found or may have been removed.",
    action: "Please check the survey link or contact your administrator.",
    variant: "error",
  },

  [ErrorCode.SURVEY_NOT_ASSIGNED]: {
    title: "Survey Not Assigned",
    message: "You are not assigned to this survey.",
    action:
      "Please contact your administrator if you believe this is an error.",
    variant: "warning",
  },

  [ErrorCode.SURVEY_ACCESS_DENIED]: {
    title: "Access Denied",
    message: "You do not have permission to access this survey.",
    action: "Please contact your administrator for assistance.",
    variant: "error",
  },

  [ErrorCode.SURVEY_AUTHENTICATION_REQUIRED]: {
    title: "Authentication Required",
    message: "You need to log in to access this survey.",
    action: "Please log in with your credentials.",
    variant: "info",
  },

  // Survey Submission Errors (Main messages from page logic)
  [ErrorCode.SURVEY_ALREADY_SUBMITTED]: {
    title: "Survey Already Completed",
    message:
      "You have already submitted this survey and it can only be completed once.",
    action: "Thank you for your participation.",
    variant: "info",
  },

  [ErrorCode.SURVEY_SINGLE_COMPLETION_ONLY]: {
    title: "Survey Already Completed",
    message: "This survey can only be completed once.",
    action: "Thank you for your participation.",
    variant: "info",
  },

  [ErrorCode.SURVEY_COOLDOWN_ACTIVE]: {
    title: "Survey Cooldown Active",
    message: "You need to wait before taking this survey again.",
    action: "Please try again later.",
    variant: "warning",
  },

  [ErrorCode.SURVEY_SUBMISSION_FAILED]: {
    title: "Submission Failed",
    message: "Failed to submit your survey responses.",
    action: "Please try again or contact support if the problem persists.",
    variant: "error",
  },

  // User/Authentication Errors
  [ErrorCode.USER_NOT_FOUND]: {
    title: "User Not Found",
    message: "No user found with the provided credentials.",
    action: "Please check your email or phone number and try again.",
    variant: "error",
  },

  [ErrorCode.UNAUTHORIZED]: {
    title: "Unauthorized Access",
    message: "You are not authorized to access this resource.",
    action: "Please log in and try again.",
    variant: "error",
  },

  [ErrorCode.INVALID_SESSION]: {
    title: "Invalid Session",
    message: "Your session is invalid or has expired.",
    action: "Please log in again.",
    variant: "warning",
  },

  [ErrorCode.INVALID_OTP]: {
    title: "Invalid Code",
    message: "The verification code you entered is incorrect or has expired.",
    action: "Please request a new code and try again.",
    variant: "error",
  },

  [ErrorCode.SESSION_EXPIRED]: {
    title: "Session Expired",
    message: "Your session has expired for security reasons.",
    action: "Please log in again to continue.",
    variant: "warning",
  },

  [ErrorCode.PHONE_INVALID]: {
    title: "Invalid Phone Number",
    message:
      "Please enter a valid Egyptian phone number (e.g., 01012345678 or +20-10-1234-5678).",
    action: "Phone numbers must start with 010, 011, 012, or 015.",
    variant: "error",
  },

  [ErrorCode.EMAIL_INVALID]: {
    title: "Invalid Email",
    message: "Please enter a valid email address.",
    action: "Check your email format and try again.",
    variant: "error",
  },

  // Admin/Management Errors
  [ErrorCode.SURVEY_CREATE_FAILED]: {
    title: "Failed to Create Survey",
    message: "Unable to create the survey due to a system error.",
    action: "Please try again or contact technical support.",
    variant: "error",
  },

  [ErrorCode.SURVEY_UPDATE_FAILED]: {
    title: "Failed to Update Survey",
    message: "Unable to save changes to the survey.",
    action: "Please try again or contact technical support.",
    variant: "error",
  },

  [ErrorCode.SURVEY_DELETE_FAILED]: {
    title: "Failed to Delete Survey",
    message: "Unable to delete the survey due to a system error.",
    action: "Please try again or contact technical support.",
    variant: "error",
  },

  [ErrorCode.USER_CREATE_FAILED]: {
    title: "Failed to Create User",
    message: "Unable to create the user account.",
    action: "Please check the information and try again.",
    variant: "error",
  },

  [ErrorCode.CSV_IMPORT_FAILED]: {
    title: "CSV Import Failed",
    message: "Unable to import users from the CSV file.",
    action: "Please check the file format and try again.",
    variant: "error",
  },

  // General Errors
  [ErrorCode.VALIDATION_ERROR]: {
    title: "Validation Error",
    message: "Please check your input and try again.",
    action: "Make sure all required fields are filled correctly.",
    variant: "error",
  },

  [ErrorCode.SERVER_ERROR]: {
    title: "Server Error",
    message: "A server error occurred while processing your request.",
    action:
      "Please try again later or contact support if the problem persists.",
    variant: "error",
  },

  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    title: "Internal Server Error",
    message: "An internal server error occurred while processing your request.",
    action:
      "Please try again later or contact support if the problem persists.",
    variant: "error",
  },

  [ErrorCode.NETWORK_ERROR]: {
    title: "Connection Error",
    message: "Unable to connect to the server.",
    action: "Please check your internet connection and try again.",
    variant: "error",
  },
};

/**
 * Get error message by code
 */
export function getErrorMessage(code: ErrorCode): ErrorMessage {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.SERVER_ERROR];
}

/**
 * Create API error response with consistent format
 */
export function createApiError(code: ErrorCode, details?: string) {
  const errorMessage = getErrorMessage(code);
  return {
    error: errorMessage.message,
    code,
    details,
    title: errorMessage.title,
  };
}

/**
 * Map legacy error messages to error codes
 */
export function mapLegacyError(errorMessage: string): ErrorCode {
  const message = errorMessage.toLowerCase();

  if (
    message.includes("already submitted") ||
    message.includes("already completed")
  ) {
    return ErrorCode.SURVEY_ALREADY_SUBMITTED;
  }

  if (message.includes("can only be completed once")) {
    return ErrorCode.SURVEY_SINGLE_COMPLETION_ONLY;
  }

  if (message.includes("not assigned")) {
    return ErrorCode.SURVEY_NOT_ASSIGNED;
  }

  if (message.includes("not found")) {
    return ErrorCode.SURVEY_NOT_FOUND;
  }

  if (message.includes("access denied") || message.includes("permission")) {
    return ErrorCode.SURVEY_ACCESS_DENIED;
  }

  if (
    message.includes("authentication required") ||
    message.includes("login")
  ) {
    return ErrorCode.SURVEY_AUTHENTICATION_REQUIRED;
  }

  if (
    message.includes("invalid otp") ||
    message.includes("verification code")
  ) {
    return ErrorCode.INVALID_OTP;
  }

  if (message.includes("phone") && message.includes("invalid")) {
    return ErrorCode.PHONE_INVALID;
  }

  if (message.includes("email") && message.includes("invalid")) {
    return ErrorCode.EMAIL_INVALID;
  }

  return ErrorCode.SERVER_ERROR;
}

/**
 * Validate Egyptian phone number format
 * Supports formats: 01xxxxxxxxx, +20-1x-xxxx-xxxx, +201xxxxxxxxx
 */
export function validateEgyptianPhone(phone: string): boolean {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, "");

  // Egyptian phone patterns:
  // 1. 01xxxxxxxxx (11 digits starting with 01)
  // 2. +201xxxxxxxxx (13 digits starting with +201)
  const patterns = [
    /^01[0-2,5]{1}[0-9]{8}$/, // 01xxxxxxxxx format
    /^\+201[0-2,5]{1}[0-9]{8}$/, // +201xxxxxxxxx format
  ];

  return patterns.some((pattern) => pattern.test(cleanPhone));
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
