const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const btnTarget = `<button
              type="button"
              onClick={() => setShowQuickSheet(!showQuickSheet)}
              className={\`p-1.5 rounded transition \${showQuickSheet ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
              title="Ficha Rápida (Pocket)"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>`;

const newBtnTarget = `{myActiveCharacter && (
            <button
              type="button"
              onClick={() => setShowQuickSheet(!showQuickSheet)}
              className={\`p-1.5 rounded transition \${showQuickSheet ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-[#35373c] hover:text-white'}\`}
              title="Ficha Rápida (Pocket)"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
          )}`;

if (code.includes(btnTarget)) {
  code = code.replace(btnTarget, newBtnTarget);
  fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
  console.log('Patched button conditionally.');
} else {
  console.log('Button not found.');
}
