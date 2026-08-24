const fs = require('fs');
let content = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf8');

const regexPage1End = /\{\/\* COMBATE SECTION \*\/\}.*?(?=\{\/\* ========================================================================= \*\/)/s;
const match = content.match(regexPage1End);

if (match) {
  const newContent = `
            {/* CONTINUOUS FLOW SECTION (Ataques, Defesa, Dons, Equipamentos) */}
            <div className="space-y-6 text-xs">
              
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
          
          {/* We remove the footer and extra pages, making it a single continuous printable area */}
        </div>
`;
  
  // Actually, wait, let's just replace from `{/* COMBATE SECTION */}` to the end of the main wrapper.
  const regexFullReplace = /\{\/\* COMBATE SECTION \*\/\}.*?(?=\{\/\* DOCUMENT WRAPPER END \*\/|<\/div>\s*<\/div>\s*<\/div>\s*\)$)/s;
  
  content = content.replace(regexFullReplace, newContent);
  fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', content);
  console.log('Success replacing printable layout');
} else {
  console.log('Failed to match');
}
