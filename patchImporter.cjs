const fs = require('fs');
let code = fs.readFileSync('src/components/PdfSheetImporterModal.tsx', 'utf-8');
code = code.replace(
  /\`\$\{import\.meta\.env\.VITE_API_URL \|\| 'https:\/\/telumak-server\.duckdns\.org'\}\/api\/characters\/import-pdf\`/g,
  "'/api/characters/import-pdf'"
);
fs.writeFileSync('src/components/PdfSheetImporterModal.tsx', code);
