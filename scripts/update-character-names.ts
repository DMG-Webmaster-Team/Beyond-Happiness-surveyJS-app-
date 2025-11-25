import fs from "fs";
import path from "path";

// New character names data
const newNames = [
  { code: "00000", name_en: "Curious Nomad", name_ar: "الرحّال الفضولي" },
  { code: "00001", name_en: "Playful Wanderer", name_ar: "المتجول المرح" },
  { code: "00010", name_en: "Weary Diligent", name_ar: "المجتهد المتعب" },
  { code: "00011", name_en: "Persistent Wanderer", name_ar: "المتجول المثابر" },
  { code: "00100", name_en: "Aimless Wanderer", name_ar: "المتجول التائه" },
  { code: "00101", name_en: "Carefree Enthusiast", name_ar: "المتحمس الهادئ" },
  { code: "00110", name_en: "Independent Sprinter", name_ar: "العدّاء المستقل" },
  { code: "00111", name_en: "Passionate Dabbler", name_ar: "الهاوي الشغوف" },
  { code: "01000", name_en: "Energetic Drifter", name_ar: "المنجرف النشيط" },
  { code: "01001", name_en: "Spirited Enjoyer", name_ar: "المستمتع المفعم بالحيوية" },
  { code: "01010", name_en: "Determined Striver", name_ar: "المثابر المصمم" },
  { code: "01011", name_en: "Joyful Dynamo", name_ar: "الدينامو السعيد" },
  { code: "01100", name_en: "Vibrant Free Spirit", name_ar: "الروح الحرة النابضة" },
  { code: "01101", name_en: "Distracted Connoisseur", name_ar: "الخبير المشتت" },
  { code: "01110", name_en: "Tenacious Seeker", name_ar: "الباحث العنيد" },
  { code: "01111", name_en: "Thriving Adventurer", name_ar: "المغامر المزدهر" },
  { code: "10000", name_en: "Purposeful Stumbler", name_ar: "المتعثّر الهادف" },
  { code: "10001", name_en: "Fulfilled Dreamer", name_ar: "الحالم المُحقق" },
  { code: "10010", name_en: "Resolute Anchor", name_ar: "الركيزة الحازمة" },
  { code: "10011", name_en: "Devoted Optimist", name_ar: "المتفائل المخلص" },
  { code: "10100", name_en: "Unbound Visionary", name_ar: "صاحب الرؤية الحر" },
  { code: "10101", name_en: "Inspired Wanderer", name_ar: "المتجول الملهم" },
  { code: "10110", name_en: "Dedicated Pathfinder", name_ar: "رائد الطريق المخلص" },
  { code: "10111", name_en: "Enlightened Explorer", name_ar: "المستكشف المستنير" },
  { code: "11000", name_en: "Driven Conqueror", name_ar: "الفاتح الطموح" },
  { code: "11001", name_en: "Spirited Seeker", name_ar: "الباحث النشيط" },
  { code: "11010", name_en: "Committed Dynamo", name_ar: "الدينامو الملتزم" },
  { code: "11011", name_en: "Energetic Champion", name_ar: "البطل النشيط" },
  { code: "11100", name_en: "Vibrant Navigator", name_ar: "الملاح النشيط" },
  { code: "11101", name_en: "Joyful Adventurer", name_ar: "المغامر السعيد" },
  { code: "11110", name_en: "Harmonious Achiever", name_ar: "المنجز المتوازن" },
  { code: "11111", name_en: "Radiant Fulfiller", name_ar: "المُنجز المتألق" },
];

// Create a map for quick lookup
const nameMap = new Map(newNames.map((n) => [n.code, { en: n.name_en, ar: n.name_ar }]));

function updateCharacterNames(filePath: string) {
  console.log(`📂 Updating ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let updatedCount = 0;
  let notFoundCount = 0;

  // Update each character
  for (const character of data.characters) {
    const newNames = nameMap.get(character.match);
    if (newNames) {
      character.name.en = newNames.en;
      character.name.ar = newNames.ar;
      updatedCount++;
    } else {
      console.warn(`⚠️  No new name found for code: ${character.match}`);
      notFoundCount++;
    }
  }

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`   ✅ Updated ${updatedCount} characters`);
  if (notFoundCount > 0) {
    console.log(`   ⚠️  ${notFoundCount} characters not found in new names`);
  }

  return true;
}

async function main() {
  console.log("🔄 Updating character names in JSON files...\n");

  const filesToUpdate = [
    path.join(process.cwd(), "data/happiness-characters-multilingual.json"),
    path.join(process.cwd(), "public/data/happiness-characters-multilingual.json"),
  ];

  for (const filePath of filesToUpdate) {
    updateCharacterNames(filePath);
  }

  console.log("\n✅ Character names updated in JSON files!");
  console.log("\n📝 Next step: Run 'npm run db:update-characters' to sync the database");
}

main().catch((error) => {
  console.error("❌ Error updating character names:", error);
  process.exit(1);
});







