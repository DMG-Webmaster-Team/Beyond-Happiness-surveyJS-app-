console.log("🧪 Testing Unified Input Field Functionality\n");

// Test phone number detection and formatting
function testPhoneDetection() {
  console.log("📱 Testing Phone Number Detection:");

  const testCases = [
    "01123456789", // Should become +201123456789
    "20123456789", // Should become +20123456789
    "+20123456789", // Should remain +20123456789
    "0123456789", // Should become +20123456789
    "123456789", // Should become +20123456789
  ];

  testCases.forEach((input) => {
    const isEmail = input.includes("@");
    const isPhone = /^\+?[\d\s\-\(\)]+$/.test(input);

    if (isEmail) {
      console.log(`   ${input} → 📧 Email detected`);
    } else if (isPhone) {
      const digitsOnly = input.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        console.log(
          `   ${input} → 📱 Phone detected (${digitsOnly.length} digits)`
        );

        // Test formatting
        let formatted = input;
        if (input.startsWith("+20")) {
          formatted = input;
        } else if (digitsOnly.startsWith("20")) {
          formatted = `+${digitsOnly}`;
        } else if (digitsOnly.startsWith("0")) {
          formatted = `+20${digitsOnly.substring(1)}`;
        } else {
          formatted = `+20${digitsOnly}`;
        }

        console.log(`      → Formatted: ${formatted}`);
      } else {
        console.log(
          `   ${input} → ❌ Invalid phone length (${digitsOnly.length} digits)`
        );
      }
    } else {
      console.log(`   ${input} → ❓ Unknown type`);
    }
  });
}

// Test email detection
function testEmailDetection() {
  console.log("\n📧 Testing Email Detection:");

  const testEmails = [
    "test@example.com",
    "user.name@domain.co.uk",
    "invalid-email",
    "test@",
    "@domain.com",
  ];

  testEmails.forEach((email) => {
    const isEmail =
      email.includes("@") &&
      email.includes(".") &&
      email.indexOf("@") < email.lastIndexOf(".");
    console.log(
      `   ${email} → ${isEmail ? "📧 Valid email" : "❌ Invalid email"}`
    );
  });
}

// Test input type detection logic
function testInputTypeDetection() {
  console.log("\n🔍 Testing Input Type Detection Logic:");

  function detectInputType(input) {
    if (input.includes("@")) {
      return "email";
    }

    const digitsOnly = input.replace(/\D/g, "");
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return "phone";
    }

    return "unknown";
  }

  const testInputs = [
    "test@example.com",
    "01123456789",
    "20123456789",
    "+20123456789",
    "abc123",
    "123",
    "12345678901234567890", // Too long
  ];

  testInputs.forEach((input) => {
    const type = detectInputType(input);
    console.log(`   ${input} → ${type}`);
  });
}

// Run all tests
console.log("🚀 Starting Unified Input Field Tests...\n");

testPhoneDetection();
testEmailDetection();
testInputTypeDetection();

console.log("\n✨ All tests completed!");
console.log("\n💡 Next Steps:");
console.log("1. Fix Twilio Account SID (should start with 'AC')");
console.log("2. Test email functionality in the browser");
console.log("3. Test phone detection in the browser");
console.log("4. Once SMS is fixed, test full phone OTP functionality");
