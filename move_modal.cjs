const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const modalStartStr = "{/* MODAL: QUICK STAT ADJUSTER FOR GM */}";
const startIdx = code.indexOf(modalStartStr);
if (startIdx !== -1) {
  // Find the end of this modal block. It ends right before {/* MAIN FULL-WIDTH CHARACTER SHEET VIEW */}
  const endStr = "{/* MAIN FULL-WIDTH CHARACTER SHEET VIEW */}";
  const endIdx = code.indexOf(endStr, startIdx);
  if (endIdx !== -1) {
    const modalCode = code.substring(startIdx, endIdx);
    
    // Remove it from current location
    code = code.replace(modalCode, '');
    
    // Append it before {/* COMPACT FOOTER */}
    const footerStr = "{/* COMPACT FOOTER */}";
    code = code.replace(footerStr, modalCode + "\n\n      " + footerStr);
    
    fs.writeFileSync('src/App.tsx', code);
    console.log("Moved successfully.");
  }
}
