const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const sanitizeFunction = `
// Converte textos brancos do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  // Substitui color: #ffffff, #fff, white, ou rgb(255,255,255) por #000000
  return html.replace(/color:\\s*(?:#ffffff|#fff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))/gi, 'color: #000000');
};

export function PrintableSankoteiSheet`;

code = code.replace('export function PrintableSankoteiSheet', sanitizeFunction);

// Apply it to the dynamically injected HTML
code = code.replace(/__html: character\.html_ataques/g, '__html: sanitizeHtmlForPrint(character.html_ataques)');
code = code.replace(/__html: character\.html_defesa/g, '__html: sanitizeHtmlForPrint(character.html_defesa)');
code = code.replace(/__html: character\.html_dons/g, '__html: sanitizeHtmlForPrint(character.html_dons)');
code = code.replace(/__html: character\.html_equipamentos/g, '__html: sanitizeHtmlForPrint(character.html_equipamentos)');

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
