const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const regex1 = /color:\\s\*\(\?:#ffffff\|#fff\|white\|rgb\\\\(\\\\s\*255\\\\s\*,\\\\s\*255\\\\s\*,\\\\s\*255\\\\s\*\\\\)\)/gi;
const regex2 = /color=\\["'\\]\(\?:#ffffff\|#fff\|white\|rgb\\\\(\\\\s\*255\\\\s\*,\\\\s\*255\\\\s\*,\\\\s\*255\\\\s\*\\\\)\)\\["'\\]/gi;

// It's easier to just do a string replace on the function body
const oldFunc = `// Converte textos brancos do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  let sanitized = html;
  // Substitui style="color: white" 
  sanitized = sanitized.replace(/color:\\s*(?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))/gi, 'color: #000000');
  // Substitui color="white" (muito comum em tabelas criadas no editor)
  sanitized = sanitized.replace(/color=["'](?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))["']/gi, 'color="#000000"');
  return sanitized;
};`;

const newFunc = `// Converte textos brancos do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  let sanitized = html;
  // Substitui style="color: white" 
  sanitized = sanitized.replace(/color:\\s*(?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\)|rgba\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*,\\s*1\\s*\\))/gi, 'color: #000000');
  // Substitui color="white" (muito comum em tabelas criadas no editor)
  sanitized = sanitized.replace(/color=["'](?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\)|rgba\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*,\\s*1\\s*\\))["']/gi, 'color="#000000"');
  return sanitized;
};`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
