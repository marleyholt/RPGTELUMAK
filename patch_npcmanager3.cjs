const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf8');

const importTarget = `import { Search, Plus, Trash2, Edit2, LayoutGrid, List as ListIcon, X, Check, Image as ImageIcon, Download } from 'lucide-react';`;
const newImportTarget = `import { Search, Plus, Trash2, Edit2, LayoutGrid, List as ListIcon, X, Check, Image as ImageIcon, Download, FileText } from 'lucide-react';`;
code = code.replace(importTarget, newImportTarget);

fs.writeFileSync('src/components/NpcManager.tsx', code);
