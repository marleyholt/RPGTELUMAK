const fs = require('fs');
let code = fs.readFileSync('src/components/GameTable.tsx', 'utf-8');

const notepadOld = `{/* Notepad Sidebar */}
        <div className="w-full lg:w-96 flex flex-col bg-[#2b2d31] border border-[#1f2023] rounded-lg overflow-hidden shrink-0 shadow-lg">
          <div className="p-3 bg-black/20 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Bloco de Notas (Sessão)
            </h3>
          </div>
          <div className="flex-1 p-2 bg-black/20">
            <div className="h-full bg-[#1e1f22] rounded overflow-hidden">
              <RichTextEditor 
                value={notepadContent} 
                onChange={setNotepadContent} 
                placeholder="Anotações da sessão, pontos de vida de monstros genéricos, status..." 
              />
            </div>
          </div>
        </div>`;

const notepadNew = `{/* Notepad Sidebar */}
        <div className="w-full lg:w-96 flex flex-col bg-[#2b2d31] border border-[#1f2023] rounded-lg shrink-0 shadow-lg" style={{ resize: 'horizontal', overflow: 'auto', minWidth: '300px', maxWidth: '60vw' }}>
          <div className="p-3 bg-black/20 border-b border-white/5 flex items-center justify-between sticky top-0 z-10">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Bloco de Notas (Sessão)
            </h3>
          </div>
          <div className="flex-1 p-2 bg-black/20 overflow-y-auto">
            <div className="min-h-[500px] h-full bg-[#1e1f22] rounded flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <RichTextEditor 
                  value={notepadContent} 
                  onChange={setNotepadContent} 
                  placeholder="Anotações da sessão, pontos de vida de monstros genéricos, status..." 
                />
              </div>
            </div>
          </div>
        </div>`;

code = code.replace(notepadOld, notepadNew);
fs.writeFileSync('src/components/GameTable.tsx', code);
