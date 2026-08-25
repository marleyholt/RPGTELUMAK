const fs = require('fs');
let code = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf-8');
code = code.replace("const rFis = activeVersion ? activeVersion.fisico : character.fisico;", "const rFis = activeVersion?.fisico ?? character.fisico;");
code = code.replace("const rDes = activeVersion ? activeVersion.destreza : character.destreza;", "const rDes = activeVersion?.destreza ?? character.destreza;");
code = code.replace("const rCog = activeVersion ? activeVersion.cognicao : character.cognicao;", "const rCog = activeVersion?.cognicao ?? character.cognicao;");
code = code.replace("const rCar = activeVersion ? activeVersion.carisma : character.carisma;", "const rCar = activeVersion?.carisma ?? character.carisma;");
code = code.replace("const rPri = activeVersion ? activeVersion.primordio : character.primordio;", "const rPri = activeVersion?.primordio ?? character.primordio;");
fs.writeFileSync('src/components/CharacterSheet.tsx', code);
