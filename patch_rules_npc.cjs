const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const target = `    // --- CHARACTERS ---`;
const newRules = `    // --- NPCS ---
    match /npcs/{npcId} {
      allow read, write: if isGM();
    }

    // --- CHARACTERS ---`;

rules = rules.replace(target, newRules);
fs.writeFileSync('firestore.rules', rules);
console.log('Patched firestore.rules');
