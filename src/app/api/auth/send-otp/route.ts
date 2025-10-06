import { NextRequest, NextResponse } from "next/server";
import { sendOTP } from "../../../../lib/services/otp-service";
import { verifyRecaptchaToken } from "../../../../components/shared/RecaptchaWrapper";


// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Debug: Log what we received
    console.log(" /api/auth/send-otp received:", body);

    // Validate request body
    const { identifier, method, surveyId, surveyTitle, recaptchaToken } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier is required" },
        { status: 400 }
      );
    }

    if (!method || !["email", "sms", "none"].includes(method)) {
      return NextResponse.json(
        { success: false, error: "Valid method is required" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA if token provided
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptchaToken(recaptchaToken);
      if (!isValidRecaptcha) {
        return NextResponse.json(
          { success: false, error: "reCAPTCHA verification failed" },
          { status: 400 }
        );
      }
      console.log("✅ reCAPTCHA verification passed");
    } else {
      console.log(
        "ℹ️ No reCAPTCHA token provided - proceeding without verification"
      );
    }

    // Send OTP with request object for rate limiting
    const result = await sendOTP(identifier, method, surveyTitle, req);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        method: result.method,
        identifier: identifier.includes("@") ? "email" : "phone",
        otp: result.otp, // Include OTP in test mode
      });
    } else {
      // Return 429 for rate limiting errors
      const status = result.rateLimited ? 429 : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message,
          rateLimited: result.rateLimited,
        },
        { status }
      );
    }
  } catch (error) {
    console.error("Error in send-otp:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
