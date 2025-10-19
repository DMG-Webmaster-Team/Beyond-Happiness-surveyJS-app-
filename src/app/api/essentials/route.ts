import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { essentials } from "@/db/schema/happiness";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json(
        { error: "Category parameter is required" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["Meaning", "Delight", "Freedom", "Engagement", "Vitality"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be one of: " + validCategories.join(", ") },
        { status: 400 }
      );
    }

    // Fetch essentials by category
    const categoryEssentials = await db
      .select({
        id: essentials.id,
        title: essentials.title,
        merit: essentials.merit,
        intent: essentials.intent,
        maxScore: essentials.maxScore,
        value1: essentials.value1,
        value2: essentials.value2,
        value3: essentials.value3,
        value4: essentials.value4,
        value5: essentials.value5,
      })
      .from(essentials)
      .where(eq(essentials.category, category))
      .orderBy(essentials.title);

    return NextResponse.json({
      success: true,
      data: categoryEssentials,
      count: categoryEssentials.length,
    });
  } catch (error) {
    console.error("Error fetching essentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch essentials" },
      { status: 500 }
    );
  }
}

// Get all essentials (for admin purposes)
export async function POST(request: NextRequest) {
  try {
    const allEssentials = await db
      .select()
      .from(essentials)
      .orderBy(essentials.category, essentials.title);

    return NextResponse.json({
      success: true,
      data: allEssentials,
      count: allEssentials.length,
    });
  } catch (error) {
    console.error("Error fetching all essentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch essentials" },
      { status: 500 }
    );
  }
}
