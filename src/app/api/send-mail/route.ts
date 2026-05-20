import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime (disable Edge runtime)
export const runtime = 'nodejs';
interface MailgunRequest {
  to: string;
  subject: string;
  html: string;
  cc?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: MailgunRequest = await request.json();
    const { to, subject, html, cc } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      console.error("❌ Missing required fields:", {
        to: !!to,
        subject: !!subject,
        html: !!html,
      });
      return NextResponse.json(
        {
          error: "Missing required fields. Please provide: to, subject, html",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error("❌ Invalid 'to' email format:", to);
      return NextResponse.json(
        { error: "Invalid 'to' email address format" },
        { status: 400 }
      );
    }

    if (cc && !emailRegex.test(cc)) {
      console.error("❌ Invalid 'cc' email format:", cc);
      return NextResponse.json(
        { error: "Invalid 'cc' email address format" },
        { status: 400 }
      );
    }

    // Get Mailgun configuration from environment
    const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
    const MAILGUN_FROM = process.env.MAILGUN_FROM;
    const MAILGUN_API_URL = process.env.MAILGUN_API_URL;
    const MAILGUN_PRIVATE_API_KEY = process.env.MAILGUN_PRIVATE_API_KEY;

    // Validate environment variables
    if (
      !MAILGUN_DOMAIN ||
      !MAILGUN_FROM ||
      !MAILGUN_API_URL ||
      !MAILGUN_PRIVATE_API_KEY
    ) {
      console.error("❌ Missing Mailgun environment variables");
      return NextResponse.json(
        {
          error: "Server configuration error. Mailgun not properly configured.",
        },
        { status: 500 }
      );
    }

    // Prepare form data for Mailgun API (using URLSearchParams for proper encoding)
    const formData = new URLSearchParams();
    formData.append("from", MAILGUN_FROM);
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("html", html);

    if (cc) {
      formData.append("cc", cc);
    }

    // Make request to Mailgun API
    const mailgunUrl = `${MAILGUN_API_URL}/${MAILGUN_DOMAIN}/messages`;

    // Use Bearer token as specified in the curl example
    const response = await fetch(mailgunUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILGUN_PRIVATE_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (response.ok) {

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        messageId: result.id,
      });
    } else {
      console.error("❌ Mailgun API error:", {
        status: response.status,
        statusText: response.statusText,
        result,
      });
      return NextResponse.json(
        {
          error: `Failed to send email: ${result.message || "Unknown error"}`,
          details: result,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("❌ Email sending error:", error);
    return NextResponse.json(
      {
        error: "Internal server error while sending email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
