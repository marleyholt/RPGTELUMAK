const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

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
    code = code.replace("interface PrintableSankoteiSheetProps", helper + "\ninterface PrintableSankoteiSheetProps");
}

const fortitudeBlockToReplace = `                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">FORTITUDE:</span>
                    <span className="font-mono text-neutral-900">
                      {character.fortitude_max || '29+4 | 33 equipados'}
                    </span>
                  </div>`;

const fortitudeBlockNew = `                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">FORTITUDE:</span>
                    <span className="font-mono text-neutral-900">
                      {character.fortitude_max || '29+4 | 33 equipados'} <span className="text-neutral-500 text-[10px] ml-1">({getFortitudeWeight(character.fortitude_max || '33')}kg)</span>
                    </span>
                  </div>`;

code = code.replace(fortitudeBlockToReplace, fortitudeBlockNew);

fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
