const fs = require('fs');

let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

if (!code.includes('import { DiscordExportModal }')) {
  code = code.replace("import { trackRead", "import { DiscordExportModal } from './DiscordExportModal';\nimport { trackRead");
}

if (!code.includes('const [showExportModal, setShowExportModal] = useState(false);')) {
  code = code.replace("const [hasMoreMessages, setHasMoreMessages] = useState(false);", "const [hasMoreMessages, setHasMoreMessages] = useState(false);\n  const [showExportModal, setShowExportModal] = useState(false);");
}

const exportButtonHtml = `              {/* Botão de Exportação */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="text-[#b5bac1] hover:text-[#dbdee1] p-1 rounded hover:bg-[#3f4147] transition-colors"
                title="Exportar Mensagens"
              >
                <Download className="h-5 w-5" />
              </button>

              {/* Botão Pinned Messages */}`;

if (!code.includes('Botão de Exportação')) {
  code = code.replace("{/* Botão Pinned Messages */}", exportButtonHtml);
}

const modalHtml = `
      {/* EXPORT MODAL */}
      <DiscordExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        channels={visibleChannels}
        isGM={isGM}
      />
    </div>
  );
}`;

if (!code.includes('<DiscordExportModal')) {
  code = code.replace("    </div>\n  );\n}", modalHtml);
}

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook.tsx');
