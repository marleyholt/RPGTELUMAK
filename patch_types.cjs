const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

if (!code.includes('active_on_board?: boolean;')) {
  // We added it to NPC already, let's see where Character is
  code = code.replace(
    "ferramentas_max?: number;",
    "ferramentas_max?: number;\n  active_on_board?: boolean;"
  );
}

// Add to character if needed
if (!code.match(/interface Character \{[^}]*active_on_board/)) {
  code = code.replace(
    "export interface Character {",
    "export interface Character {\n  active_on_board?: boolean;"
  );
}

fs.writeFileSync('src/types.ts', code);
