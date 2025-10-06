#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Find all API route files
function findApiRoutes(dir) {
  const routes = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      routes.push(...findApiRoutes(fullPath));
    } else if (file === "route.ts" || file === "route.js") {
      routes.push(fullPath);
    }
  }

  return routes;
}

// Add runtime configuration to a file
function addRuntimeConfig(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Check if runtime config already exists
  if (content.includes("export const runtime = 'nodejs'")) {
    console.log(`✅ ${filePath} - already has runtime config`);
    return false;
  }

  // Find the first import statement
  const lines = content.split("\n");
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ") && insertIndex === -1) {
      // Find the end of import statements
      for (let j = i; j < lines.length; j++) {
        if (
          !lines[j].trim().startsWith("import ") &&
          !lines[j].trim().startsWith("//") &&
          lines[j].trim() !== ""
        ) {
          insertIndex = j;
          break;
        }
      }
      break;
    }
  }

  if (insertIndex === -1) {
    // No imports found, add at the beginning
    insertIndex = 0;
  }

  // Insert runtime configuration
  lines.splice(
    insertIndex,
    0,
    "",
    "// Force Node.js runtime (disable Edge runtime)",
    "export const runtime = 'nodejs';"
  );

  const newContent = lines.join("\n");
  fs.writeFileSync(filePath, newContent);

  console.log(`✅ ${filePath} - added runtime config`);
  return true;
}

// Main execution
const apiDir = path.join(__dirname, "src", "app", "api");

if (!fs.existsSync(apiDir)) {
  console.error("❌ API directory not found:", apiDir);
  process.exit(1);
}

console.log("🔍 Finding API route files...");
const routes = findApiRoutes(apiDir);

console.log(`📁 Found ${routes.length} API route files`);
console.log("");

let modified = 0;
for (const route of routes) {
  if (addRuntimeConfig(route)) {
    modified++;
  }
}

console.log("");
console.log(`✅ Modified ${modified} files`);
console.log(`📊 Total API routes: ${routes.length}`);
console.log("🎉 Runtime configuration complete!");
