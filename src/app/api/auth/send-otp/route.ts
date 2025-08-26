import { NextRequest, NextResponse } from "next/server";
import { sendOTP } from "../../../../lib/services/otp-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Debug: Log what we received
    console.log(" /api/auth/send-otp received:", body);

    // Validate request body
    const { identifier, method, surveyId, surveyTitle } = body;

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

    // Send OTP
    const result = await sendOTP(identifier, method, surveyTitle);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        method: result.method,
        identifier: identifier.includes("@") ? "email" : "phone",
        otp: result.otp, // Include OTP in test mode
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || result.message },
        { status: 400 }
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
