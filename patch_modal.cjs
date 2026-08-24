const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordExportModal.tsx', 'utf8');

code = code.replace(
  "allMessages.push({ id: doc.id, ...doc.data() } as DiscordNotebookMessage);",
  "allMessages.push(Object.assign({ id: doc.id }, doc.data()) as DiscordNotebookMessage);"
);

code = code.replace(
  "image:        { type: 'jpeg', quality: 0.98 },",
  "image:        { type: 'jpeg' as const, quality: 0.98 },"
);

fs.writeFileSync('src/components/DiscordExportModal.tsx', code);
