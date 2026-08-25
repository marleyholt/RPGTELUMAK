const fs = require('fs');
let code = fs.readFileSync('src/utils/errors.ts', 'utf8');
code = code.replace("throw new Error(JSON.stringify(errInfo));", "// throw new Error(JSON.stringify(errInfo));");
fs.writeFileSync('src/utils/errors.ts', code);
console.log('Error handler patched.');
