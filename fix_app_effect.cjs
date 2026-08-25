const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const badBlock = `  // Listen for external requests to open the character sheet and edit
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

    return () => window.removeEventListener('openCharacterSheet', handleOpenCharSheet);
  }, []);`;

const goodBlock = `    return () => window.removeEventListener('openCharacterSheet', handleOpenCharSheet);
  }, []);

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
  }, []);`;

if (code.includes(badBlock)) {
  code = code.replace(badBlock, goodBlock);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Fixed bad block.");
} else {
  console.log("Bad block not found.");
}
