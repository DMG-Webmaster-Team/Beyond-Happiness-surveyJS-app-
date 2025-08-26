import nodemailer from "nodemailer";
import twilio from "twilio";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 30;
const MAX_OTP_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; lastSentAt: number }>();

// Generate a random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check rate limiting
const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    rateLimitStore.set(identifier, { count: 1, lastSentAt: now });
    return true;
  }

  // Reset if outside window
  if (now - record.lastSentAt > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.lastSentAt = now;
    return true;
  }

  // Check if within limit
  if (record.count >= 3) {
    return false;
  }

  record.count++;
  record.lastSentAt = now;
  return true;
};

// Helper function to determine if identifier is email
const isEmail = (id: string) => id.includes("@");

// Store OTP in users table only
export async function storeOTP(identifier: string, otp: string) {
  try {
    console.log(`🔐 Storing OTP in users table for ${identifier}: ${otp}`);

    const where = isEmail(identifier)
      ? eq(users.email, identifier)
      : eq(users.phone, identifier.replace(/\s+/g, ""));

    // Store OTP with current timestamp - use updatedAt (Drizzle column name)
    const result = await db
      .update(users)
      .set({
        otp: otp,
        updatedAt: Date.now(),
      })
      .where(where);

    console.log(`✅ OTP stored successfully in users table for ${identifier}`);
    console.log(`📊 Database update result:`, result);
  } catch (error) {
    console.error(`❌ Failed to store OTP in users table:`, error);
    throw error;
  }
}

// Get OTP row from users table
export async function getOTPRow(identifier: string) {
  try {
    const where = isEmail(identifier)
      ? eq(users.email, identifier)
      : eq(users.phone, identifier.replace(/\s+/g, ""));

    const row = await db
      .select({
        otp: users.otp,
        updatedAt: users.updatedAt,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(where)
      .limit(1);

    console.log(
      `🔍 Retrieved OTP row for ${identifier}:`,
      row[0] || "Not found"
    );
    return row[0] ?? null;
  } catch (error) {
    console.error(`❌ Error getting OTP row:`, error);
    return null;
  }
}

// Clear OTP from users table
export async function clearOTP(identifier: string) {
  try {
    const where = isEmail(identifier)
      ? eq(users.email, identifier)
      : eq(users.phone, identifier.replace(/\s+/g, ""));

    const result = await db
      .update(users)
      .set({
        otp: null,
        updatedAt: Date.now(),
      })
      .where(where);

    console.log(` Cleared OTP for ${identifier}`);
    console.log(`📊 Clear result:`, result);
  } catch (error) {
    console.error(`❌ Error clearing OTP:`, error);
    throw error;
  }
}

// Send OTP via Email
const sendOTPEmail = async (
  email: string,
  otp: string,
  surveyTitle?: string
): Promise<boolean> => {
  try {
    // Check if email is configured
    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === "your-email@gmail.com" ||
      process.env.EMAIL_PASS === "your-app-password" ||
      process.env.EMAIL_PASS === "YOUR_GMAIL_APP_PASSWORD" ||
      !process.env.EMAIL_USER.includes("@gmail.com")
    ) {
      console.log(`📧 Email not configured - cannot send OTP to ${email}`);
      console.log(` Add EMAIL_USER and EMAIL_PASS to your .env.local file`);
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@surveyjs.com",
      to: email,
      subject: surveyTitle
        ? `Survey Access Code - ${surveyTitle}`
        : "Your Survey Access Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🔐 Survey Access Code</h2>
          ${surveyTitle ? `<p><strong>Survey:</strong> ${surveyTitle}</p>` : ""}
          <p>Your 6-digit access code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This code expires in ${OTP_EXPIRY_MINUTES} minutes</li>
            <li>Do not share this code with anyone</li>
            <li>If you didn't request this code, please ignore this email</li>
          </ul>
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error);
    return false;
  }
};

// Send OTP via SMS
const sendOTPSMS = async (
  phone: string,
  otp: string,
  surveyTitle?: string
): Promise<boolean> => {
  try {
    // Check if Twilio is configured
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER ||
      process.env.TWILIO_ACCOUNT_SID === "your-account-sid" ||
      process.env.TWILIO_AUTH_TOKEN === "your-auth-token" ||
      process.env.TWILIO_PHONE_NUMBER === "your-twilio-phone-number"
    ) {
      console.log(`📱 Twilio not configured - cannot send SMS to ${phone}`);
      console.log(`💡 Add TWILIO credentials to your .env.local file`);
      return false;
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body: `Your survey access code is: ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.${
        surveyTitle ? ` Survey: ${surveyTitle}` : ""
      }`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`📱 OTP SMS sent successfully to ${phone}: ${message.sid}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send OTP SMS to ${phone}:`, error);
    return false;
  }
};

