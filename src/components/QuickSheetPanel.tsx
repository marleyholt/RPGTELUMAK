import React, { useState, useRef } from 'react';
import { Character } from '../types';
import { X, ExternalLink, Shield, Swords, Backpack, Star, Info, Minus, Maximize2 } from 'lucide-react';
// Removed Markdown import

interface QuickSheetPanelProps {
  character: Character;
  sections: string[];
  onClose: () => void;
  onOpenFull: () => void;
  initialPos?: { x: number, y: number };
  startMinimized?: boolean;
}

export function QuickSheetPanel({ character, sections, onClose, onOpenFull, initialPos, startMinimized = false }: QuickSheetPanelProps) {
  const allSections = ['indicadores', 'ataque', 'defesa', 'dons', 'equipamento'];
  const defaultSections = allSections.filter(sec => !sections.includes(sec));

  const renderSection = (sec: string) => {
    switch(sec) {
      case 'indicadores':
        return (
          <div className="space-y-3">
            {((character.hp_max ?? 0) > 0 || (character.ether_max ?? 0) > 0 || (character.destino_max ?? 0) > 0) && (
              <div className="grid grid-cols-2 gap-2">
                {(character.hp_max ?? 0) > 0 && (
                  <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
                    <span className="block text-[10px] uppercase font-black text-red-400">HP</span>
                    <span className="block text-sm font-black text-white">{character.hp_atual} / {character.hp_max}</span>
                  </div>
                )}
                {(character.ether_max ?? 0) > 0 && (
                  <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                    <span className="block text-[10px] uppercase font-black text-blue-400">Ether</span>
                    <span className="block text-sm font-black text-white">{character.ether_atual} / {character.ether_max}</span>
                  </div>
                )}
                {(character.destino_max ?? 0) > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/20 p-2 rounded col-span-2">
                    <span className="block text-[10px] uppercase font-black text-amber-400">Destino</span>
                    <span className="block text-sm font-black text-white">{character.destino_atual ?? character.destino_max} / {character.destino_max}</span>
                  </div>
                )}
              </div>
            )}
            
            {(character.primordio ?? 0) > 0 && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded flex items-center justify-between">
                <span className="block text-[10px] uppercase font-black text-[#949ba4]">Primórdio</span>
                <span className="text-sm font-black text-amber-400">{character.primordio}</span>
              </div>
            )}
            
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


            {((character.ferramenta_fisico_max ?? 2) > 0 || 
               (character.ferramenta_fisico_sec_max ?? 3) > 0 || 
               (character.ferramenta_destreza_max ?? 0) > 0 || 
               (character.ferramenta_cognicao_max ?? 0) > 0 || 
               (character.ferramenta_carisma_max ?? 1) > 0) && (
              <div className="bg-[#1e1f22] border border-white/5 p-2 rounded space-y-1">
                <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Ferramentas de Combate</span>
                
                {(character.ferramenta_fisico_max ?? 2) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Físico (F):</span>
                    <span className="text-white font-bold">{character.ferramenta_fisico_atual ?? character.ferramenta_fisico_max ?? 2} / {character.ferramenta_fisico_max ?? 2}</span>
                  </div>
                )}
                {(character.ferramenta_fisico_sec_max ?? 3) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Físico Sec.:</span>
                    <span className="text-white font-bold">{character.ferramenta_fisico_sec_atual ?? character.ferramenta_fisico_sec_max ?? 3} / {character.ferramenta_fisico_sec_max ?? 3}</span>
                  </div>
                )}
                {(character.ferramenta_destreza_max ?? 0) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Destreza (D):</span>
                    <span className="text-white font-bold">{character.ferramenta_destreza_atual ?? character.ferramenta_destreza_max ?? 0} / {character.ferramenta_destreza_max ?? 0}</span>
                  </div>
                )}
                {(character.ferramenta_cognicao_max ?? 0) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Cognição (C):</span>
                    <span className="text-white font-bold">{character.ferramenta_cognicao_atual ?? character.ferramenta_cognicao_max ?? 0} / {character.ferramenta_cognicao_max ?? 0}</span>
                  </div>
                )}
                {(character.ferramenta_carisma_max ?? 1) > 0 && (
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-white/70">Carisma (S):</span>
                    <span className="text-white font-bold">{character.ferramenta_carisma_atual ?? character.ferramenta_carisma_max ?? 1} / {character.ferramenta_carisma_max ?? 1}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'ataque':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            {!character.html_ataques ? <p className="text-white/40 italic">Nenhum ataque cadastrado.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_ataques }} />}
          </div>
        );
      case 'defesa':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            {!character.html_defesa ? <p className="text-white/40 italic">Nenhuma defesa cadastrada.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_defesa }} />}
          </div>
        );
      case 'dons':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            {!character.html_dons ? <p className="text-white/40 italic">Nenhum dom cadastrado.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_dons }} />}
          </div>
        );
      case 'equipamento':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            {!character.html_equipamentos ? <p className="text-white/40 italic">Nenhum equipamento cadastrado.</p> : <div dangerouslySetInnerHTML={{ __html: character.html_equipamentos }} />}
          </div>
        );
      default: return null;
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'indicadores': return <Info className="w-3 h-3" />;
      case 'ataque': return <Swords className="w-3 h-3" />;
      case 'defesa': return <Shield className="w-3 h-3" />;
      case 'dons': return <Star className="w-3 h-3" />;
      case 'equipamento': return <Backpack className="w-3 h-3" />;
      default: return null;
    }
  }

  const getLabel = (id: string) => {
    switch (id) {
      case 'indicadores': return 'Status';
      case 'ataque': return 'Ataque';
      case 'defesa': return 'Defesa';
      case 'dons': return 'Dons';
      case 'equipamento': return 'Equip.';
      default: return id;
    }
  }

  const [activeTab, setActiveTab] = useState(defaultSections[0]);
  
  const [isMinimized, setIsMinimized] = useState(startMinimized);
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 320, height: 340 });

  const toggleMinimize = () => {
    if (!isMinimized && panelRef.current) {
      setSize({
        width: panelRef.current.offsetWidth,
        height: panelRef.current.offsetHeight
      });
    }
    setIsMinimized(!isMinimized);
  };
  
  // Dragging logic
  const [pos, setPos] = useState(initialPos || { x: window.innerWidth - 340, y: window.innerHeight - 340 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPos({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={panelRef}
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-[90] flex flex-col overflow-hidden animate-fade-in"
      style={{
        left: pos.x,
        top: pos.y,
        width: isMinimized ? '260px' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        minWidth: isMinimized ? 'auto' : '280px',
        minHeight: isMinimized ? 'auto' : '200px',
        resize: isMinimized ? 'none' : 'both'
      }}
    >
      <div 
        className="flex items-center justify-between px-3 py-2 bg-[#1e1f22] border-b border-white/5 cursor-move select-none shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="text-xs font-black text-white truncate pr-2">{character.nome}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={toggleMinimize} className="p-1 text-white/50 hover:text-white transition" title={isMinimized ? "Maximizar" : "Minimizar"}>
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
      
      {!isMinimized && defaultSections.length > 1 && (
        <div className="flex bg-[#232428] border-b border-white/5 overflow-x-auto no-scrollbar">
          {defaultSections.map(sec => (
            <button
              key={sec}
              onClick={() => setActiveTab(sec)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider shrink-0 border-b-2 transition ${activeTab === sec ? 'border-indigo-400 text-indigo-400 bg-white/5' : 'border-transparent text-[#949ba4] hover:text-white'}`}
            >
              {getIcon(sec)}
              {getLabel(sec)}
            </button>
          ))}
        </div>
      )}

      {!isMinimized && (
        <div className="p-3 flex-1 overflow-y-auto custom-scroll min-h-0">
          {renderSection(activeTab)}
        </div>
      )}
    </div>
  );
}
