const fs = require('fs');

let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const exportButtonHtml = `            {/* Export Messages Button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="text-[#b5bac1] hover:text-[#dbdee1] p-1 rounded hover:bg-[#3f4147] transition-colors flex items-center"
              title="Exportar Mensagens"
            >
              <Download className="h-5 w-5" />
            </button>
            
            {/* Pinned Messages Filter Toggle */}`;

code = code.replace("{/* Pinned Messages Filter Toggle */}", exportButtonHtml);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook.tsx again');
