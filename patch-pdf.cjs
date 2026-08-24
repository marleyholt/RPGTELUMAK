const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

// Remove break-inside-avoid from the continuous flow section wrappers
code = code.replace(/className="border border-black break-inside-avoid"/g, 'className="border border-black"');

// Ensure the page itself doesn't force a break at the end if it's the only one
code = code.replace(/page-break-after: always !important;/g, 'page-break-after: auto !important;');

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
