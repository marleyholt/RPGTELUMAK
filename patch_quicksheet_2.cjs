const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

code = code.replace(/\\`/g, '`').replace(/\\\$/g, '$');

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Removed literal escapes from QuickSheetPanel');
