const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  "model: \"gemini-2.5-flash\",",
  "model: \"gemini-2.5-pro\","
);
code = code.replace(
  "model: \"gemini-3.7-flash\",",
  "model: \"gemini-2.5-flash\","
);
fs.writeFileSync('server.ts', code);
