import nodemailer from "nodemailer";
import twilio from "twilio";
import {
  createOTP,
  verifyOTP as verifyOTPDB,
  getOTP,
  cleanupExpiredOTPs as cleanupExpiredOTPsDB,
} from "../../db/queries/otps";

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 30; // Increased to 30 minutes for testing
const MAX_OTP_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_OTP_PER_WINDOW = 3;

// Rate limiting storage (keep in memory for performance)
const rateLimitStore = new Map<
  string,
  {
    lastSentAt: number;
    countInWindow: number;
    windowStart: number;
  }
>();

// Email transporter configuration
const createEmailTransporter = async () => {
  // Check if we have proper Gmail credentials
  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    process.env.EMAIL_USER === "your-email@gmail.com" ||
    process.env.EMAIL_PASS === "your-app-password" ||
    process.env.EMAIL_PASS === "YOUR_GMAIL_APP_PASSWORD" ||
    !process.env.EMAIL_USER.includes("@gmail.com") // Ensure it's a Gmail address
  ) {
    console.log("⚠️ Gmail credentials not configured, using test mode");
    return null;
  }

  // Use Gmail SMTP configuration
  console.log(`🔧 Creating Gmail transporter for: ${process.env.EMAIL_USER}`);

  try {
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
      debug: true, // Enable debug output for troubleshooting
    });

    // Test the connection
    await transporter.verify();
    console.log("✅ Gmail SMTP connection verified successfully");
    return transporter;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ Gmail SMTP connection failed: ${errorMessage}`);

    // Check for specific Gmail authentication errors
    if (errorMessage.includes("Invalid login")) {
      console.log("🚨 Gmail authentication failed");
      console.log(
        "💡 Make sure you're using an App Password, not your regular password"
      );
      console.log("🔗 Visit: https://myaccount.google.com/apppasswords");
    }

    return null;
  }
};

// Alternative Gmail configurations if the main one fails
const createAlternativeEmailTransporter = async () => {
  // Try different Gmail SMTP configurations
  const configs = [
    {
      name: "Gmail SSL",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    },
    {
      name: "Gmail TLS",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    },
  ];

  // Try each configuration
  for (const config of configs) {
    try {
      const transporter = nodemailer.createTransport(config);
      // Test the connection - verify() is async
      await transporter.verify();
      console.log(
        `✅ Alternative transporter created successfully with ${config.name}`
      );
      return transporter;
    } catch (error) {
      console.log(
        `⚠️ Failed to create transporter with ${config.name}:`,
        error instanceof Error ? error.message : String(error)
      );
      continue;
    }
  }

  return null;
};

// Twilio client configuration
const createTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

// Generate random OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check rate limiting
const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    rateLimitStore.set(identifier, {
      lastSentAt: now,
      countInWindow: 1,
      windowStart: now,
    });
    return true;
  }

  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record.windowStart = now;
    record.countInWindow = 0;
  }

  // Check attempts within window
  if (record.countInWindow >= MAX_OTP_PER_WINDOW) {
    return false;
  }

  // Check overall attempts (now handled in database)
  // if (record.attempts >= MAX_OTP_ATTEMPTS) {
  //   return false;
  // }

  return true;
};

// Store OTP in database
const storeOTP = async (
  identifier: string,
  otp: string,
  method: "email" | "sms",
  surveyTitle?: string
): Promise<void> => {
  try {
    console.log(`🔐 Storing OTP in database for ${identifier}: ${otp}`);
    console.log(`⏰ Expires in: ${OTP_EXPIRY_MINUTES} minutes`);

    await createOTP({
      identifier,
      otp,
      method,
      surveyTitle,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    console.log(`✅ OTP stored successfully in database`);
  } catch (error) {
    console.error(`❌ Failed to store OTP in database:`, error);
    throw error;
  }
};

// Send OTP via Email
export const sendOTPEmail = async (
  email: string,
  otp: string,
  surveyTitle?: string
): Promise<boolean> => {
  try {
    let transporter = await createEmailTransporter();

    // If main transporter fails, try alternative configurations
    if (!transporter) {
      console.log("⚠️ Main Gmail configuration failed, trying alternatives...");
      transporter = await createAlternativeEmailTransporter();
    }

    // Log what we're using
    if (transporter) {
      console.log("✅ Email transporter created successfully");
    } else {
      console.log(
        "❌ No email transporter available, falling back to test mode"
      );
    }

    // If no transporter (test mode), just log the OTP
    if (!transporter) {
      console.log(`🔐 [TEST MODE] OTP for ${email}: ${otp}`);
      console.log(
        `📧 Email would be sent with subject: ${
          surveyTitle
            ? `Survey Access Code - ${surveyTitle}`
            : "Your Survey Access Code"
        }`
      );
      return true; // Return true in test mode
    }

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
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error);
    return false;
  }
};

// Send OTP via SMS
export const sendOTPSMS = async (
  phone: string,
  otp: string,
  surveyTitle?: string
): Promise<boolean> => {
  try {
    const client = createTwilioClient();
    if (!client) {
      console.log(`📱 Twilio not configured - cannot send SMS to ${phone}`);
      console.log(
        `💡 To enable SMS, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local`
      );
      return false;
    }

    // Check if Twilio phone number is configured
    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.log(
        `📱 Twilio phone number not configured - cannot send SMS to ${phone}`
      );
      console.log(`💡 Add TWILIO_PHONE_NUMBER to your .env.local file`);
      return false;
    }

    const message = await client.messages.create({
      body: `Your survey access code is: ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.${
        surveyTitle ? ` Survey: ${surveyTitle}` : ""
      }`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`✅ OTP SMS sent to ${phone}, SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP SMS to ${phone}:`, error);

    // Provide specific error information
    if (error instanceof Error) {
      if (error.message.includes("not a valid phone number")) {
        console.log(`📱 Invalid phone number format: ${phone}`);
      } else if (error.message.includes("not verified")) {
        console.log(`📱 Phone number not verified in Twilio: ${phone}`);
      } else if (error.message.includes("insufficient funds")) {
        console.log(`📱 Twilio account has insufficient funds`);
      }
    }

    return false;
  }
};

// Send OTP with smart fallback
export const sendOTP = async (
  identifier: string,
  method: "email" | "sms" | "both" = "both",
  surveyTitle?: string
): Promise<{
  success: boolean;
  method: "email" | "sms" | "none";
  message: string;
  otp?: string; // Optional OTP for test mode
}> => {
  try {
    console.log(`🚀 Starting OTP send for identifier: "${identifier}"`);
    console.log(`🔑 Identifier type: ${typeof identifier}`);
    console.log(`📧 Is email: ${identifier.includes("@")}`);

    // Check rate limiting
    if (!checkRateLimit(identifier)) {
      return {
        success: false,
        method: "none",
        message: "Too many OTP requests. Please wait before trying again.",
      };
    }

    // Generate OTP
    const otp = generateOTP();

    // Determine identifier type and method
    const isEmail = identifier.includes("@");
    const isPhone = /^\+?[\d\s\-\(\)]+$/.test(identifier);

    let emailSuccess = false;
    let smsSuccess = false;

    // Send based on method preference
    if (method === "email" || method === "both") {
      if (isEmail) {
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
      if (isEmail) {
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
      await storeOTP(identifier, otp, method, surveyTitle);

      // Check if we're in test mode (no real email credentials)
      const isTestMode =
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS ||
        process.env.EMAIL_USER === "your-email@gmail.com" ||
        process.env.EMAIL_PASS === "your-app-password" ||
        process.env.EMAIL_PASS === "YOUR_16_CHAR_APP_PASSWORD_HERE";

      return {
        success: true,
        method: emailSuccess ? "email" : "sms",
        message: emailSuccess
          ? `OTP sent successfully via email`
          : `OTP sent successfully via ${emailSuccess ? "email" : "sms"}`,
        otp: isTestMode ? otp : undefined, // Include OTP in test mode
      };
    }

    // Provide specific error messages based on what failed
    if (isPhone && !smsSuccess) {
      return {
        success: false,
        method: "none",
        message:
          "SMS service is not configured. Please use an email address or contact support to enable SMS.",
      };
    } else if (isEmail && !emailSuccess) {
      return {
        success: false,
        method: "none",
        message:
          "Failed to send OTP via email. Please check your email address and try again.",
      };
    } else {
      return {
        success: false,
        method: "none",
        message: "Failed to send OTP via any method. Please try again later.",
      };
    }
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return {
      success: false,
      method: "none",
      message: "An error occurred while sending OTP. Please try again.",
    };
  }
};

// Verify OTP using database
export const verifyOTP = async (
  identifier: string,
  otp: string
): Promise<{
  valid: boolean;
  message: string;
}> => {
  console.log(`🔍 Verifying OTP for ${identifier}: ${otp}`);

  try {
    const result = await verifyOTPDB(identifier, otp);
    console.log(`✅ OTP verification result:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error verifying OTP:`, error);
    return {
      valid: false,
      message: "An error occurred during verification. Please try again.",
    };
  }
};

// Get OTP status from database
export const getOTPStatus = async (
  identifier: string
): Promise<{
  exists: boolean;
  attempts: number;
  expiresAt: number | null;
}> => {
  try {
    const record = await getOTP(identifier);

    if (!record) {
      return {
        exists: false,
        attempts: 0,
        expiresAt: null,
      };
    }

    return {
      exists: true,
      attempts: record.attempts || 0,
      expiresAt: record.expiresAt || null,
    };
  } catch (error) {
    console.error(`❌ Error getting OTP status:`, error);
    return {
      exists: false,
      attempts: 0,
      expiresAt: null,
    };
  }
};

// Clean up expired OTPs from database
export const cleanupExpiredOTPs = async (): Promise<number> => {
  try {
    const cleanedCount = await cleanupExpiredOTPsDB();
    console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs from database`);
    return cleanedCount;
  } catch (error) {
    console.error(`❌ Error cleaning up expired OTPs:`, error);
    return 0;
  }
};

// Run cleanup every 5 minutes
setInterval(async () => {
  try {
    await cleanupExpiredOTPs();
  } catch (error) {
    console.error(`❌ Error in cleanup interval:`, error);
  }
}, 5 * 60 * 1000);
