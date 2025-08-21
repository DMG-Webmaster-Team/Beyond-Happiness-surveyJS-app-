import { NextRequest, NextResponse } from "next/server";
import { createCompanySchema } from "@/db/queries/companies";

// GET - List all companies
export async function GET() {
  try {
    // Dynamic import to avoid static generation issues
    const { listCompanies } = await import("../../../db/queries/companies");
    const companies = await listCompanies();

    return NextResponse.json({
      items: companies,
      total: companies.length,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

// POST - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createCompanySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Dynamic import to avoid static generation issues
    const { createCompany, getCompanyByName } = await import(
      "../../../db/queries/companies"
    );

    // Check if company with same name already exists
    const existingCompany = await getCompanyByName(name);
    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this name already exists" },
        { status: 409 }
      );
    }

    const company = await createCompany({
      name,
      description,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