// Main function to send OTP
export const sendOTP = async (
  identifier: string,
  method: "email" | "sms" | "both" = "both",
  surveyTitle?: string
): Promise<{
  success: boolean;
  error?: string;
  method: "email" | "sms" | "none";
  message: string;
  otp?: string;
}> => {
  try {
    console.log(`🚀 Starting OTP send for identifier: "${identifier}"`);
    console.log(`🔑 Method requested: ${method}`);
    console.log(`📧 Is email: ${identifier.includes("@")}`);

    // Check rate limiting
    if (!checkRateLimit(identifier)) {
      return {
        success: false,
        error: "Too many OTP requests. Please wait before trying again.",
        method: "none",
        message: "Too many OTP requests. Please wait before trying again.",
      };
    }

    // Generate OTP
    const otp = generateOTP();
    console.log(`🔐 Generated OTP: ${otp}`);

    // Determine if identifier is email or phone
    const isEmailIdentifier = identifier.includes("@");
    const isPhone =
      !isEmailIdentifier && identifier.replace(/\D/g, "").length >= 7;

    let emailSuccess = false;
    let smsSuccess = false;

    // Send OTP based on method and identifier type
    if (method === "email" || method === "both") {
      if (isEmailIdentifier) {
        emailSuccess = await sendOTPEmail(identifier, otp, surveyTitle);
      }
    }

    if (method === "sms" || method === "both") {
      if (isPhone) {
        smsSuccess = await sendOTPSMS(identifier, otp, surveyTitle);
      }
    }

    // Fallback logic - only try email fallback if the identifier is actually an email
    if (!emailSuccess && !smsSuccess) {
      if (isEmailIdentifier) {
        // Retry email if it's an email address
        emailSuccess = await sendOTPEmail(identifier, otp, surveyTitle);
      } else if (isPhone && !smsSuccess) {
        // For phone numbers, provide specific error message if SMS fails
        console.log(`📱 SMS failed for phone number: ${identifier}`);
        console.log(
          `⚠️ Twilio not configured - cannot send SMS to phone numbers`
        );
      }
    }

    // Store OTP if any method succeeded
    if (emailSuccess || smsSuccess) {
      console.log(`💾 About to store OTP for identifier: "${identifier}"`);
      const method = emailSuccess ? "email" : "sms";

      // Store OTP in users table
      await storeOTP(identifier, otp);
      console.log(`✅ OTP stored successfully for ${identifier}`);

      return {
        success: true,
        method,
        message: emailSuccess
          ? `OTP sent successfully via email`
          : `OTP sent successfully via ${emailSuccess ? "email" : "sms"}`,
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
      };
    }

    // Provide specific error messages based on what failed
    if (isPhone && !smsSuccess) {
      return {
        success: false,
        error:
          "SMS service is not configured. Please use an email address or contact support to enable SMS.",
        method: "none",
        message:
          "SMS service is not configured. Please use an email address or contact support to enable SMS.",
      };
    } else if (isEmailIdentifier && !emailSuccess) {
      return {
        success: false,
        error:
          "Failed to send OTP via email. Please check your email address and try again.",
        method: "none",
        message:
          "Failed to send OTP via email. Please check your email address and try again.",
      };
    } else {
      return {
        success: false,
        error: "Failed to send OTP via any method. Please try again later.",
        method: "none",
        message: "Failed to send OTP via any method. Please try again later.",
      };
    }
  } catch (error) {
    console.error(`❌ Error in sendOTP:`, error);
    return {
      success: false,
      error: "An error occurred while sending OTP. Please try again.",
      method: "none",
      message: "An error occurred while sending OTP. Please try again.",
    };
  }
};

