import { NextRequest, NextResponse } from "next/server";
import { validateAdminCredentials } from "../../../../db/queries/admins";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

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
