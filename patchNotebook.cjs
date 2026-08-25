const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf-8');

code = code.replace(
  /onClose=\{\(\) => setOpenNpcIds\(prev => prev.filter\(x => x !== id\)\)\}\s+initialPos/g,
  `onClose={() => setOpenNpcIds(prev => prev.filter(x => x !== id))}
            onOpenFull={() => {
              setOpenNpcIds(prev => prev.filter(x => x !== id));
              const event = new CustomEvent('openNpcSheet', { detail: id });
              window.dispatchEvent(event);
            }}
            initialPos`
);

fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
