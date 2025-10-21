/**
 * API endpoint for unified happiness scoring
 * This runs server-side to avoid client-side database import issues
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateUnifiedHappinessScore } from "@/lib/services/unified-happiness-scoring";

export async function POST(request: NextRequest) {
  try {
    const { answers, language = "en" } = await request.json();

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Answers array is required" },
        { status: 400 }
      );
    }

    const unifiedScore = await calculateUnifiedHappinessScore(
      answers,
      language as "en" | "ar"
    );

    return NextResponse.json({
      success: true,
      data: unifiedScore,
    });
  } catch (error) {
    console.error("Error calculating unified happiness score:", error);
    return NextResponse.json(
      { error: "Failed to calculate happiness score" },
      { status: 500 }
    );
  }
}
