import { NextRequest, NextResponse } from "next/server";
import { updateCompanySchema } from "@/db/queries/companies";

// GET - Get a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { getCompanyById } = await import("../../../../db/queries/companies");
    const company = await getCompanyById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

// PUT - Update a company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validation = updateCompanySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Dynamic import to avoid static generation issues
    const { updateCompany, getCompanyByName } = await import(
      "../../../../db/queries/companies"
    );

    // Check if another company with the same name exists
    const existingCompany = await getCompanyByName(name);
    if (existingCompany && existingCompany.id !== id) {
      return NextResponse.json(
        { error: "Another company with this name already exists" },
        { status: 409 }
      );
    }

    const updatedCompany = await updateCompany(id, { name, description });

    if (!updatedCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Dynamic import to avoid static generation issues
    const { deleteCompany } = await import("../../../../db/queries/companies");
    const deleted = await deleteCompany(id);

    if (!deleted) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
