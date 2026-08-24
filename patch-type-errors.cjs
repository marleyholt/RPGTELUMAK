const fs = require('fs');

// Fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/setCurrentTab\('notebook'\)/g, "setCurrentTab('discord')");
appCode = appCode.replace(/<HelpCircle className="h-2\.5 w-2\.5 text-sky-400" title="Insira 'TELUMAK_GM' para se registrar como Mestre de jogo instantaneamente\." \/>/g, '<HelpCircle className="h-2.5 w-2.5 text-sky-400" />');
fs.writeFileSync('src/App.tsx', appCode);

// Fix DiscordNotebook.tsx
let discordCode = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');
discordCode = discordCode.replace(/<Lock className="h-3 w-3 text-amber-400 shrink-0" title="Canal Privado" \/>/g, '<Lock className="h-3 w-3 text-amber-400 shrink-0" />');
fs.writeFileSync('src/components/DiscordNotebook.tsx', discordCode);
