const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf-8');
code = code.replace(
  "body, html, #root, .min-h-screen {",
  "body, html, .min-h-screen {\n    background: white !important;\n    background-color: white !important;\n    color: black !important;\n  }\n  #root {\n    display: none !important;\n  }"
);
fs.writeFileSync('src/index.css', code);
