const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('src/components/GMConfigModal.tsx', 'utf8');

if (!content.includes('import { DataBackupSystem }')) {
  content = content.replace("import { ImageUploadField } from './ImageUploadField';", "import { ImageUploadField } from './ImageUploadField';\nimport { DataBackupSystem } from './DataBackupSystem';");
}

const injectionPoint = `<div className="bg-[#080808] border border-blue-500/30 p-4 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-sky-400" />
                    Identidade Visual & Logo do RPG TELUMAK`;

const newCode = `<DataBackupSystem characters={characters} />\n\n            ` + injectionPoint;

if (!content.includes('<DataBackupSystem')) {
  content = content.replace(injectionPoint, newCode);
  fs.writeFileSync('src/components/GMConfigModal.tsx', content);
  console.log("Patched GMConfigModal.tsx");
} else {
  console.log("Already patched");
}
