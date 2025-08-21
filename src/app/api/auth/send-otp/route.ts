import { NextRequest, NextResponse } from "next/server";
import { sendOTP } from "../../../../lib/services/otp-service";
import { z } from "zod";

// Validation schema
const sendOTPSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  method: z.enum(["email", "sms", "both"]).default("both"),
  surveyId: z.string().optional().nullable(),
  surveyTitle: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Debug: Log what we received
    console.log("🔍 /api/auth/send-otp received:", body);

    // Validate request body
    const validation = sendOTPSchema.safeParse(body);
    if (!validation.success) {
      console.log("❌ Validation failed:", validation.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { identifier, method, surveyId, surveyTitle } = validation.data;

    // Send OTP
    const result = await sendOTP(identifier, method, surveyTitle || undefined);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        method: result.method,
        identifier: identifier.includes("@") ? "email" : "phone",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Error in send-otp endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
