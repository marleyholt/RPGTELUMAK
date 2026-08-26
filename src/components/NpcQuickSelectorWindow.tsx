import React, { useState } from 'react';
import { NPC } from '../types';
import { X, Check, Users } from 'lucide-react';

interface NpcQuickSelectorWindowProps {
  npcs: NPC[];
  openNpcIds: string[];
  onToggleNpc: (id: string) => void;
  onClose: () => void;
}

export function NpcQuickSelectorWindow({ npcs, openNpcIds, onToggleNpc, onClose }: NpcQuickSelectorWindowProps) {
  const [pos, setPos] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - (pos ? pos.x : (window.innerWidth / 2 - 128)),
      y: e.clientY - (pos ? pos.y : (window.innerHeight / 2 - 160))
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
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden animate-fade-in w-64 h-80"
      style={pos ? { left: pos.x, top: pos.y } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <div 
        className="flex items-center justify-between px-3 py-2 bg-[#1e1f22] border-b border-white/5 cursor-move select-none shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-sky-400" />
          Fichas de NPCs
        </span>
        <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition" title="Fechar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
        {npcs.length === 0 ? (
          <div className="p-3 text-xs text-white/40 italic text-center">Nenhum NPC cadastrado.</div>
        ) : (
          npcs.map(npc => {
            const isOpen = openNpcIds.includes(npc.id);
            return (
              <button
                key={npc.id}
                onClick={() => onToggleNpc(npc.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition flex items-center justify-between ${isOpen ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-white/5 text-white/70'}`}
              >
                <span className={`truncate ${isOpen ? 'font-bold' : ''}`}>{npc.name || 'Sem Nome'}</span>
                {isOpen && <Check className="w-3.5 h-3.5" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  );
}
