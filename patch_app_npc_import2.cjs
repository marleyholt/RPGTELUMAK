const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { GMConfigModal } from './components/GMConfigModal';`;
const newImportTarget = `import { GMConfigModal } from './components/GMConfigModal';
import { NpcManager } from './components/NpcManager';`;

if (appCode.includes(importTarget)) {
  appCode = appCode.replace(importTarget, newImportTarget);
  fs.writeFileSync('src/App.tsx', appCode);
  console.log('Successfully patched import.');
} else {
  console.log('Import target not found.');
}
