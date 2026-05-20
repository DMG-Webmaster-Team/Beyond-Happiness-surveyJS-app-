import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { happinessCharacters } from "@/db/schema/happiness";
import { asc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// GET - List all happiness characters
// POST - Sync avatar URLs or sync from JSON file

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
export async function GET() {
  try {
    const characters = await db
      .select()
      .from(happinessCharacters)
      .orderBy(asc(happinessCharacters.id));

    // Sync avatar URLs based on ID - ensure they're set based on match code if missing
    const syncedCharacters = characters.map((character) => ({
      ...character,
      avatarUrl: character.avatarUrl || `/characters/${character.match}.png`,
    }));

    return NextResponse.json({
      success: true,
      characters: syncedCharacters,
    });
  } catch (error) {
    console.error("Error fetching happiness characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === "sync-avatars") {
      // Fetch all characters ordered by ID
      const characters = await db
        .select()
        .from(happinessCharacters)
        .orderBy(asc(happinessCharacters.id));

      // Update avatar URLs based on match codes
      let updatedCount = 0;
      for (const character of characters) {
        const expectedAvatarUrl = `/characters/${character.match}.png`;
        
        // Only update if avatar URL is missing or doesn't match the expected pattern
        if (!character.avatarUrl || character.avatarUrl !== expectedAvatarUrl) {
          await db
            .update(happinessCharacters)
            .set({
              avatarUrl: expectedAvatarUrl,
              updatedAt: new Date(),
            })
            .where(eq(happinessCharacters.id, character.id));
          updatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${updatedCount} avatar URLs`,
        updatedCount,
        totalCharacters: characters.length,
      });
    } else if (action === "sync-from-json") {
      // Read the multilingual characters JSON file
      const jsonPath = path.join(
        process.cwd(),
        "data/happiness-characters-multilingual.json"
      );
      
      if (!fs.existsSync(jsonPath)) {
        return NextResponse.json(
          { error: `JSON file not found at: ${jsonPath}` },
          { status: 404 }
        );
      }

      const charactersData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      let updatedCount = 0;
      let notFoundCount = 0;

      // Update each character in the database based on match code
      for (const character of charactersData.characters) {
        // Find character by match code
        const existingCharacters = await db
          .select()
          .from(happinessCharacters)
          .where(eq(happinessCharacters.match, character.match))
          .limit(1);

        if (existingCharacters.length === 0) {
          notFoundCount++;
          continue;
        }

        const existingCharacter = existingCharacters[0];

        // Update character with new data from JSON
        await db
          .update(happinessCharacters)
          .set({
            nameEn: character.name.en,
            nameAr: character.name.ar,
            descriptionEn: character.description.en,
            descriptionAr: character.description.ar,
            avatarUrl: character.avatar_url || `/characters/${character.match}.png`,
            updatedAt: new Date(),
          })
          .where(eq(happinessCharacters.id, existingCharacter.id));

        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${updatedCount} characters from JSON`,
        updatedCount,
        notFoundCount,
        totalInJson: charactersData.characters.length,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'sync-avatars' or 'sync-from-json'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/happiness/characters:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
