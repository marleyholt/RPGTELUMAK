const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const importTarget = `import { DiscordExportModal } from './DiscordExportModal';`;
const newImportTarget = `import { DiscordExportModal } from './DiscordExportModal';\nimport { QuickSheetPanel } from './QuickSheetPanel';`;
code = code.replace(importTarget, newImportTarget);

const bodyTarget = `  // Scroll tracking
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {`;

const newBodyTarget = `  const myActiveCharacter = characters?.find(c => c.email_dono === currentUserProfile?.email && c.ativo_na_mesa && !c.arquivado);

  // Scroll tracking
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {`;
code = code.replace(bodyTarget, newBodyTarget);

const modalTarget = `      {/* EXPORT MODAL */}
      <DiscordExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        channels={visibleChannels}
        isGM={isGM}
      />
    </div>`;

const newModalTarget = `      {/* EXPORT MODAL */}
      <DiscordExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        channels={visibleChannels}
        isGM={isGM}
      />

      {/* QUICK SHEET PANEL */}
      {showQuickSheet && myActiveCharacter && (
        <QuickSheetPanel
          character={myActiveCharacter}
          sections={identityQuickSheet.length > 0 ? identityQuickSheet : ['indicadores']}
          onClose={() => setShowQuickSheet(false)}
          onOpenFull={() => {
            setShowQuickSheet(false);
            // We use a custom event to tell App.tsx to switch tabs to 'fichas' and select this character
            const event = new CustomEvent('openCharacterSheet', { detail: myActiveCharacter.id });
            window.dispatchEvent(event);
          }}
        />
      )}
    </div>`;

code = code.replace(modalTarget, newModalTarget);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
console.log('Patched DiscordNotebook QuickSheet Panel');
