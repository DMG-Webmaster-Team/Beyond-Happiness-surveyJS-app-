import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessQuestions } from "@/db/schema/happiness";
import { eq, like, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET - List happiness questions with filters
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

    // Parse values JSON for each question
    let parsedQuestions = questions.map((q) => ({
      ...q,
      values: JSON.parse(q.values),
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
        (q) => q.isActive === activeFilter
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
    const { text, category, values } = body;

    // Validation
    if (!text || !category || !values) {
      return NextResponse.json(
        { error: "Missing required fields: text, category, values" },
        { status: 400 }
      );
    }

    if (!Array.isArray(values) || values.length !== 5) {
      return NextResponse.json(
        { error: "Values must be an array of exactly 5 integers" },
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

    const newQuestion = await db
      .insert(happinessQuestions)
      .values({
        id: nextId,
        text,
        category,
        values: JSON.stringify(values),
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      question: {
        ...newQuestion[0],
        values: JSON.parse(newQuestion[0].values),
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