// Verify OTP from users table
export const verifyOTP = async (
  identifier: string,
  input: string
): Promise<{
  valid: boolean;
  message: string;
  record?: any;
}> => {
  try {
    console.log(`🔍 Verifying OTP for ${identifier}: ${input}`);

    const row = await getOTPRow(identifier);
    if (!row?.otp) {
      console.log(`❌ No OTP found for ${identifier}`);
      return { valid: false, message: "OTP expired or not found." };
    }

    console.log(`✅ OTP row found:`, {
      hasOtp: !!row.otp,
      updatedAt: row.updatedAt,
      email: row.email,
      phone: row.phone,
    });

    // Check if expired (30 minutes from updatedAt)
    const expiryTime =
      (row.updatedAt || Date.now()) + OTP_EXPIRY_MINUTES * 60 * 1000;
    const now = Date.now();

    console.log(`⏰ OTP expiry check:`, {
      now: new Date(now).toISOString(),
      expiryTime: new Date(expiryTime).toISOString(),
      isExpired: now > expiryTime,
      timeRemaining: Math.round((expiryTime - now) / 1000 / 60),
    });

    if (now > expiryTime) {
      console.log(`⏰ OTP expired for ${identifier}, clearing it`);
      await clearOTP(identifier);
      return {
        valid: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // Verify OTP
    if (row.otp !== input) {
      console.log(
        `❌ OTP mismatch for ${identifier}: expected ${row.otp}, got ${input}`
      );
      return { valid: false, message: "Invalid OTP. Please try again." };
    }

    console.log(`✅ OTP verified successfully for ${identifier}, clearing it`);
    await clearOTP(identifier);
    return { valid: true, message: "OTP verified successfully!" };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return {
      valid: false,
      message: "Error verifying OTP. Please try again.",
    };
  }
};

// Get OTP status
export const getOTPStatus = async (
  identifier: string
): Promise<{
  exists: boolean;
  attempts?: number;
  expiresAt?: number;
}> => {
  try {
    const record = await getOTPRow(identifier);

    if (!record || !record.otp) {
      return {
        exists: false,
        attempts: 0,
        expiresAt: undefined,
      };
    }

    return {
      exists: true,
      attempts: 0, // Not tracked in users table
      expiresAt:
        (record.updatedAt || Date.now()) + OTP_EXPIRY_MINUTES * 60 * 1000,
    };
  } catch (error) {
    console.error("Error getting OTP status:", error);
    return {
      exists: false,
      attempts: 0,
      expiresAt: undefined,
    };
  }
};

// Clean up expired OTPs from users table
export const cleanupExpiredOTPs = async (): Promise<number> => {
  try {
    const now = Date.now();
    const expiryTime = now - OTP_EXPIRY_MINUTES * 60 * 1000;

    console.log(`🧹 Starting cleanup of expired OTPs`);
    console.log(`⏰ Current time: ${new Date(now).toISOString()}`);
    console.log(`⏰ Expiry threshold: ${new Date(expiryTime).toISOString()}`);

    // Find users with OTPs
    const usersWithOTPs = await db
      .select({
        id: users.id,
        email: users.email,
        otp: users.otp,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(sql`${users.otp} IS NOT NULL`);

    console.log(`📊 Found ${usersWithOTPs.length} users with OTPs`);

    let cleanedCount = 0;
    for (const user of usersWithOTPs) {
      const userExpiryTime =
        (user.updatedAt || now) + OTP_EXPIRY_MINUTES * 60 * 1000;
      if (now > userExpiryTime) {
        await db.update(users).set({ otp: null }).where(eq(users.id, user.id));
        cleanedCount++;
        console.log(`🧹 Cleared expired OTP for user: ${user.email}`);
      }
    }

    console.log(`✅ Cleaned up ${cleanedCount} expired OTPs from users table`);
    return cleanedCount;
  } catch (error) {
    console.error("Error cleaning up expired OTPs:", error);
    return 0;
  }
};

// Run cleanup every 30 minutes to avoid clearing active OTPs
setInterval(async () => {
  try {
    await cleanupExpiredOTPs();
  } catch (error) {
    console.error(`❌ Error in cleanup interval:`, error);
  }
}, 30 * 60 * 1000);
