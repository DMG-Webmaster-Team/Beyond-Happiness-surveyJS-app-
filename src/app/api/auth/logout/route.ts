import { NextRequest, NextResponse } from "next/server";

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
        responseData.redirect = `/user/login?redirect=${encodeURIComponent(
          surveyId
        )}&type=happiness`;
      } else {
        responseData.redirect = `/user/login?redirect=${encodeURIComponent(
          surveyId
        )}`;
      }
      console.log("🔄 Logout with survey redirect:", responseData.redirect);
    } else {
      console.log("🔄 Standard logout without specific redirect");
    }

    // Log logout details for debugging
    const referer = request.headers.get("referer") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    console.log("🔍 Logout API called:", {
      origin: referer,
      userAgent: userAgent.substring(0, 100),
      surveyId: surveyId,
      timestamp: new Date().toISOString(),
    });

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
