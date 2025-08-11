import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface User {
  id: string;
  email: string;
  phone: string;
  assignedSurvey: string;
  hasSubmitted: boolean;
  otp: string;
}

interface Survey {
  id: string;
  canTakeMultiple: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { email, phone, otp, surveyId } = await request.json();

    // Read users data
    const usersPath = path.join(process.cwd(), "data", "users.json");
    const usersData = fs.readFileSync(usersPath, "utf8");
    const users: User[] = JSON.parse(usersData);

    // Find user by email/phone and OTP
    const user = users.find(
      (u) => (u.email === email || u.phone === phone) && u.otp === otp
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // If a specific survey is requested, verify access
    if (surveyId) {
      // Read surveys data
      const surveysPath = path.join(process.cwd(), "data", "surveys.json");
      const surveysData = fs.readFileSync(surveysPath, "utf8");
      const surveys: Survey[] = JSON.parse(surveysData);

      // Find the requested survey
      const survey = surveys.find((s) => s.id === surveyId);

      if (!survey) {
        return NextResponse.json(
          { error: "Survey not found" },
          { status: 404 }
        );
      }

      // Check if user is assigned to this survey
      if (user.assignedSurvey !== surveyId) {
        return NextResponse.json(
          { error: "You are not assigned to this survey" },
          { status: 403 }
        );
      }

      // Check if user has already submitted a one-time survey
      if (user.hasSubmitted && !survey.canTakeMultiple) {
        return NextResponse.json(
          { error: "You have already submitted this survey" },
          { status: 403 }
        );
      }

      // Return user data and survey info
      const { otp: _, ...userData } = user;
      const response = NextResponse.json({
        success: true,
        user: userData,
        survey,
      });

      // Set session cookie with short expiry (closes when browser closes)
      response.cookies.set({
        name: "user_session",
        value: JSON.stringify({
          ...userData,
          loginTime: new Date().toISOString(),
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return response;
    }

    // If no specific survey requested, just return user data
    const { otp: _, ...userData } = user;
    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    // Set session cookie with short expiry (closes when browser closes)
    response.cookies.set({
      name: "user_session",
      value: JSON.stringify({
        ...userData,
        loginTime: new Date().toISOString(),
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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