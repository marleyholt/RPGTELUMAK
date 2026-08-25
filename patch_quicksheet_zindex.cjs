const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const target = `z-40 flex flex-col overflow-hidden animate-fade-in"`;
const newTarget = `z-[90] flex flex-col overflow-hidden animate-fade-in"`;
code = code.replace(target, newTarget);

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('QuickSheetPanel z-index updated');
