import { eq } from "drizzle-orm";
import { getDb } from "../client";
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
export async function getAdminByEmail(
  email: string
): Promise<Admin | undefined> {
  const db = await getDb();
  const result = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);
  return result[0];
}

export async function getAdminById(id: string): Promise<Admin | undefined> {
  const db = await getDb();
  const result = await db
    .select()
    .from(admins)
    .where(eq(admins.id, id))
    .limit(1);
  return result[0];
}

export async function createAdmin(
  adminData: z.infer<typeof createAdminSchema> & { id?: string }
): Promise<Admin> {
  const validatedData = createAdminSchema.parse(adminData);
  const adminId = (adminData as any).id || require("nanoid").nanoid();
  const db = await getDb();
  await db.insert(admins).values({ ...validatedData, id: adminId });
  const createdAdmin = await getAdminById(adminId);
  if (!createdAdmin) {
    throw new Error("Failed to create admin");
  }
  return createdAdmin;
}

export async function validateAdminCredentials(
  email: string,
  password: string
): Promise<Admin | null> {
  try {
    const validatedData = loginAdminSchema.parse({ email, password });
    const admin = await getAdminByEmail(validatedData.email);

    if (admin && admin.password === validatedData.password) {
      return admin;
    }

    return null;
  } catch (error) {
    console.error("Error validating admin credentials:", error);
    throw error; // Re-throw to be handled by the API route
  }
}

export async function listAdmins(): Promise<Admin[]> {
  const db = await getDb();
  return db.select().from(admins);
}
