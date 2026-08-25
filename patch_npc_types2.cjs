const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

if (code.includes('ferramentas_max?: number;') && !code.includes('active_on_board?: boolean;')) {
  code = code.replace(
    'ferramentas_max?: number;\n}',
    'ferramentas_max?: number;\n  active_on_board?: boolean;\n}'
  );
  fs.writeFileSync('src/types.ts', code);
}
