const fs = require('fs');
let code = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf-8');

code = code.replace(
  "  const rFortitudeMax = activeVersion?.fortitude_max || character.fortitude_max || '150 Kg';",
  "  const rFortitudeMax = activeVersion?.fortitude_max || character.fortitude_max || '150 Kg';\n  const rTecnicasMax = activeVersion?.tecnicas_max || character.tecnicas_max || '02 | 00 equipada';"
);

// Where it renders the non-edit mode
code = code.replace(
  "<span>{character.tecnicas_max || '02 | 00 equipada'}</span>",
  "<span>{rTecnicasMax}</span>"
);

fs.writeFileSync('src/components/CharacterSheet.tsx', code);
