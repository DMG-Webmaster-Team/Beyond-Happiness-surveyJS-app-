/**
 * Test script for Mailgun OTP integration
 * Run with: node scripts/test-mailgun-otp.js
 */

const testMailgunOTP = async () => {
  try {
    console.log("🧪 Testing Mailgun OTP integration...\n");

    // Test 1: Direct Mailgun API route
    console.log("📧 Step 1: Testing /api/send-mail directly...");
    const directResponse = await fetch("http://localhost:4004/api/send-mail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "ahmedalfares2020@gmail.com",
        subject: "Survey Access",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Your one-time password is:</p>
            <h2 style="color: #0067E6">123456</h2>
            <p>Use this OTP to access the survey titled "Survey Access"</p>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code expires in 30 minutes</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
            <p style="color: #666; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      }),
    });

    const directResult = await directResponse.json();

    if (directResult.success) {
      console.log("✅ Direct API test successful!");
      console.log("📧 Message ID:", directResult.messageId);
    } else {
      console.error("❌ Direct API test failed:", directResult.error);
      console.log("🔍 Response details:", directResult);
      return;
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test 2: OTP flow via /api/auth/send-otp
    console.log("📧 Step 2: Testing OTP flow via /api/auth/send-otp...");
    const otpResponse = await fetch("http://localhost:4004/api/auth/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: "ahmedalfares2020@gmail.com",
        method: "email",
        surveyId: "ju0nfj8rwevr1gjjza81x57q",
        surveyTitle: "Survey Access",
      }),
    });

    const otpResult = await otpResponse.json();

    if (otpResult.success) {
      console.log("✅ OTP flow test successful!");
      console.log("📧 OTP sent via:", otpResult.method);
      console.log("🔐 OTP code:", otpResult.otp);
      console.log("📬 Message:", otpResult.message);
    } else {
      console.error("❌ OTP flow test failed:", otpResult.error);
      console.log("🔍 Response details:", otpResult);
    }

    console.log("\n" + "=".repeat(50) + "\n");
    console.log("🎯 Test completed! Check your email for the OTP messages.");
  } catch (error) {
    console.error("❌ Network error:", error.message);
    console.log("💡 Make sure your Next.js server is running on port 4004");
  }
};

// Run the test
testMailgunOTP();
