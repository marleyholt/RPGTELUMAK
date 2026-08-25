const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const buttonsTarget = `            <button
              onClick={() => setCurrentTab('discord')}`;

const newButtonsTarget = `            {isGM && (
              <button
                onClick={() => setCurrentTab('npcs')}
                className={\`flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-widest transition duration-150 \${
                  currentTab === 'npcs' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }\`}
                title="Galeria de NPCs"
              >
                <Users className="h-3.5 w-3.5" />
                NPCs
              </button>
            )}

            <button
              onClick={() => setCurrentTab('discord')}`;

if (appCode.includes(buttonsTarget)) {
  appCode = appCode.replace(buttonsTarget, newButtonsTarget);
  fs.writeFileSync('src/App.tsx', appCode);
  console.log('Successfully patched NPCs tab into navigation bar.');
} else {
  console.log('Target not found for patching.');
}
