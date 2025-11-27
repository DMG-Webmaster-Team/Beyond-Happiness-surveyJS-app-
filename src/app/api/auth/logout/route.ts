import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    // Check for surveyId and surveyType in request body or URL params
    let surveyId: string | null = null;
    let surveyType: string | null = null;

    try {
      const body = await request.json();
      surveyId = body.surveyId || null;
      surveyType = body.surveyType || null;
    } catch {
      // No JSON body, check URL params
      const url = new URL(request.url);
      surveyId =
        url.searchParams.get("redirect") || url.searchParams.get("surveyId");
      surveyType = url.searchParams.get("type");
    }

    // Detect survey type from referer if not provided
    if (surveyId && !surveyType) {
      const referer = request.headers.get("referer") || "";
      if (referer.includes("/happiness/")) {
        surveyType = "happiness";
      }
    }

    const responseData: { success: boolean; redirect?: string } = {
      success: true,
    };

    // If surveyId provided, suggest redirect URL with proper type
    if (surveyId) {
      if (surveyType === "happiness") {
        responseData.redirect = `/happiness/${surveyId}`;
      } else {
        responseData.redirect = `/user/survey/${surveyId}`;
      }

    } else {

    }

    // Log logout details for debugging
    const referer = request.headers.get("referer") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const response = NextResponse.json(responseData);
    response.cookies.delete("user_session");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
