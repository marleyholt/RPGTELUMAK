const fs = require('fs');
let content = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf8');

content = content.replace('Trash2, RotateCcw} from \'lucide-react\';', 'Trash2, RotateCcw, History, Package} from \'lucide-react\';');

fs.writeFileSync('src/components/CharacterSheet.tsx', content);
console.log('Success rewriting imports');
