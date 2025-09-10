import fs from "fs";
import path from "path";

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  IP_REQUESTS_PER_MINUTE: 5,
  IDENTIFIER_REQUESTS_PER_MINUTE: 5, // Changed from daily to per minute
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
};

// File paths for persistent storage
const RATE_LIMIT_DIR = path.join(process.cwd(), ".rate-limits");
const IP_LIMITS_FILE = path.join(RATE_LIMIT_DIR, "ip-limits.json");
const IDENTIFIER_LIMITS_FILE = path.join(
  RATE_LIMIT_DIR,
  "identifier-limits.json"
);

// Ensure rate limit directory exists
const ensureRateLimitDir = () => {
  if (!fs.existsSync(RATE_LIMIT_DIR)) {
    fs.mkdirSync(RATE_LIMIT_DIR, { recursive: true });
  }
};

// Load rate limit data from file
const loadRateLimitData = (filePath: string): Record<string, any> => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading rate limit data from ${filePath}:`, error);
  }
  return {};
};

// Save rate limit data to file
const saveRateLimitData = (filePath: string, data: Record<string, any>) => {
  try {
    ensureRateLimitDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving rate limit data to ${filePath}:`, error);
  }
};

// Clean up expired entries
const cleanupExpiredEntries = (
  data: Record<string, any>,
  expiryMs: number
): Record<string, any> => {
  const now = Date.now();
  const cleaned: Record<string, any> = {};

  for (const [key, entry] of Object.entries(data)) {
    if (entry.lastReset && now - entry.lastReset < expiryMs) {
      cleaned[key] = entry;
    }
  }

  return cleaned;
};

// Check IP rate limit (per minute)
export const checkIPRateLimit = (
  ipAddress: string
): { allowed: boolean; resetTime?: number } => {
  const now = Date.now();
  const oneMinute = 60 * 1000;

  // Load current IP limits
  let ipLimits = loadRateLimitData(IP_LIMITS_FILE);

  // Clean up expired entries
  ipLimits = cleanupExpiredEntries(ipLimits, oneMinute);

  const ipRecord = ipLimits[ipAddress] || { count: 0, lastReset: now };

  // Reset if more than a minute has passed
  if (now - ipRecord.lastReset > oneMinute) {
    ipRecord.count = 0;
    ipRecord.lastReset = now;
  }

  // Check if limit exceeded
  if (ipRecord.count >= RATE_LIMIT_CONFIG.IP_REQUESTS_PER_MINUTE) {
    const resetTime = ipRecord.lastReset + oneMinute;
    return { allowed: false, resetTime };
  }

  // Increment counter and save
  ipRecord.count++;
  ipLimits[ipAddress] = ipRecord;
  saveRateLimitData(IP_LIMITS_FILE, ipLimits);

  console.log(
    `🔒 IP Rate Limit Check: ${ipAddress} - ${ipRecord.count}/${RATE_LIMIT_CONFIG.IP_REQUESTS_PER_MINUTE} requests`
  );

  return { allowed: true };
};

// Check identifier rate limit (per minute)
export const checkIdentifierRateLimit = (
  identifier: string
): { allowed: boolean; resetTime?: number } => {
  const now = Date.now();
  const oneMinute = 60 * 1000;

  // Load current identifier limits
  let identifierLimits = loadRateLimitData(IDENTIFIER_LIMITS_FILE);

  // Clean up expired entries
  identifierLimits = cleanupExpiredEntries(identifierLimits, oneMinute);

  const identifierRecord = identifierLimits[identifier] || {
    count: 0,
    lastReset: now,
  };

  // Reset if more than a minute has passed
  if (now - identifierRecord.lastReset > oneMinute) {
    identifierRecord.count = 0;
    identifierRecord.lastReset = now;
  }

  // Check if limit exceeded
  if (
    identifierRecord.count >= RATE_LIMIT_CONFIG.IDENTIFIER_REQUESTS_PER_MINUTE
  ) {
    const resetTime = identifierRecord.lastReset + oneMinute;
    return { allowed: false, resetTime };
  }

  // Increment counter and save
  identifierRecord.count++;
  identifierLimits[identifier] = identifierRecord;
  saveRateLimitData(IDENTIFIER_LIMITS_FILE, identifierLimits);

  console.log(
    `🔒 Identifier Rate Limit Check: ${identifier} - ${identifierRecord.count}/${RATE_LIMIT_CONFIG.IDENTIFIER_REQUESTS_PER_MINUTE} requests`
  );

  return { allowed: true };
};

