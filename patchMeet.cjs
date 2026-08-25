const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf-8');
code = code.replace(
  "        const space = await response.json();\n        if (space.meetingUri) {",
  "        const space = await response.json();\n" +
  "        if (!response.ok) {\n" +
  "          console.error('Google Meet API Erro Detalhado:', space);\n" +
  "          if (space.error && space.error.message.includes('API has not been used')) {\n" +
  "             onAddLog('error', 'API do Google Meet não está ativada no Cloud Console!');\n" +
  "          } else {\n" +
  "             onAddLog('error', 'API Meet Erro: ' + (space.error?.message || 'Desconhecido'));\n" +
  "          }\n" +
  "          throw new Error('Meet Error');\n" +
  "        }\n" +
  "        if (space.meetingUri) {"
);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
