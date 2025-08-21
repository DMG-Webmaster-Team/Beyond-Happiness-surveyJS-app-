import { db } from "../client";
import { otps } from "../schema/otps";
import { eq, and, lt } from "drizzle-orm";

// Create a new OTP
export async function createOTP(params: {
  identifier: string;
  otp: string;
  method: "email" | "sms";
  surveyTitle?: string;
  expiryMinutes?: number;
}): Promise<void> {
  const { identifier, otp, method, surveyTitle, expiryMinutes = 30 } = params;

  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

  // Delete any existing OTPs for this identifier
  await db.delete(otps).where(eq(otps.identifier, identifier));

  // Insert new OTP
  await db.insert(otps).values({
    identifier,
    otp,
    expiresAt,
    method,
    surveyTitle,
    attempts: 0,
    maxAttempts: 3,
  });
}

// Get OTP by identifier
export async function getOTP(identifier: string) {
  const result = await db
    .select()
    .from(otps)
    .where(eq(otps.identifier, identifier))
    .limit(1);

  return result[0];
}

// Verify OTP
export async function verifyOTP(
  identifier: string,
  otp: string
): Promise<{
  valid: boolean;
  message: string;
  record?: any;
}> {
  const record = await getOTP(identifier);

  if (!record) {
    return {
      valid: false,
      message: "OTP expired or not found. Please request a new one.",
    };
  }

  // Check if expired
  if (Date.now() > record.expiresAt) {
    await db.delete(otps).where(eq(otps.id, record.id));
    return {
      valid: false,
      message: "OTP has expired. Please request a new one.",
    };
  }

  // Check attempts
  if ((record.attempts || 0) >= (record.maxAttempts || 3)) {
    await db.delete(otps).where(eq(otps.id, record.id));
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new OTP.",
    };
  }

  // Verify OTP
  if (record.otp === otp) {
    // Mark as verified and delete
    await db.delete(otps).where(eq(otps.id, record.id));
    return {
      valid: true,
      message: "OTP verified successfully!",
      record,
    };
  }

  // Increment attempts
  const currentAttempts = record.attempts || 0;
  const maxAttempts = record.maxAttempts || 3;

  await db
    .update(otps)
    .set({ attempts: currentAttempts + 1 })
    .where(eq(otps.id, record.id));

  return {
    valid: false,
    message: `Invalid OTP. ${
      maxAttempts - (currentAttempts + 1)
    } attempts remaining.`,
  };
}

// Clean up expired OTPs
export async function cleanupExpiredOTPs(): Promise<number> {
  const now = Date.now();
  const result = await db.delete(otps).where(lt(otps.expiresAt, now));
  return result.changes || 0;
}

// Get OTP statistics
export async function getOTPStats() {
  const total = await db.select({ count: otps.id }).from(otps);
  const expired = await db
    .select({ count: otps.id })
    .from(otps)
    .where(lt(otps.expiresAt, Date.now()));

  return {
    total: total.length,
    expired: expired.length,
    active: total.length - expired.length,
  };
}
