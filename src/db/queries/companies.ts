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
  const companyId = companyData.id || require("nanoid").nanoid();
  await db.insert(companies).values({ ...companyData, id: companyId });
  return { ...companyData, id: companyId };
}

export async function updateCompany(
  id: string,
  companyData: Partial<NewCompany>
): Promise<Company | undefined> {
  const updateData = {
    ...companyData,
    updatedAt: new Date(),
  };

  await db.update(companies).set(updateData).where(eq(companies.id, id));

  const result = await getCompanyById(id);

  return result;
}

export async function deleteCompany(id: string): Promise<boolean> {
  // Check if company exists first
  const existingCompany = await getCompanyById(id);
  if (!existingCompany) {
    return false;
  }

  // Delete the company
  await db.delete(companies).where(eq(companies.id, id));

  return true;
}

export async function getCompaniesCount(): Promise<number> {
  const result = await db.select({ count: companies.id }).from(companies);
  return result.length;
}
