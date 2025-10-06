import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime (disable Edge runtime)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Dynamic import to avoid static generation issues
    const { validateAdminCredentials } = await import(
      "../../../../db/queries/admins"
    );

    // Validate admin credentials using database
    const admin = await validateAdminCredentials(email, password);

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Return admin data (excluding password)
    const { password: _, ...adminData } = admin;

    return NextResponse.json({
      success: true,
      admin: adminData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
