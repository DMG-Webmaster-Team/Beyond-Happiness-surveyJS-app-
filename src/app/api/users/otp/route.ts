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

    // Add login timestamp
    const userWithLoginTime = {
      ...userData,
      loginTime: new Date().toISOString(),
    };

    // Create the response with user data
    const response = NextResponse.json({
      success: true,
      user: userWithLoginTime,
    });

    // Set the user session cookie (30 minutes expiry)
    response.cookies.set({
      name: "user_session",
      value: JSON.stringify(userWithLoginTime),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
