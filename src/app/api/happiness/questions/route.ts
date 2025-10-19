import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessQuestions } from "@/db/schema/happiness";
import { eq, like, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - List happiness questions with filters

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    // Fetch all questions first - sorted by ID ascending (1, 2, 3, ...)
    const questions = await db
      .select()
      .from(happinessQuestions)
      .orderBy(asc(happinessQuestions.id));

    // Values are already parsed as JSON in MySQL, no need to parse again
    let parsedQuestions = questions.map((q) => ({
      ...q,
      categoryValues: Array.isArray(q.categoryValues)
        ? q.categoryValues
        : JSON.parse(q.categoryValues),
      essentialValues: q.essentialValues
        ? Array.isArray(q.essentialValues)
          ? q.essentialValues
          : JSON.parse(q.essentialValues)
        : null,
    }));

    // Apply client-side filtering since Drizzle ORM filtering can be complex
    if (category && category !== "all") {
      parsedQuestions = parsedQuestions.filter((q) => q.category === category);
    }

    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      parsedQuestions = parsedQuestions.filter((q) =>
        q.text.toLowerCase().includes(searchLower)
      );
    }

    if (isActive && isActive !== "all") {
      const activeFilter = isActive === "true";
      parsedQuestions = parsedQuestions.filter(
        (q) => Boolean(q.isActive) === activeFilter
      );
    }

    return NextResponse.json({
      success: true,
      questions: parsedQuestions,
    });
  } catch (error) {
    console.error("Error fetching happiness questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST - Create new happiness question
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      category,
      categoryValues,
      essentialId,
      essentialValues,
      isActive,
    } = body;

    // Validation
    if (!text || !category || !categoryValues) {
      return NextResponse.json(
        { error: "Missing required fields: text, category, categoryValues" },
        { status: 400 }
      );
    }

    if (!Array.isArray(categoryValues) || categoryValues.length !== 5) {
      return NextResponse.json(
        { error: "Category values must be an array of exactly 5 integers" },
        { status: 400 }
      );
    }

    if (
      essentialId &&
      (!Array.isArray(essentialValues) || essentialValues.length !== 5)
    ) {
      return NextResponse.json(
        {
          error:
            "Essential values must be an array of exactly 5 integers when essential is selected",
        },
        { status: 400 }
      );
    }

    const validCategories = [
      "Meaning",
      "Delight",
      "Freedom",
      "Engagement",
      "Vitality",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Find the next available ID
    const lastQuestion = await db
      .select({ id: happinessQuestions.id })
      .from(happinessQuestions)
      .orderBy(desc(happinessQuestions.id))
      .limit(1);

    const nextId = lastQuestion.length > 0 ? lastQuestion[0].id + 1 : 1;

    // Log the data we're trying to insert for debugging
    console.log("🔍 Attempting to insert question:", {
      id: nextId,
      text,
      category,
      categoryValues,
      essentialId,
      essentialValues,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Insert the question (MySQL doesn't support .returning())
    await db.insert(happinessQuestions).values({
      id: nextId,
      text,
      category,
      categoryValues: categoryValues, // MySQL JSON column handles this automatically
      essentialId: essentialId || null,
      essentialValues: essentialValues || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Fetch the inserted question
    const insertedQuestion = await db
      .select()
      .from(happinessQuestions)
      .where(eq(happinessQuestions.id, nextId))
      .limit(1);

    if (insertedQuestion.length === 0) {
      return NextResponse.json(
        { error: "Failed to retrieve inserted question" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      question: {
        ...insertedQuestion[0],
        categoryValues: Array.isArray(insertedQuestion[0].categoryValues)
          ? insertedQuestion[0].categoryValues
          : JSON.parse(insertedQuestion[0].categoryValues),
        essentialValues: insertedQuestion[0].essentialValues
          ? Array.isArray(insertedQuestion[0].essentialValues)
            ? insertedQuestion[0].essentialValues
            : JSON.parse(insertedQuestion[0].essentialValues)
          : null,
      },
    });
  } catch (error) {
    console.error("Error creating happiness question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
