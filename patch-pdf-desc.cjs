const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');
code = code.replace('Ficha formatada em 4 páginas diagramadas para impressão A4 e download em PDF', 'Ficha formatada em layout contínuo para impressão A4 e download em PDF');
fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
