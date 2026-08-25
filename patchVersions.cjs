const fs = require('fs');

let code = fs.readFileSync('src/components/SheetVersions.tsx', 'utf-8');

// Replace state variables
code = code.replace(
  "  const [vFisico, setVFisico] = useState(character.fisico);\n  const [vDestreza, setVDestreza] = useState(character.destreza);\n  const [vCognicao, setVCognicao] = useState(character.cognicao);\n  const [vCarisma, setVCarisma] = useState(character.carisma);\n  const [vPrimordio, setVPrimordio] = useState(character.primordio);",
  "  const [vFortitudeMax, setVFortitudeMax] = useState(character.fortitude_max || '');\n  const [vMovimentoMax, setVMovimentoMax] = useState(character.movimento_max || '');\n  const [vAlcanceMax, setVAlcanceMax] = useState(character.alcance_max || '');\n  const [vTecnicasMax, setVTecnicasMax] = useState(character.tecnicas_max || '');"
);

// handleSaveVersion payload
const handleSaveRegex = /const payload \= \{([\s\S]*?)\};/;
code = code.replace(handleSaveRegex, (match, inner) => {
  let replaced = inner
    .replace("fisico: vFisico,", "fortitude_max: vFortitudeMax,")
    .replace("destreza: vDestreza,", "movimento_max: vMovimentoMax,")
    .replace("cognicao: vCognicao,", "alcance_max: vAlcanceMax,")
    .replace("carisma: vCarisma,", "tecnicas_max: vTecnicasMax,")
    .replace("primordio: vPrimordio,\n", "");
  return `const payload = {${replaced}};`;
});

// handleEditSetup
const handleEditRegex = /setVFisico\(ver\.fisico\);\s*setVDestreza\(ver\.destreza\);\s*setVCognicao\(ver\.cognicao\);\s*setVCarisma\(ver\.carisma\);\s*setVPrimordio\(ver\.primordio\);/;
code = code.replace(handleEditRegex, `setVFortitudeMax(ver.fortitude_max || '');
    setVMovimentoMax(ver.movimento_max || '');
    setVAlcanceMax(ver.alcance_max || '');
    setVTecnicasMax(ver.tecnicas_max || '');`);

// handleResetForm
const handleResetRegex = /setVFisico\(character\.fisico\);\s*setVDestreza\(character\.destreza\);\s*setVCognicao\(character\.cognicao\);\s*setVCarisma\(character\.carisma\);\s*setVPrimordio\(character\.primordio\);/;
code = code.replace(handleResetRegex, `setVFortitudeMax(character.fortitude_max || '');
    setVMovimentoMax(character.movimento_max || '');
    setVAlcanceMax(character.alcance_max || '');
    setVTecnicasMax(character.tecnicas_max || '');`);

// The JSX for Attributes -> Marcadores
const formJsxRegex = /\{\/\* Attributes block \*\/\}([\s\S]*?)\{\/\* Alternate images via direct file upload \*\/\}/;
code = code.replace(formJsxRegex, `{/* Marcadores Substitutos block */}
              <div>
                <span className="block text-[10px] text-sky-400 uppercase font-black tracking-widest mb-2.5 italic">Marcadores Substitutos</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">Fortitude (Max)</span>
                    <input type="text" value={vFortitudeMax} onChange={e => setVFortitudeMax(e.target.value)} className="w-full text-center bg-transparent focus:outline-none font-bold text-white font-mono text-xs" placeholder="Ex: 29+4 | 33" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">Movimento (Max)</span>
                    <input type="text" value={vMovimentoMax} onChange={e => setVMovimentoMax(e.target.value)} className="w-full text-center bg-transparent focus:outline-none font-bold text-white font-mono text-xs" placeholder="Ex: 03 | 15m" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">Alcance (Max)</span>
                    <input type="text" value={vAlcanceMax} onChange={e => setVAlcanceMax(e.target.value)} className="w-full text-center bg-transparent focus:outline-none font-bold text-white font-mono text-xs" placeholder="Ex: 03 (6)" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">Técnicas (Max)</span>
                    <input type="text" value={vTecnicasMax} onChange={e => setVTecnicasMax(e.target.value)} className="w-full text-center bg-transparent focus:outline-none font-bold text-white font-mono text-xs" placeholder="Ex: 02" />
                  </div>
                </div>
              </div>

              {/* Alternate images via direct file upload */}`);

fs.writeFileSync('src/components/SheetVersions.tsx', code);

