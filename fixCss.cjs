const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf-8');
const searchStr = `@media print {
  body, html, .min-h-screen {
    background: white !important;
    background-color: white !important;
    color: black !important;
  }
  #root {
    display: none !important;
  }
    background: white !important;
    background-color: white !important;
    color: black !important;
  }
}`;
const replaceStr = `@media print {
  body, html {
    background: white !important;
    color: black !important;
  }
  #root {
    display: none !important;
  }
}`;
code = code.replace(searchStr, replaceStr);
fs.writeFileSync('src/index.css', code);
