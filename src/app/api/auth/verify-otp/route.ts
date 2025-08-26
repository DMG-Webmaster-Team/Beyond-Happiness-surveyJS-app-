import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "../../../../lib/services/otp-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("🔍 /api/auth/verify-otp received:", body);

    const { identifier, otp } = body;

    if (!identifier || !otp) {
      return NextResponse.json(
        { verified: false, error: "Identifier and OTP are required" },
        { status: 400 }
      );
    }

    const result = await verifyOTP(identifier, otp);

    if (result.valid) {
      return NextResponse.json({ verified: true });
    } else {
      return NextResponse.json(
        { verified: false, error: result.message },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return NextResponse.json(
      { verified: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
