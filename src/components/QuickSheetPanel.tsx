import React, { useState } from 'react';
import { Character } from '../types';
import { X, ExternalLink, Shield, Swords, Backpack, Star, Info } from 'lucide-react';
import Markdown from 'react-markdown';

interface QuickSheetPanelProps {
  character: Character;
  sections: string[];
  onClose: () => void;
  onOpenFull: () => void;
}

export function QuickSheetPanel({ character, sections, onClose, onOpenFull }: QuickSheetPanelProps) {
  const defaultSections = sections.length > 0 ? sections : ['indicadores'];

  const renderSection = (sec: string) => {
    switch(sec) {
      case 'indicadores':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-950/30 border border-red-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-red-400">HP</span>
                <span className="block text-sm font-black text-white">{character.hp_atual} / {character.hp_max}</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-500/20 p-2 rounded">
                <span className="block text-[10px] uppercase font-black text-blue-400">Ether</span>
                <span className="block text-sm font-black text-white">{character.ether_atual} / {character.ether_max}</span>
              </div>
            </div>
            
            <div className="bg-[#1e1f22] border border-white/5 p-2 rounded">
              <span className="block text-[10px] uppercase font-black text-[#949ba4] mb-1">Primórdio</span>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full ${i < character.primordio ? 'bg-amber-400' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

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
            <Markdown>{character.html_ataques || '*Nenhum ataque cadastrado.*'}</Markdown>
          </div>
        );
      case 'defesa':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            <Markdown>{character.html_defesa || '*Nenhuma defesa cadastrada.*'}</Markdown>
          </div>
        );
      case 'dons':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            <Markdown>{character.html_dons || '*Nenhum dom cadastrado.*'}</Markdown>
          </div>
        );
      case 'equipamento':
        return (
          <div className="markdown-body text-xs bg-[#1e1f22] p-2 rounded border border-white/5 h-full overflow-y-auto custom-scroll">
            <Markdown>{character.html_equipamentos || '*Nenhum equipamento cadastrado.*'}</Markdown>
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

  return (
    <div className="fixed right-4 bottom-20 w-80 max-w-[calc(100vw-2rem)] bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e1f22] border-b border-white/5 cursor-move">
        <span className="text-xs font-black text-white truncate pr-2">{character.nome}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onOpenFull} className="p-1 text-white/50 hover:text-white transition" title="Abrir Ficha Completa">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {defaultSections.length > 1 && (
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

      <div className="p-3 h-64 overflow-y-auto custom-scroll">
        {renderSection(activeTab)}
      </div>
    </div>
  );
}
