const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf-8');
code = code.replace(
  "        onAddLog('error', 'Erro ao criar a sala do Google Meet.');",
  "        onAddLog('error', 'Erro ao criar a sala do Google Meet: ' + (err instanceof Error ? err.message : String(err)));"
);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
