import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Get the user session from sessionStorage (if it exists)
  const userSession = request.cookies.get("user_session");

  // Define protected paths that require authentication
  const protectedPaths = ["/user/survey/"];

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some((prefix) =>
    path.startsWith(prefix)
  );

  // If it's a protected path, check if survey is anonymous before enforcing auth
  if (isProtectedPath) {
    try {
      const surveyId = path.split("/").pop();
      if (surveyId) {
        const apiUrl = new URL(`/api/surveys/${surveyId}`, request.url);
        const resp = await fetch(apiUrl.toString(), { cache: "no-store" });
        if (resp.ok) {
          const data = await resp.json();
          const isAnonymous = Boolean(data?.isAnonymous);
          if (isAnonymous) {
            // Bypass auth for anonymous surveys
            return NextResponse.next();
          }
        }
      }
    } catch {
      // On any error, fall back to requiring auth below
    }

    // If not anonymous and there's no session, redirect to login
    if (!userSession) {
      const redirectUrl = new URL("/user/login", request.url);
      redirectUrl.searchParams.set("redirect", path.split("/").pop() || "");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If user is logged in and tries to access login page, redirect to their assigned survey
  if (path === "/user/login" && userSession) {
    try {
      const userData = JSON.parse(userSession.value);
      if (userData.assignedSurvey) {
        return NextResponse.redirect(
          new URL(`/user/survey/${userData.assignedSurvey}`, request.url)
        );
      }
    } catch (error) {
      // If there's an error parsing the session, clear it
      const response = NextResponse.redirect(
        new URL("/user/login", request.url)
      );
      response.cookies.delete("user_session");
      return response;
    }
  }

  return NextResponse.next();
}

// Configure the paths that should be handled by this middleware
export const config = {
  matcher: [
    // Match all survey paths
    "/user/survey/:path*",
    // Match login path
    "/user/login",
  ],
};
