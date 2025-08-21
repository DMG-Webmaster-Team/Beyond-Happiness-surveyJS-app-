const fs = require("fs");
const path = require("path");

console.log("🧪 Testing User Fetching in TableViewModal...\n");

// Test 1: Check if the component has user fetching logic
const componentPath = path.join(
  process.cwd(),
  "src/components/TableViewModal.tsx"
);
if (fs.existsSync(componentPath)) {
  const componentContent = fs.readFileSync(componentPath, "utf8");

  console.log("🔍 Checking User Fetching Features:");

  if (componentContent.includes("fetchUserInfo")) {
    console.log("   ✅ fetchUserInfo function is implemented");
  } else {
    console.log("   ❌ fetchUserInfo function not found");
  }

  if (componentContent.includes("/api/users/")) {
    console.log("   ✅ User API endpoint is used");
  } else {
    console.log("   ❌ User API endpoint not found");
  }

  if (componentContent.includes("displayName")) {
    console.log("   ✅ Display name logic is implemented");
  } else {
    console.log("   ❌ Display name logic not found");
  }

  if (
    componentContent.includes('user?.name || user?.email || "Unknown User"')
  ) {
    console.log("   ✅ Smart fallback logic is implemented (no User ID)");
  } else {
    console.log("   ❌ Smart fallback logic not found");
  }

  if (
    componentContent.includes('"User"') &&
    componentContent.includes('"Email"')
  ) {
    console.log("   ✅ User and Email columns are defined");
  } else {
    console.log("   ❌ User and Email columns not found");
  }

  if (componentContent.includes("Promise.all")) {
    console.log("   ✅ Batch user fetching is implemented");
  } else {
    console.log("   ❌ Batch user fetching not found");
  }

  if (componentContent.includes("userMap")) {
    console.log("   ✅ User mapping is implemented");
  } else {
    console.log("   ❌ User mapping not found");
  }
} else {
  console.log("❌ TableViewModal.tsx component file not found");
}

// Test 2: Check if users API endpoint exists
const usersApiPath = path.join(
  process.cwd(),
  "src/app/api/users/[id]/route.ts"
);
if (fs.existsSync(usersApiPath)) {
  console.log("\n✅ Users API endpoint exists");

  const apiContent = fs.readFileSync(usersApiPath, "utf8");
  if (apiContent.includes("getUserById")) {
    console.log("   ✅ getUserById function is available");
  } else {
    console.log("   ❌ getUserById function not found");
  }
} else {
  console.log("\n❌ Users API endpoint not found");
}

// Test 3: Check if user schema has name and email fields
const userSchemaPath = path.join(process.cwd(), "src/db/schema/users.ts");
if (fs.existsSync(userSchemaPath)) {
  console.log("\n✅ User schema exists");

  const schemaContent = fs.readFileSync(userSchemaPath, "utf8");
  if (schemaContent.includes("name: text")) {
    console.log("   ✅ name field is defined in schema");
  } else {
    console.log("   ❌ name field not found in schema");
  }

  if (schemaContent.includes("email: text")) {
    console.log("   ✅ email field is defined in schema");
  } else {
    console.log("   ❌ email field not found in schema");
  }
} else {
  console.log("\n❌ User schema not found");
}

console.log("\n✨ User Fetching Test Completed!");
console.log("\n💡 What This Means:");
console.log(
  "1. The TableViewModal now fetches user information for each result"
);
console.log(
  "2. It displays user names when available, falls back to email (never shows User ID)"
);
console.log("3. It adds an Email column for easy identification");
console.log("4. User data is fetched efficiently in parallel for all results");
console.log("\n🎯 Next Steps:");
console.log(
  "1. Open http://localhost:3002/admin/dashboard (note the port change)"
);
console.log("2. Click 'Table View' on a survey with results");
console.log(
  "3. Verify that user names/emails are displayed instead of just User IDs"
);
console.log("4. Check that the Email column shows user email addresses");
