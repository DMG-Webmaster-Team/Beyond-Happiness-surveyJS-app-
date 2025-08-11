import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Get the user session from sessionStorage (if it exists)
  const userSession = request.cookies.get("user_session");

  // Define protected paths that require authentication
  const protectedPaths = ["/user/survey/"];

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some((prefix) => path.startsWith(prefix));

  // If it's a protected path and there's no session, redirect to login
  if (isProtectedPath && !userSession) {
    const redirectUrl = new URL("/user/login", request.url);
    // Add the current path as a redirect parameter
    redirectUrl.searchParams.set("redirect", path.split("/").pop() || "");
    return NextResponse.redirect(redirectUrl);
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
      const response = NextResponse.redirect(new URL("/user/login", request.url));
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
