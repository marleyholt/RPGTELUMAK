const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const effectTarget = `  // 30s Polling Check for Player Character Sheet Changes
  useEffect(() => {`;

const newEffectTarget = `  // Listen for external requests to open the character sheet (e.g. from Discord Ficha Rapida)
  useEffect(() => {
    const handleOpenCharSheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentTab('fichas');
        setSelectedCharId(customEvent.detail);
      }
    };
    window.addEventListener('openCharacterSheet', handleOpenCharSheet);
    return () => window.removeEventListener('openCharacterSheet', handleOpenCharSheet);
  }, []);

  // 30s Polling Check for Player Character Sheet Changes
  useEffect(() => {`;

code = code.replace(effectTarget, newEffectTarget);
fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx event listener');
