const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordExportModal.tsx', 'utf8');

code = code.replace(
  "jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }",
  "jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }"
);

fs.writeFileSync('src/components/DiscordExportModal.tsx', code);
