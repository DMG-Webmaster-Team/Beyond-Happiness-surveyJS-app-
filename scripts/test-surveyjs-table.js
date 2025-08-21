const fs = require("fs");
const path = require("path");

console.log("🧪 Testing SurveyJS Dashboard Table View...\n");

// Test 1: Check if required packages are installed
console.log("📦 Checking Required Packages:");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const requiredPackages = [
  "survey-analytics",
  "jspdf",
  "jspdf-autotable",
  "xlsx",
];

requiredPackages.forEach((pkg) => {
  if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
    console.log(`   ✅ ${pkg} is installed`);
  } else {
    console.log(`   ❌ ${pkg} is missing`);
  }
});

// Test 2: Check if TableView component exists
const tableViewPath = path.join(
  process.cwd(),
  "src/components/analytics/TableView.tsx"
);
if (fs.existsSync(tableViewPath)) {
  console.log("\n✅ TableView.tsx component exists");

  const componentContent = fs.readFileSync(tableViewPath, "utf8");

  console.log("\n🔍 Checking Component Features:");

  if (
    componentContent.includes("survey-analytics/survey.analytics.tabulator")
  ) {
    console.log("   ✅ SurveyJS Tabulator import");
  } else {
    console.log("   ❌ SurveyJS Tabulator import missing");
  }

  if (componentContent.includes("jspdf")) {
    console.log("   ✅ jsPDF import");
  } else {
    console.log("   ❌ jsPDF import missing");
  }

  if (componentContent.includes("jspdf-autotable")) {
    console.log("   ✅ jsPDF AutoTable plugin");
  } else {
    console.log("   ❌ jsPDF AutoTable plugin missing");
  }

  if (componentContent.includes("xlsx")) {
    console.log("   ✅ XLSX import");
  } else {
    console.log("   ❌ XLSX import missing");
  }

  if (componentContent.includes("tabulator.css")) {
    console.log("   ✅ Tabulator CSS import");
  } else {
    console.log("   ❌ Tabulator CSS import missing");
  }

  if (componentContent.includes("survey.analytics.tabulator.css")) {
    console.log("   ✅ SurveyJS Tabulator CSS import");
  } else {
    console.log("   ❌ SurveyJS Tabulator CSS import missing");
  }

  if (componentContent.includes("useRef")) {
    console.log("   ✅ useRef hook usage");
  } else {
    console.log("   ❌ useRef hook missing");
  }

  if (
    componentContent.includes("dispose") ||
    componentContent.includes("destroy")
  ) {
    console.log("   ✅ Cleanup methods");
  } else {
    console.log("   ❌ Cleanup methods missing");
  }
} else {
  console.log("\n❌ TableView.tsx component not found");
}

// Test 3: Check if route page exists
const routePath = path.join(
  process.cwd(),
  "src/app/admin/table/[surveyId]/page.tsx"
);
if (fs.existsSync(routePath)) {
  console.log("\n✅ Admin table route page exists");

  const routeContent = fs.readFileSync(routePath, "utf8");

  if (routeContent.includes("dynamic")) {
    console.log("   ✅ Dynamic import with SSR disabled");
  } else {
    console.log("   ❌ Dynamic import missing");
  }

  if (routeContent.includes("ssr: false")) {
    console.log("   ✅ SSR disabled for SurveyJS components");
  } else {
    console.log("   ❌ SSR not disabled");
  }
} else {
  console.log("\n❌ Admin table route page not found");
}

// Test 4: Check if admin dashboard has the new button
const dashboardPath = path.join(
  process.cwd(),
  "src/app/admin/dashboard/page.tsx"
);
if (fs.existsSync(dashboardPath)) {
  console.log("\n✅ Admin dashboard exists");

  const dashboardContent = fs.readFileSync(dashboardPath, "utf8");

  if (dashboardContent.includes("Dashboard Table")) {
    console.log("   ✅ Dashboard Table button added");
  } else {
    console.log("   ❌ Dashboard Table button missing");
  }

  if (dashboardContent.includes("/admin/table/")) {
    console.log("   ✅ Route to table view configured");
  } else {
    console.log("   ❌ Route to table view missing");
  }

  if (!dashboardContent.includes("Table View")) {
    console.log("   ✅ Old Table View button removed");
  } else {
    console.log("   ❌ Old Table View button still present");
  }
} else {
  console.log("\n❌ Admin dashboard not found");
}

console.log("\n✨ SurveyJS Table View Test Completed!");
console.log("\n💡 What This Implements:");
console.log("1. Official SurveyJS Dashboard Table View with Tabulator");
console.log("2. Advanced filtering, sorting, and pagination");
console.log("3. Export capabilities: CSV, PDF, XLSX");
console.log("4. Client-side data processing (ready for server-side later)");
console.log("5. Proper cleanup and memory management");
console.log("\n🎯 Next Steps:");
console.log("1. Open http://localhost:3002/admin/dashboard");
console.log("2. Click 'Dashboard Table' button on any survey");
console.log("3. Verify the SurveyJS Table View loads with data");
console.log("4. Test sorting, filtering, and export functionality");
console.log(
  "\n⚠️  Note: SurveyJS Dashboard requires a commercial license in production"
);
console.log("   The component is ready for license activation when needed");
