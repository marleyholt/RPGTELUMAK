const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* MODAL: QUICK STAT ADJUSTER FOR GM \*\/\}(.|\n)*?\n          \}\)/;
const match = code.match(regex);

if (match) {
  let modalCode = match[0];
  // Remove it from current location
  code = code.replace(modalCode, '');
  
  // Place it right before {/* COMPACT FOOTER */}
  code = code.replace("{/* COMPACT FOOTER */}", modalCode + "\n\n      {/* COMPACT FOOTER */}");
  
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("Not found");
}

