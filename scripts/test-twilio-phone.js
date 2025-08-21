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

async function testTwilioPhone() {
  console.log("🧪 Testing Twilio Phone Number Validation...\n");

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

  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_PHONE_NUMBER
  ) {
    console.log("❌ Missing required Twilio credentials");
    return;
  }

  try {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio client created successfully");

    // Test account info
    try {
      const account = await client.api.accounts(env.TWILIO_ACCOUNT_SID).fetch();
      console.log(
        `✅ Account verified: ${account.friendlyName || env.TWILIO_ACCOUNT_SID}`
      );
      console.log(`✅ Account status: ${account.status}`);
    } catch (accountError) {
      console.log("⚠️ Could not verify account details:", accountError.message);
    }

    // List all phone numbers in your account
    console.log("\n📱 Checking your Twilio phone numbers...");
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list();

      if (phoneNumbers.length === 0) {
        console.log("❌ No phone numbers found in your Twilio account!");
        console.log(
          "💡 You need to purchase a phone number for SMS functionality"
        );
        console.log(
          "🔗 Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/active"
        );
      } else {
        console.log(
          `✅ Found ${phoneNumbers.length} phone number(s) in your account:`
        );
        phoneNumbers.forEach((phone, index) => {
          console.log(
            `   ${index + 1}. ${phone.phoneNumber} (${
              phone.friendlyName || "No name"
            })`
          );
          console.log(
            `      Capabilities: SMS=${phone.capabilities.SMS}, Voice=${phone.capabilities.voice}`
          );
          console.log(`      Status: ${phone.status}`);
        });

        // Check if your configured number exists
        const configuredNumber = phoneNumbers.find(
          (p) => p.phoneNumber === env.TWILIO_PHONE_NUMBER
        );
        if (configuredNumber) {
          console.log(
            `\n✅ Your configured number ${env.TWILIO_PHONE_NUMBER} is found in Twilio!`
          );
          console.log(`   Status: ${configuredNumber.status}`);
          console.log(`   SMS Capable: ${configuredNumber.capabilities.SMS}`);
        } else {
          console.log(
            `\n❌ Your configured number ${env.TWILIO_PHONE_NUMBER} is NOT found in Twilio!`
          );
          console.log("💡 You need to either:");
          console.log("   1. Purchase this number in Twilio, or");
          console.log(
            "   2. Update your .env.local with one of the numbers above"
          );
        }
      }
    } catch (phoneError) {
      console.log("❌ Could not list phone numbers:", phoneError.message);
    }
  } catch (error) {
    console.log("❌ Twilio client creation failed:");
    console.log(`   Error: ${error.message}`);
  }
}

// Run test if called directly
if (require.main === module) {
  testTwilioPhone()
    .then(() => {
      console.log("\n✨ Test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test failed:", error);
      process.exit(1);
    });
}

module.exports = { testTwilioPhone };
