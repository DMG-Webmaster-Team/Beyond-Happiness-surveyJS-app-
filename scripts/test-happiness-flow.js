const BASE_URL = "http://localhost:3005";

async function testHappinessSurveyFlow() {
  console.log("🧪 Testing Happiness Survey Flow...\n");

  try {
    // 1. Test happiness survey access endpoint
    console.log("1️⃣ Testing happiness survey access endpoint...");
    const accessResponse = await fetch(
      `${BASE_URL}/api/happiness/surveys/HbvIfvEIjoz3zvq_Horhp/access`
    );
    const accessData = await accessResponse.json();

    console.log("✅ Access endpoint response:", accessData);
    console.log("   - canAccess:", accessData.canAccess);
    console.log("   - requiresAuth:", accessData.requiresAuth);
    console.log("   - message:", accessData.message);

    if (accessData.requiresAuth) {
      console.log("✅ Correctly requires authentication");
    } else {
      console.log("❌ Should require authentication");
    }

    // 2. Test login page with type parameter
    console.log("\n2️⃣ Testing login page with type parameter...");
    const loginResponse = await fetch(
      `${BASE_URL}/user/login?redirect=HbvIfvEIjoz3zvq_Horhp&type=happiness`
    );

    if (loginResponse.ok) {
      console.log("✅ Login page accessible");
      const loginHtml = await loginResponse.text();

      // Check if the page contains happiness survey indicators
      if (loginHtml.includes("happiness")) {
        console.log("✅ Login page contains happiness survey references");
      } else {
        console.log("❌ Login page missing happiness survey references");
      }

      if (loginHtml.includes("type=happiness")) {
        console.log("✅ Login page contains type=happiness parameter");
      } else {
        console.log("❌ Login page missing type=happiness parameter");
      }
    } else {
      console.log("❌ Login page not accessible:", loginResponse.status);
    }

    // 3. Test OTP endpoint with happiness survey
    console.log("\n3️⃣ Testing OTP endpoint with happiness survey...");
    const otpResponse = await fetch(`${BASE_URL}/api/users/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@company.com",
        otp: "123456",
        surveyId: "HbvIfvEIjoz3zvq_Horhp",
        skipOtpVerification: true,
      }),
    });

    if (otpResponse.ok) {
      const otpData = await otpResponse.json();
      console.log("✅ OTP endpoint response:", otpData);

      if (otpData.access && otpData.access.canAccess) {
        console.log("✅ User has access to happiness survey");
      } else {
        console.log("❌ User denied access to happiness survey");
        console.log("   - Reason:", otpData.access?.reason);
        console.log("   - Message:", otpData.access?.message);
      }
    } else {
      console.log("❌ OTP endpoint failed:", otpResponse.status);
      const errorData = await otpResponse.json();
      console.log("   - Error:", errorData);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testHappinessSurveyFlow();
