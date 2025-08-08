import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { email, phone, otp } = await request.json();

    const usersPath = path.join(process.cwd(), "data", "users.json");
    const usersData = fs.readFileSync(usersPath, "utf8");
    const users = JSON.parse(usersData);

    // Find user by email/phone and OTP
    const user = users.find(
      (u: any) => (u.email === email || u.phone === phone) && u.otp === otp
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Return user data (excluding OTP)
    const { otp: _, ...userData } = user;

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
