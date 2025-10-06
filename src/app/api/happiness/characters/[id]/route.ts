import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessCharacters } from "@/db/schema/happiness";
import { eq } from "drizzle-orm";

// PUT - Update happiness character (description and avatar only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const characterId = parseInt(params.id);
    if (isNaN(characterId)) {
      return NextResponse.json(
        { error: "Invalid character ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description, avatarUrl } = body;

    // Build update object (only allow description and avatarUrl changes)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (description !== undefined) updateData.description = description;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    await db
      .update(happinessCharacters)
      .set(updateData)
      .where(eq(happinessCharacters.id, characterId));

    // Fetch the updated character
    const updatedCharacter = await db
      .select()
      .from(happinessCharacters)
      .where(eq(happinessCharacters.id, characterId))
      .limit(1);

    if (updatedCharacter.length === 0) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      character: updatedCharacter[0],
    });
  } catch (error) {
    console.error("Error updating happiness character:", error);
    return NextResponse.json(
      { error: "Failed to update character" },
      { status: 500 }
    );
  }
}
