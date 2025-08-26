import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Check for surveyId in request body or URL params
    let surveyId: string | null = null;

    try {
      const body = await request.json();
      surveyId = body.surveyId || null;
    } catch {
      // No JSON body, check URL params
      const url = new URL(request.url);
      surveyId =
        url.searchParams.get("redirect") || url.searchParams.get("surveyId");
    }

    const responseData: { success: boolean; redirect?: string } = {
      success: true,
    };

    // If surveyId provided, suggest redirect URL
    if (surveyId) {
      responseData.redirect = `/user/login?redirect=${encodeURIComponent(
        surveyId
      )}`;
      console.log("🔄 Logout with survey redirect:", responseData.redirect);
    } else {
      console.log("🔄 Standard logout without specific redirect");
    }

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
