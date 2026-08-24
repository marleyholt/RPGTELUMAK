const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

code = code.replace(/break-after: page !important;/g, "break-after: auto !important;");

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
