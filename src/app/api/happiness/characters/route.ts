import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessCharacters } from "@/db/schema/happiness";
import { desc } from "drizzle-orm";

// GET - List all happiness characters
export async function GET() {
  try {
    const characters = await db
      .select()
      .from(happinessCharacters)
      .orderBy(desc(happinessCharacters.id));

    return NextResponse.json({
      success: true,
      characters,
    });
  } catch (error) {
    console.error("Error fetching happiness characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}
