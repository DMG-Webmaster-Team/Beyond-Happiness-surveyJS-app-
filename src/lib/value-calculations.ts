/**
 * Dynamic Value Calculation Utilities for Happiness Survey Builder
 * 
 * Auto-calculates essentialValues and categoryValues based on maximum scores
 * for each scale, with support for manual overrides and reset functionality.
 */

// Category maximum scores lookup map
export const CATEGORY_MAX_SCORES: Record<string, number> = {
  Meaning: 2000,
  Delight: 1500,
  Freedom: 1800,
  Engagement: 1600,
  Vitality: 1700,
};

// Essential maximum score (constant for all essentials)
export const MAX_ESSENTIAL_SCORE = 12.5;

/**
 * Generate 5 equally spaced values for Essential scoring
 * @param maxScore - Maximum score for the essential (default: 12.5)
 * @returns Array of 5 values from 0 to maxScore
 */
export function getAutoEssentialValues(maxScore: number = MAX_ESSENTIAL_SCORE): number[] {
  return Array.from({ length: 5 }, (_, i) =>
    parseFloat(((i * maxScore) / 4).toFixed(3))
  );
}

/**
 * Generate 5 linearly spaced values for Category scoring
 * @param category - Category name (e.g., "Meaning", "Delight")
 * @returns Array of 5 values from 0 to category max score
 */
export function getAutoCategoryValues(category: string): number[] {
  const maxScore = CATEGORY_MAX_SCORES[category] || 2000; // Default fallback
  return Array.from({ length: 5 }, (_, i) =>
    Math.round((i * maxScore) / 4)
  );
}

/**
 * Check if current values match auto-calculated values
 * @param currentValues - Current values array
 * @param autoValues - Auto-calculated values array
 * @returns true if values match (within tolerance for floating point)
 */
export function valuesMatchAuto(currentValues: number[], autoValues: number[]): boolean {
  if (currentValues.length !== autoValues.length) return false;
  
  return currentValues.every((value, index) => {
    const autoValue = autoValues[index];
    // Allow small floating point differences (0.001 tolerance)
    return Math.abs(value - autoValue) < 0.001;
  });
}

/**
 * Check if values are strictly increasing
 * @param values - Array of numbers to check
 * @returns true if values are strictly increasing
 */
export function isStrictlyIncreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) return false;
  }
  return true;
}

/**
 * Validate values array for Essential/Category scoring
 * @param values - Values array to validate
 * @param type - Type of values ("essential" or "category")
 * @returns Validation result with success flag and error message
 */
export function validateValues(values: number[], type: "essential" | "category"): {
  isValid: boolean;
  error?: string;
} {
  // Check length
  if (values.length !== 5) {
    return {
      isValid: false,
      error: `${type} values must contain exactly 5 numbers`
    };
  }

  // Check all values are numbers
  if (values.some(v => isNaN(v) || typeof v !== 'number')) {
    return {
      isValid: false,
      error: `All ${type} values must be valid numbers`
    };
  }

  // Check all values are non-negative
  if (values.some(v => v < 0)) {
    return {
      isValid: false,
      error: `All ${type} values must be non-negative`
    };
  }

  // Check values are strictly increasing
  if (!isStrictlyIncreasing(values)) {
    return {
      isValid: false,
      error: `${type} values must be strictly increasing`
    };
  }

  return { isValid: true };
}

/**
 * Get default values for a new question
 * @param category - Selected category
 * @returns Default values object
 */
export function getDefaultQuestionValues(category: string = "Meaning") {
  return {
    categoryValues: getAutoCategoryValues(category),
    essentialValues: getAutoEssentialValues(),
  };
}
