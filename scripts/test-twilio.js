const twilio = require("twilio");
const fs = require("fs");
const path = require("path");

// Simple .env.local parser
function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.log("❌ .env.local file not found");
    return {};
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const env = {};

  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").replace(/"/g, "").trim();
      if (value && !key.startsWith("#")) {
        env[key.trim()] = value;
      }
    }
  });

  return env;
}

async function testTwilio() {
  console.log("🧪 Testing Twilio SMS Configuration...\n");

  // Load environment variables
  const env = loadEnvFile();

  // Check environment variables
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const phoneNumber = env.TWILIO_PHONE_NUMBER;

  console.log("📋 Environment Variables Check:");
  console.log(`   Account SID: ${accountSid ? "✅ Set" : "❌ Missing"}`);
  console.log(`   Auth Token: ${authToken ? "✅ Set" : "❌ Missing"}`);
  console.log(`   Phone Number: ${phoneNumber ? "✅ Set" : "❌ Missing"}\n`);

  if (!accountSid || !authToken || !phoneNumber) {
    console.log("❌ Missing required Twilio environment variables!");
    console.log(
      "💡 Please update your .env.local file with real Twilio credentials."
    );
    return;
  }

  // Test Twilio client creation
  try {
    const client = twilio(accountSid, authToken);
    console.log("✅ Twilio client created successfully");

    // Test account info (this will verify credentials)
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ Account verified: ${account.friendlyName || accountSid}`);
    console.log(`✅ Account status: ${account.status}`);

    // Test phone number format
    if (phoneNumber.startsWith("+")) {
      console.log("✅ Phone number format is correct (starts with +)");
    } else {
      console.log("⚠️ Phone number should start with + (e.g., +1234567890)");
    }

    console.log("\n🎉 Twilio configuration is working!");
    console.log("📱 You can now send SMS OTPs to phone numbers.");
  } catch (error) {
    console.log("❌ Twilio configuration failed:");
    console.log(`   Error: ${error.message}`);

    if (error.message.includes("not found")) {
      console.log("💡 Check your Account SID and Auth Token");
    } else if (error.message.includes("not a valid phone number")) {
      console.log("💡 Check your TWILIO_PHONE_NUMBER format");
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testTwilio()
    .then(() => {
      console.log("\n✨ Test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}

module.exports = { testTwilio };
