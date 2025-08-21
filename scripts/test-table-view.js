const fs = require("fs");
const path = require("path");

console.log("🧪 Testing TableViewModal Component...\n");

// Test 1: Check if component file exists
const componentPath = path.join(
  process.cwd(),
  "src/components/TableViewModal.tsx"
);
if (fs.existsSync(componentPath)) {
  console.log("✅ TableViewModal.tsx component file exists");
} else {
  console.log("❌ TableViewModal.tsx component file not found");
  process.exit(1);
}

// Test 2: Check if component is imported in admin dashboard
const dashboardPath = path.join(
  process.cwd(),
  "src/app/admin/dashboard/page.tsx"
);
if (fs.existsSync(dashboardPath)) {
  const dashboardContent = fs.readFileSync(dashboardPath, "utf8");

  if (dashboardContent.includes("import TableViewModal")) {
    console.log("✅ TableViewModal is imported in admin dashboard");
  } else {
    console.log("❌ TableViewModal import not found in admin dashboard");
  }

  if (dashboardContent.includes("setIsTableViewModalOpen")) {
    console.log("✅ TableViewModal state is defined in admin dashboard");
  } else {
    console.log("❌ TableViewModal state not found in admin dashboard");
  }

  if (dashboardContent.includes("Table View")) {
    console.log("✅ Table View button is added to admin dashboard");
  } else {
    console.log("❌ Table View button not found in admin dashboard");
  }

  if (dashboardContent.includes("<TableViewModal")) {
    console.log("✅ TableViewModal component is rendered in admin dashboard");
  } else {
    console.log("❌ TableViewModal component not found in admin dashboard");
  }
} else {
  console.log("❌ Admin dashboard file not found");
}

// Test 3: Check component structure
const componentContent = fs.readFileSync(componentPath, "utf8");

const requiredFeatures = [
  "export default function TableViewModal",
  "useState",
  "useEffect",
  "useSWR",
  "tableData",
  "columns",
  "exportToCSV",
  "formatAnswer",
  "SurveyJS",
  "Table View - Survey Results",
];

console.log("\n🔍 Checking component features:");
requiredFeatures.forEach((feature) => {
  if (componentContent.includes(feature)) {
    console.log(`   ✅ ${feature}`);
  } else {
    console.log(`   ❌ ${feature}`);
  }
});

// Test 4: Check for proper TypeScript interfaces
const interfaces = [
  "SurveyResult",
  "QuestionInfo",
  "ResultsResponse",
  "Survey",
  "TableViewModalProps",
];

console.log("\n🔍 Checking TypeScript interfaces:");
interfaces.forEach((interfaceName) => {
  if (componentContent.includes(`interface ${interfaceName}`)) {
    console.log(`   ✅ ${interfaceName} interface`);
  } else {
    console.log(`   ❌ ${interfaceName} interface`);
  }
});

// Test 5: Check for CSV export functionality
if (
  componentContent.includes("exportToCSV") &&
  componentContent.includes("CSV")
) {
  console.log("✅ CSV export functionality is implemented");
} else {
  console.log("❌ CSV export functionality is missing");
}

// Test 6: Check for proper data processing
if (
  componentContent.includes("surveyDefinition") &&
  componentContent.includes("questionMap")
) {
  console.log("✅ Survey data processing is implemented");
} else {
  console.log("❌ Survey data processing is missing");
}

console.log("\n✨ TableViewModal Component Test Completed!");
console.log("\n💡 Next Steps:");
console.log("1. Open http://localhost:3000/admin/dashboard");
console.log("2. Look for the new 'Table View' button (purple)");
console.log("3. Click it to open the table view modal");
console.log("4. Verify the table displays survey results correctly");
console.log("5. Test the CSV export functionality");
