const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const target = `            {(character.primordio ?? 0) > 0 && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded flex items-center justify-between">
                <span className="block text-[10px] uppercase font-black text-[#949ba4]">Primórdio</span>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={\`h-2 w-2 rounded-full \${i < character.primordio ? 'bg-amber-400' : 'bg-white/10'}\`} />
                  ))}
                </div>
              </div>
            )}`;

const newTarget = `            {(character.primordio ?? 0) > 0 && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded flex items-center justify-between">
                <span className="block text-[10px] uppercase font-black text-[#949ba4]">Primórdio</span>
                <span className="text-sm font-black text-amber-400">{character.primordio}</span>
              </div>
            )}`;

if(code.includes(target)) {
    code = code.replace(target, newTarget);
    fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
    console.log('Primordio patched');
} else {
    console.log('Target not found for primordio');
}
