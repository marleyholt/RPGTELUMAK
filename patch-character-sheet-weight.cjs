const fs = require('fs');
let code = fs.readFileSync('src/components/CharacterSheet.tsx', 'utf8');

// Insert the helper function right outside the component or inside
const helper = `
const getFortitudeWeight = (fortitudeStr?: string | number): number => {
  if (!fortitudeStr) return 0;
  const val = String(fortitudeStr);
  const parts = val.split('|');
  const targetStr = parts.length > 1 ? parts[1] : parts[0];
  const match = targetStr.match(/\\d+/);
  if (match) return parseInt(match[0], 10) * 50;
  const fallback = val.match(/\\d+/);
  return fallback ? parseInt(fallback[0], 10) * 50 : 0;
};
`;

if (!code.includes('getFortitudeWeight')) {
    code = code.replace("interface CharacterSheetProps", helper + "\ninterface CharacterSheetProps");
}

const fortitudeBlockToReplace = `              <p className="text-xl font-black text-violet-400 font-mono mt-1">
                {rFortitudeMax}
              </p>
              <p className="text-[9px] text-white/40 font-mono mt-0.5">
                Capacidade de Carga & Resistência Física
              </p>`;

const fortitudeBlockNew = `              <p className="text-xl font-black text-violet-400 font-mono mt-1">
                {rFortitudeMax}
              </p>
              <p className="text-[10px] font-mono mt-1 mb-1 text-violet-300 bg-violet-950/40 inline-block px-1.5 py-0.5 rounded border border-violet-500/20">
                Peso Máx: {getFortitudeWeight(rFortitudeMax)}kg
              </p>
              <p className="text-[9px] text-white/40 font-mono mt-0.5 block">
                Capacidade de Carga & Resistência Física
              </p>`;

code = code.replace(fortitudeBlockToReplace, fortitudeBlockNew);

fs.writeFileSync('src/components/CharacterSheet.tsx', code);
