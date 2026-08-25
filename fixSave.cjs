const fs = require('fs');
let code = fs.readFileSync('src/components/SheetVersions.tsx', 'utf-8');

code = code.replace("fisico: Number(vFisico),", "fortitude_max: vFortitudeMax,");
code = code.replace("destreza: Number(vDestreza),", "movimento_max: vMovimentoMax,");
code = code.replace("cognicao: Number(vCognicao),", "alcance_max: vAlcanceMax,");
code = code.replace("carisma: Number(vCarisma),", "tecnicas_max: vTecnicasMax,");
code = code.replace("primordio: Number(vPrimordio)", "");

fs.writeFileSync('src/components/SheetVersions.tsx', code);
