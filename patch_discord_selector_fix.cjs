const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const quickSheetTarget = `{showQuickSheet && myActiveCharacter && (
        <QuickSheetPanel
          character={myActiveCharacter}
          sections={identityQuickSheet || []}
          onClose={() => setShowQuickSheet(false)}
          onOpenFull={() => {
            setShowQuickSheet(false);
            // We use a custom event to tell App.tsx to switch tabs to 'fichas' and select this character
            const event = new CustomEvent('openCharacterSheet', { detail: myActiveCharacter.id });
            window.dispatchEvent(event);
          }}
        />
      )}`;

const newQuickSheetTarget = `{showQuickSheet && myActiveCharacter && (
        <QuickSheetPanel
          character={myActiveCharacter}
          sections={identityQuickSheet || []}
          onClose={() => setShowQuickSheet(false)}
          onOpenFull={() => {
            setShowQuickSheet(false);
            const event = new CustomEvent('openCharacterSheet', { detail: myActiveCharacter.id });
            window.dispatchEvent(event);
          }}
        />
      )}

      {showNpcMenu && isGM && (
        <NpcSelectorWindow
          npcs={allNpcs}
          openNpcIds={openNpcIds}
          onToggleNpc={(id) => {
            if (openNpcIds.includes(id)) {
              setOpenNpcIds(prev => prev.filter(x => x !== id));
            } else {
              setOpenNpcIds(prev => [...prev, id]);
            }
          }}
          onClose={() => setShowNpcMenu(false)}
        />
      )}

      {isGM && openNpcIds.map((id, index) => {
        const npc = allNpcs.find(n => n.id === id);
        if (!npc) return null;
        return (
          <NpcQuickSheet
            key={id}
            npc={npc}
            onClose={() => setOpenNpcIds(prev => prev.filter(x => x !== id))}
            initialPos={{ x: window.innerWidth - 300 - (index * 20), y: 100 + (index * 20) }}
          />
        );
      })}`;

if (code.includes(quickSheetTarget)) {
  code = code.replace(quickSheetTarget, newQuickSheetTarget);
  fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
  console.log('Patched QuickSheet and NPC menus');
} else {
  console.log('Could not find QuickSheet section to patch');
}
