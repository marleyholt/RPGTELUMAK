const fs = require('fs');
let code = fs.readFileSync('src/components/NpcManager.tsx', 'utf-8');
code = code.replace(
  '  useEffect(() => {',
  `  useEffect(() => {
    const handleOpenNpc = (e) => {
      const npcId = e.detail;
      const found = npcs.find(n => n.id === npcId);
      if (found) {
        setViewingNpc(found);
      }
    };
    window.addEventListener('openNpcSheet', handleOpenNpc);
    return () => window.removeEventListener('openNpcSheet', handleOpenNpc);
  }, [npcs]);

  useEffect(() => {`
);
fs.writeFileSync('src/components/NpcManager.tsx', code);
