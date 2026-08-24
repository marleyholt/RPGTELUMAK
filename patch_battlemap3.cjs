const fs = require('fs');

let code = fs.readFileSync('src/components/BattleMap.tsx', 'utf8');

const oldBgSize = `            backgroundSize: 'cover',
            backgroundPosition: 'center',`;

const newBgSize = `            backgroundSize: '100% 100%',
            backgroundPosition: 'center',`;

code = code.replace(oldBgSize, newBgSize);

fs.writeFileSync('src/components/BattleMap.tsx', code);
console.log('Patched backgroundSize');
