import { eq } from "drizzle-orm";
import { db } from "../client";
import { admins, type Admin, type NewAdmin } from "../schema/admins";
import { z } from "zod";

// Validation schemas
export const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const loginAdminSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Query functions
export async function getAdminByEmail(email: string): Promise<Admin | undefined> {
  const result = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  return result[0];
}

export async function getAdminById(id: string): Promise<Admin | undefined> {
  const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return result[0];
}

export async function createAdmin(adminData: z.infer<typeof createAdminSchema>): Promise<Admin> {
  const validatedData = createAdminSchema.parse(adminData);
  const result = await db.insert(admins).values(validatedData).returning();
  return result[0];
}

export async function validateAdminCredentials(
  email: string, 
  password: string
): Promise<Admin | null> {
  const validatedData = loginAdminSchema.parse({ email, password });
  const admin = await getAdminByEmail(validatedData.email);
  
  if (admin && admin.password === validatedData.password) {
    return admin;
  }
  
  return null;
}

export async function listAdmins(): Promise<Admin[]> {
  return db.select().from(admins);
}
