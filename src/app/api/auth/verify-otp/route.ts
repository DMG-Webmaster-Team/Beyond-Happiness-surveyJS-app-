import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "../../../../lib/services/otp-service";
import { z } from "zod";

// Validation schema - support both formats
const verifyOTPSchema = z
  .object({
    identifier: z.string().min(1, "Email or phone is required").optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    otp: z.string().length(6, "OTP must be 6 digits"),
  })
  .refine(
    (data) => {
      // Must have either identifier OR (email OR phone)
      return data.identifier || data.email || data.phone;
    },
    {
      message: "Either identifier or email/phone is required",
    }
  );

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = verifyOTPSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { identifier, email, phone, otp } = validation.data;

    // Determine the identifier to use
    const actualIdentifier = identifier || email || phone;
    if (!actualIdentifier) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid identifier provided",
        },
        { status: 400 }
      );
    }

    // Verify OTP
    const result = await verifyOTP(actualIdentifier, otp);

    if (result.valid) {
      return NextResponse.json({
        success: true,
        message: result.message,
        verified: true,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          verified: false,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Error in verify-otp endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
