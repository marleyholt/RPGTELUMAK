const fs = require('fs');
let content = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const splitMarker = '{/* COMBATE SECTION */}';
const parts = content.split(splitMarker);

if (parts.length === 2) {
  let topPart = parts[0];
  
  const bottomPart = `
            {/* CONTINUOUS FLOW SECTION (Ataques, Defesa, Dons, Equipamentos) */}
            <div className="space-y-6 text-xs mt-6">
              
              {/* ATAQUES */}
              <div className="border border-black break-inside-avoid">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  ATAQUES
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_ataques ? (
                      <div dangerouslySetInnerHTML={{ __html: character.html_ataques }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhum ataque registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* DEFESA */}
              <div className="border border-black break-inside-avoid">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  DEFESA
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_defesa ? (
                      <div dangerouslySetInnerHTML={{ __html: character.html_defesa }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhuma defesa registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* DONS E PODERES */}
              <div className="border border-black break-inside-avoid">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  DONS E PODERES
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_dons ? (
                      <div dangerouslySetInnerHTML={{ __html: character.html_dons }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhum dom registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* EQUIPAMENTOS */}
              <div className="border border-black break-inside-avoid">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  EQUIPAMENTOS
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_equipamentos ? (
                      <div dangerouslySetInnerHTML={{ __html: character.html_equipamentos }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhum equipamento registrado.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <div className="text-[9px] text-neutral-400 font-mono text-center pt-4 border-t border-neutral-200 mt-8 mb-4">
            RPG TELUMAK • FICHA OFICIAL SANKÖTEI
          </div>
        </div>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', topPart + bottomPart);
  console.log('Successfully rewritten the PDF structure.');
} else {
  console.log('Marker not found or multiple markers found.');
}
