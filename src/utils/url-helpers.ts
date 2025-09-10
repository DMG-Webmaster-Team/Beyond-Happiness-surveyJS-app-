/**
 * URL validation and construction helpers
 */

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely constructs a URL with proper error handling
 */
export function safeUrl(url: string, base?: string): URL | null {
  if (!url || typeof url !== "string") return null;

  try {
    // If it's already a complete URL, use it directly
    if (isValidUrl(url)) {
      return new URL(url);
    }

    // For relative URLs, use the provided base or window.location.origin
    const baseUrl =
      base || (typeof window !== "undefined" ? window.location.origin : "");
    if (!baseUrl) return null;

    return new URL(url, baseUrl);
  } catch {
    return null;
  }
}

/**
 * Extracts survey ID from URL path safely
 */
export function extractSurveyIdFromUrl(url: string): string | null {
  const urlObj = safeUrl(url);
  if (!urlObj) return null;

  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  return pathParts[pathParts.length - 1] || null;
}
