const fs = require('fs');

let code = fs.readFileSync('src/components/SheetVersions.tsx', 'utf8');

const badPayload = `      fisico: Number(vFisico),
      destreza: Number(vDestreza),
      cognicao: Number(vCognicao),
      carisma: Number(vCarisma),
      primordio: Number(vPrimordio),
      img_saudavel: vImgSaudavel.trim() || undefined,
      img_ferido: vImgFerido.trim() || undefined,
      img_muito_ferido: vImgMuitoFerido.trim() || undefined,
      html_ataques: vHtmlAtaques.trim() || undefined,
      html_dons: vHtmlDons.trim() || undefined,
      html_equipamentos: vHtmlEquipamentos.trim() || undefined,
      html_defesa: vHtmlDefesa.trim() || undefined,
    };`;

const goodPayload = `      fisico: Number(vFisico),
      destreza: Number(vDestreza),
      cognicao: Number(vCognicao),
      carisma: Number(vCarisma),
      primordio: Number(vPrimordio)
    };
    if (vImgSaudavel.trim()) newVersion.img_saudavel = vImgSaudavel.trim();
    if (vImgFerido.trim()) newVersion.img_ferido = vImgFerido.trim();
    if (vImgMuitoFerido.trim()) newVersion.img_muito_ferido = vImgMuitoFerido.trim();
    if (vHtmlAtaques.trim()) newVersion.html_ataques = vHtmlAtaques.trim();
    if (vHtmlDons.trim()) newVersion.html_dons = vHtmlDons.trim();
    if (vHtmlEquipamentos.trim()) newVersion.html_equipamentos = vHtmlEquipamentos.trim();
    if (vHtmlDefesa.trim()) newVersion.html_defesa = vHtmlDefesa.trim();`;

if (code.includes('img_saudavel: vImgSaudavel.trim() || undefined,')) {
    code = code.replace(badPayload, goodPayload);
    fs.writeFileSync('src/components/SheetVersions.tsx', code);
    console.log('Patched SheetVersions.tsx');
} else {
    console.log('Could not patch SheetVersions');
}
