/**
 * SurveyJS License Configuration
 *
 * Add your SurveyJS license key here to remove trial watermarks
 * and enable full features.
 *
 * Get your license from: https://surveyjs.io/buy
 */

// Import SurveyJS license setters (will be used dynamically)
export function setSurveyJSLicense() {
  // Add your SurveyJS license key here
  const LICENSE_KEY = process.env.NEXT_PUBLIC_SURVEYJS_LICENSE_KEY || "";

  if (!LICENSE_KEY) {
    return;
  }

  try {
    // Set license for Survey Core (survey rendering)
    if (typeof window !== "undefined") {
      import("survey-core").then((SurveyCore) => {
        SurveyCore.setLicenseKey(LICENSE_KEY);
      });

      // Set license for Survey Creator (survey builder)
      import("survey-creator-core").then((CreatorCore) => {
        CreatorCore.setLicenseKey(LICENSE_KEY);
      });
    }
  } catch (error) {
    // Silently handle errors
  }
}

// Alternative: Set license directly if you don't want to use environment variables
export function setSurveyJSLicenseDirect(licenseKey: string) {
  if (!licenseKey) {
    return;
  }

  try {
    if (typeof window !== "undefined") {
      import("survey-core").then((SurveyCore) => {
        SurveyCore.setLicenseKey(licenseKey);
      });

      import("survey-creator-core").then((CreatorCore) => {
        CreatorCore.setLicenseKey(licenseKey);
      });
    }
  } catch (error) {
    // Silently handle errors
  }
}
