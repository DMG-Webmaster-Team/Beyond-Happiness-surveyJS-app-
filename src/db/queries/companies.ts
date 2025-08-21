import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { companies, type Company, type NewCompany } from "../schema/companies";
import { z } from "zod";

// Validation schemas
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
});

// Query functions
export async function getCompanyById(id: string): Promise<Company | undefined> {
  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return company[0];
}

export async function getCompanyByName(
  name: string
): Promise<Company | undefined> {
  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.name, name))
    .limit(1);
  return company[0];
}

export async function listCompanies(): Promise<Company[]> {
  return db.select().from(companies).orderBy(desc(companies.createdAt));
}

export async function createCompany(companyData: NewCompany): Promise<Company> {
  const result = await db.insert(companies).values(companyData).returning();
  return result[0];
}

export async function updateCompany(
  id: string,
  companyData: Partial<NewCompany>
): Promise<Company | undefined> {
  const updateData = {
    ...companyData,
    updatedAt: Date.now(),
  };

  const result = await db
    .update(companies)
    .set(updateData)
    .where(eq(companies.id, id))
    .returning();

  return result[0];
}

export async function deleteCompany(id: string): Promise<boolean> {
  const result = await db.delete(companies).where(eq(companies.id, id));

  return result.changes > 0;
}

export async function getCompaniesCount(): Promise<number> {
  const result = await db.select({ count: companies.id }).from(companies);
  return result.length;
}
