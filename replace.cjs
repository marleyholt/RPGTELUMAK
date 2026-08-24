const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/fetch\('\/api\/discord\/send'/g, "fetch(`${import.meta.env.VITE_API_URL || ''}/api/discord/send`");
fs.writeFileSync('src/App.tsx', code);
