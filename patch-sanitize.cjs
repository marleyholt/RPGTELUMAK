const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const oldSanitize = `// Converte textos brancos do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  // Substitui color: #ffffff, #fff, white, ou rgb(255,255,255) por #000000
  return html.replace(/color:\\s*(?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))/gi, 'color: #000000');
};`;

const newSanitize = `// Converte textos brancos do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  let sanitized = html;
  // Substitui style="color: white" 
  sanitized = sanitized.replace(/color:\\s*(?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))/gi, 'color: #000000');
  // Substitui color="white" (muito comum em tabelas criadas no editor)
  sanitized = sanitized.replace(/color=["'](?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))["']/gi, 'color="#000000"');
  return sanitized;
};`;

code = code.replace(oldSanitize, newSanitize);

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
