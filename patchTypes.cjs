const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');
code = code.replace(
  "  fortitude_max?: string | number;\n  fisico: number;",
  "  fortitude_max?: string | number;\n  tecnicas_max?: string | number;\n  fisico: number;"
);
fs.writeFileSync('src/types.ts', code);
