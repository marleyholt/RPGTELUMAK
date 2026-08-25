const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

// I will just replace the exact block in CharVersion
code = code.replace(
  "  tecnicas_max?: string | number;\n  fisico: number;\n  destreza: number;\n  cognicao: number;\n  carisma: number;\n  primordio: number;",
  "  tecnicas_max?: string | number;\n  fisico?: number;\n  destreza?: number;\n  cognicao?: number;\n  carisma?: number;\n  primordio?: number;"
);
fs.writeFileSync('src/types.ts', code);
