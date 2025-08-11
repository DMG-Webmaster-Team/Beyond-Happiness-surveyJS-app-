import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get("user_session");

    if (!userSession) {
      return NextResponse.json({ isAuthenticated: false });
    }

    try {
      // Verify the session data can be parsed
      const userData = JSON.parse(userSession.value);
      const loginTime = new Date(userData.loginTime).getTime();
      const sessionAge = Date.now() - loginTime;
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (sessionAge > thirtyMinutes) {
        // Session expired
        const response = NextResponse.json({ isAuthenticated: false });
        response.cookies.delete("user_session");
        return response;
      }

      return NextResponse.json({ isAuthenticated: true, user: userData });
    } catch (error) {
      // Invalid session data
      const response = NextResponse.json({ isAuthenticated: false });
      response.cookies.delete("user_session");
      return response;
    }
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
