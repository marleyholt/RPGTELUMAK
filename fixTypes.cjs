const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');
code = code.replace("fisico: number;", "fisico?: number;");
code = code.replace("destreza: number;", "destreza?: number;");
code = code.replace("cognicao: number;", "cognicao?: number;");
code = code.replace("carisma: number;", "carisma?: number;");
code = code.replace("primordio: number;", "primordio?: number;");
fs.writeFileSync('src/types.ts', code);
