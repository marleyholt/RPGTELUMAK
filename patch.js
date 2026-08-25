const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  '  // 30s Polling Check for Player Character Sheet Changes',
  `  // Listen for external requests to open an NPC sheet
  useEffect(() => {
    const handleOpenNpcSheet = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentTab('npcs');
      }
    };
    window.addEventListener('openNpcSheet', handleOpenNpcSheet);
    return () => window.removeEventListener('openNpcSheet', handleOpenNpcSheet);
  }, []);

  // 30s Polling Check for Player Character Sheet Changes`
);
fs.writeFileSync('src/App.tsx', code);
