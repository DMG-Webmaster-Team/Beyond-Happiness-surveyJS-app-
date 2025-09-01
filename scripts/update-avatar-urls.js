const fs = require("fs");
const path = require("path");

// Read the characters data
const charactersPath = path.join(
  __dirname,
  "../data/happiness-characters.json"
);
const charactersData = JSON.parse(fs.readFileSync(charactersPath, "utf8"));

// Update avatar URLs to match the code-based file naming
charactersData.characters = charactersData.characters.map((character) => ({
  ...character,
  avatar_url: `/characters/${character.match}.png`,
}));

// Write back the updated data
fs.writeFileSync(charactersPath, JSON.stringify(charactersData, null, 2));

console.log(
  "✅ Updated all character avatar URLs to use code-based image paths"
);
console.log(`📁 Updated ${charactersData.characters.length} characters`);

// Show a few examples
console.log("\n📋 Examples:");
charactersData.characters.slice(0, 5).forEach((char) => {
  console.log(`  ${char.name} (${char.match}) → ${char.avatar_url}`);
});
