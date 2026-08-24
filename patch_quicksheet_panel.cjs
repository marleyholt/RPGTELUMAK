const fs = require('fs');
let code = fs.readFileSync('src/components/QuickSheetPanel.tsx', 'utf8');

const importTarget = `import { X, ExternalLink, Shield, Swords, Backpack, Star, Info } from 'lucide-react';`;
const newImportTarget = `import { X, ExternalLink, Shield, Swords, Backpack, Star, Info, Minus, Maximize2 } from 'lucide-react';`;
code = code.replace(importTarget, newImportTarget);

const stateTarget = `  // Dragging logic`;
const newStateTarget = `  const [isMinimized, setIsMinimized] = useState(false);
  
  // Dragging logic`;
code = code.replace(stateTarget, newStateTarget);

const returnTarget = `      style={{
        left: pos.x,
        top: pos.y,
        width: '320px',
        height: '340px',
        minWidth: '280px',
        minHeight: '200px',
        resize: 'both'
      }}`;
const newReturnTarget = `      style={{
        left: pos.x,
        top: pos.y,
        width: isMinimized ? '260px' : '320px',
        height: isMinimized ? 'auto' : '340px',
        minWidth: isMinimized ? 'auto' : '280px',
        minHeight: isMinimized ? 'auto' : '200px',
        resize: isMinimized ? 'none' : 'both'
      }}`;
code = code.replace(returnTarget, newReturnTarget);

const headerTarget = `        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onOpenFull} className="p-1 text-white/50 hover:text-white transition" title="Abrir Ficha Completa">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {defaultSections.length > 1 && (`;
const newHeaderTarget = `        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 text-white/50 hover:text-white transition" title={isMinimized ? "Maximizar" : "Minimizar"}>
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onOpenFull} className="p-1 text-white/50 hover:text-white transition" title="Abrir Ficha Completa">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {!isMinimized && defaultSections.length > 1 && (`;
code = code.replace(headerTarget, newHeaderTarget);

const contentTarget = `      <div className="p-3 flex-1 overflow-y-auto custom-scroll min-h-0">
        {renderSection(activeTab)}
      </div>`;
const newContentTarget = `      {!isMinimized && (
        <div className="p-3 flex-1 overflow-y-auto custom-scroll min-h-0">
          {renderSection(activeTab)}
        </div>
      )}`;
code = code.replace(contentTarget, newContentTarget);

const indicatorsTarget = `            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-red-400">HP</span>
                <span className="block text-sm font-black text-white">{character.hp_atual} / {character.hp_max}</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-blue-400">Ether</span>
                <span className="block text-sm font-black text-white">{character.ether_atual} / {character.ether_max}</span>
              </div>
            </div>
            
            <div className="bg-[#1e1f22] border border-white/5 p-2 rounded">`;
const newIndicatorsTarget = `            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-red-400">HP</span>
                <span className="block text-sm font-black text-white">{character.hp_atual} / {character.hp_max}</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-blue-400">Ether</span>
                <span className="block text-sm font-black text-white">{character.ether_atual} / {character.ether_max}</span>
              </div>
              {(character.destino_max ?? 0) > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/20 p-2 rounded col-span-2">
                  <span className="block text-[10px] uppercase font-black text-amber-400">Destino</span>
                  <span className="block text-sm font-black text-white">{character.destino_atual ?? character.destino_max} / {character.destino_max}</span>
                </div>
              )}
            </div>
            
            {((character.alcance_max && character.alcance_max !== "0") || (character.movimento_max && character.movimento_max !== "0") || (character.fortitude_max && character.fortitude_max !== "0") || (character.tecnicas_max && character.tecnicas_max !== "0")) && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
                <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Estatísticas</span>
                
                {character.alcance_max && character.alcance_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Alcance:</span>
                    <span className="text-white font-bold text-right truncate">{character.alcance_max}</span>
                  </div>
                )}
                {character.movimento_max && character.movimento_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Movimento:</span>
                    <span className="text-white font-bold text-right truncate">{character.movimento_max}</span>
                  </div>
                )}
                {character.fortitude_max && character.fortitude_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Fortitude:</span>
                    <span className="text-white font-bold text-right truncate">{character.fortitude_max}</span>
                  </div>
                )}
                {character.tecnicas_max && character.tecnicas_max !== "0" && (
                  <div className="flex justify-between text-xs items-center gap-2">
                    <span className="text-white/70">Técnicas:</span>
                    <span className="text-white font-bold text-right truncate">{character.tecnicas_max}</span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#1e1f22] border border-white/5 p-2 rounded">`;
code = code.replace(indicatorsTarget, newIndicatorsTarget);

fs.writeFileSync('src/components/QuickSheetPanel.tsx', code);
console.log('Patched QuickSheet minimize state and new indicators');
