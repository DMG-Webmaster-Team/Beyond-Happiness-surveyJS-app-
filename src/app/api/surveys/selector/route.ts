import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveys } from "@/db/schema/surveys";
import { happinessSurveys } from "@/db/schema/happiness";
import { eq, and, or, like } from "drizzle-orm";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Build where conditions for active surveys
    const activeCondition = includeDeleted
      ? undefined
      : and(eq(surveys.isActive, true), eq(surveys.isPublished, true));

    const happinessActiveCondition = includeDeleted
      ? undefined
      : and(
          eq(happinessSurveys.isActive, true),
          eq(happinessSurveys.isPublished, true)
        );

    // Build search conditions
    const searchCondition = search
      ? like(surveys.title, `%${search}%`)
      : undefined;

    const happinessSearchCondition = search
      ? like(happinessSurveys.title, `%${search}%`)
      : undefined;

    // Combine conditions
    const regularWhere =
      searchCondition && activeCondition
        ? and(activeCondition, searchCondition)
        : searchCondition || activeCondition;

    const happinessWhere =
      happinessSearchCondition && happinessActiveCondition
        ? and(happinessActiveCondition, happinessSearchCondition)
        : happinessSearchCondition || happinessActiveCondition;

    // Fetch regular surveys
    const regularSurveys = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        description: surveys.description,
        isActive: surveys.isActive,
        isPublished: surveys.isPublished,
        createdAt: surveys.createdAt,
      })
      .from(surveys)
      .where(regularWhere)
      .orderBy(surveys.title);

    // Fetch happiness surveys
    const happinessSurveysData = await db
      .select({
        id: happinessSurveys.id,
        title: happinessSurveys.title,
        isActive: happinessSurveys.isActive,
        isPublished: happinessSurveys.isPublished,
        createdAt: happinessSurveys.createdAt,
      })
      .from(happinessSurveys)
      .where(happinessWhere)
      .orderBy(happinessSurveys.title);

    return NextResponse.json({
      success: true,
      data: {
        regularSurveys: regularSurveys.map((survey) => ({
          id: survey.id,
          title: survey.title,
          description: survey.description,
          type: "regular" as const,
          isActive: survey.isActive,
          isPublished: survey.isPublished,
          createdAt: survey.createdAt,
        })),
        happinessSurveys: happinessSurveysData.map((survey) => ({
          id: survey.id,
          title: survey.title,
          type: "happiness" as const,
          isActive: survey.isActive,
          isPublished: survey.isPublished,
          createdAt: survey.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching surveys for selector:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}












