const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

code = code.replace(/padding: 4px !important;\s*}/, "padding: 4px !important;\n            color: #000000;\n          }");

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