// Validate email format (unified with utils/errors.ts)
export const isValidEmail = (email: string): boolean => {
  // Use the same regex as utils/errors.ts for consistency
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

// Validate phone format (unified with utils/errors.ts for Egyptian phones)
export const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, "");

  // Egyptian phone patterns (unified with utils/errors.ts):
  // 1. 01xxxxxxxxx (11 digits starting with 01)
  // 2. +201xxxxxxxxx (13 digits starting with +201)
  const egyptianPatterns = [
    /^01[0-2,5]{1}[0-9]{8}$/, // 01xxxxxxxxx format
    /^\+201[0-2,5]{1}[0-9]{8}$/, // +201xxxxxxxxx format
  ];

  // Check Egyptian patterns first
  if (egyptianPatterns.some((pattern) => pattern.test(cleanPhone))) {
    return true;
  }

  // Fallback to general international format for other countries
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  return phoneRegex.test(cleanPhone);
};

// Validate identifier (email or phone)
export const validateIdentifier = (
  identifier: string
): {
  valid: boolean;
  type: "email" | "phone" | "invalid";
  message?: string;
} => {
  if (!identifier || identifier.trim().length === 0) {
    return {
      valid: false,
      type: "invalid",
      message: "Identifier cannot be empty",
    };
  }

  const trimmed = identifier.trim();

  if (trimmed.includes("@")) {
    if (isValidEmail(trimmed)) {
      return { valid: true, type: "email" };
    } else {
      return { valid: false, type: "invalid", message: "Invalid email format" };
    }
  } else {
    if (isValidPhone(trimmed)) {
      return { valid: true, type: "phone" };
    } else {
      return {
        valid: false,
        type: "invalid",
        message:
          "Invalid phone number format. Use international format (e.g., +201234567890)",
      };
    }
  }
};

// Get client IP address from request
export const getClientIP = (request: Request): string => {
  // Try various headers for IP address (considering proxies, load balancers)
  const headers = request.headers;

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take the first IP if there are multiple
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIP = headers.get("x-real-ip");
  if (xRealIP) {
    return xRealIP.trim();
  }

  const cfConnectingIP = headers.get("cf-connecting-ip"); // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Fallback to a default (in development)
  return "127.0.0.1";
};

// Log OTP request for security monitoring
export const logOTPRequest = (data: {
  identifier: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  reason?: string;
  timestamp?: number;
}) => {
  const logEntry = {
    ...data,
    timestamp: data.timestamp || Date.now(),
    date: new Date().toISOString(),
  };

  console.log("🔐 OTP Request Log:", JSON.stringify(logEntry, null, 2));

  // In production, you might want to send this to a security monitoring service
  // or store in a dedicated security log file
};

// Periodic cleanup of old rate limit files
let cleanupInterval: NodeJS.Timeout | null = null;

export const startRateLimitCleanup = () => {
  if (cleanupInterval) return; // Already started

  cleanupInterval = setInterval(() => {
    try {
      // Clean up IP limits (older than 1 hour)
      const ipLimits = loadRateLimitData(IP_LIMITS_FILE);
      const cleanedIPLimits = cleanupExpiredEntries(ipLimits, 60 * 60 * 1000);
      saveRateLimitData(IP_LIMITS_FILE, cleanedIPLimits);

      // Clean up identifier limits (older than 1 hour)
      const identifierLimits = loadRateLimitData(IDENTIFIER_LIMITS_FILE);
      const cleanedIdentifierLimits = cleanupExpiredEntries(
        identifierLimits,
        60 * 60 * 1000
      );
      saveRateLimitData(IDENTIFIER_LIMITS_FILE, cleanedIdentifierLimits);

      console.log("🧹 Rate limit cleanup completed");
    } catch (error) {
      console.error("Error during rate limit cleanup:", error);
    }
  }, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS);
};

export const stopRateLimitCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Start cleanup when module is loaded
startRateLimitCleanup();
