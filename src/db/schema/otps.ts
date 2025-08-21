import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const otps = sqliteTable("otps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  identifier: text("identifier").notNull(), // email or phone
  otp: text("otp").notNull(), // 6-digit code
  expiresAt: integer("expires_at").notNull(), // unix timestamp
  attempts: integer("attempts").default(0), // verification attempts
  maxAttempts: integer("max_attempts").default(3), // max allowed attempts
  method: text("method").notNull(), // "email" or "sms"
  surveyTitle: text("survey_title"), // optional survey context
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  verifiedAt: integer("verified_at"), // when OTP was successfully verified
});

// Indexes for performance
export const otpIndexes = {
  identifierIdx: "otp_identifier_idx",
  expiresAtIdx: "otp_expires_at_idx",
  createdAtIdx: "otp_created_at_idx",
};
