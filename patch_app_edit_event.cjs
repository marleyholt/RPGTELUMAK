const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const effectBlock = `
  // Listen for external requests to open the character sheet and edit
  useEffect(() => {
    const handleEditCharSheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentTab('personagens');
        setSelectedCharId(customEvent.detail);
        // Dispatch again after a tiny delay so CharacterSheet has time to mount
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('editCharacterSheet', { detail: customEvent.detail }));
        }, 100);
      }
    };
    window.addEventListener('triggerEditCharacter', handleEditCharSheet);
    return () => window.removeEventListener('triggerEditCharacter', handleEditCharSheet);
  }, []);
`;

if (!code.includes('triggerEditCharacter')) {
  // inject near other event listeners
  code = code.replace(
    "window.addEventListener('openCharacterSheet', handleOpenCharSheet);",
    "window.addEventListener('openCharacterSheet', handleOpenCharSheet);" + effectBlock
  );
  fs.writeFileSync('src/App.tsx', code);
}
