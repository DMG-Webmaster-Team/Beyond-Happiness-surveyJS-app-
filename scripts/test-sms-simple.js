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

async function testSMSSimple() {
  console.log("🧪 Testing SMS Configuration (Simple)...\n");

  // Load environment variables
  const env = loadEnvFile();

  console.log("📋 Current Configuration:");
  console.log(`   Account SID: ${env.TWILIO_ACCOUNT_SID}`);
  console.log(
    `   Auth Token: ${
      env.TWILIO_AUTH_TOKEN
        ? "***" + env.TWILIO_AUTH_TOKEN.slice(-4)
        : "Not set"
    }`
  );
  console.log(`   Phone Number: ${env.TWILIO_PHONE_NUMBER}\n`);

  // Check if credentials look valid
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_PHONE_NUMBER
  ) {
    console.log("❌ Missing required Twilio credentials");
    return;
  }

  // Check Account SID format
  if (!env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
    console.log("⚠️ Account SID format issue:");
    console.log("   - Expected: Starts with 'AC' (e.g., AC1234567890...)");
    console.log(
      "   - Found: Starts with '" + env.TWILIO_ACCOUNT_SID.substring(0, 2) + "'"
    );
    console.log("   - This might be a different type of account or service");
  }

  // Check phone number format
  if (!env.TWILIO_PHONE_NUMBER.startsWith("+")) {
    console.log("⚠️ Phone number should start with + (e.g., +15551234567)");
  }

  console.log("\n💡 Next Steps:");
  console.log(
    "1. Verify your Twilio credentials at https://console.twilio.com/"
  );
  console.log(
    "2. Make sure you're using the main Account SID (starts with AC)"
  );
  console.log("3. Check if you have a different type of Twilio account");
  console.log("4. Ensure your account has SMS capabilities enabled");

  console.log("\n🔍 Testing with current credentials...");

  try {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio client created successfully");

    // Try to get account info
    try {
      const account = await client.api.accounts(env.TWILIO_ACCOUNT_SID).fetch();
      console.log(
        `✅ Account verified: ${account.friendlyName || env.TWILIO_ACCOUNT_SID}`
      );
      console.log(`✅ Account status: ${account.status}`);
    } catch (accountError) {
      console.log("⚠️ Could not verify account details:");
      console.log(`   Error: ${accountError.message}`);
    }
  } catch (error) {
    console.log("❌ Twilio client creation failed:");
    console.log(`   Error: ${error.message}`);

    if (error.message.includes("accountSid must start with AC")) {
      console.log("\n🔧 Solution:");
      console.log("   - Go to https://console.twilio.com/");
      console.log("   - Look for 'Account SID' in the main dashboard");
      console.log("   - It should start with 'AC' followed by 32 characters");
      console.log(
        "   - The 'US' prefix suggests you might be looking at a different credential"
      );
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testSMSSimple()
    .then(() => {
      console.log("\n✨ Test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}

module.exports = { testSMSSimple };
