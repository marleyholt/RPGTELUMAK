const fs = require('fs');
let content = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf8');

// Fix 1: Extra div
content = content.replace('<div>\n                    <div>\n                    <label className="block text-[10px]', '<div>\n                    <label className="block text-[10px]');

fs.writeFileSync('src/components/CharacterSheet.tsx', content);
