import React, { useState, useRef } from 'react';
import { NPC } from '../types';
import { X, Minus, Maximize2, Image as ImageIcon, FileText, Download, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface NpcQuickSheetProps {
  npc: NPC;
  onClose: () => void;
  onOpenFull?: () => void;
  initialPos?: { x: number, y: number };
  startMinimized?: boolean;
}

export function NpcQuickSheet({ npc, onClose, onOpenFull, initialPos, startMinimized = true }: NpcQuickSheetProps) {
  const [activeTab, setActiveTab] = useState<'fotos' | 'anotacoes'>('fotos');
  const [isMinimized, setIsMinimized] = useState(startMinimized);
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 320, height: 380 });
  const [currentImageIndex, setCurrentImageIndex] = useState(npc.coverImageIndex || 0);

  // Dragging logic
  const [pos, setPos] = useState(initialPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
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

  const toggleMinimize = () => {
    if (!isMinimized && panelRef.current) {
      setSize({
        width: panelRef.current.offsetWidth,
        height: panelRef.current.offsetHeight
      });
    }
    setIsMinimized(!isMinimized);
  };

  const validImages = (npc.images || []).filter(Boolean);

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `npc-${npc.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      ref={panelRef}
      className="fixed bg-[#2b2d31] border border-[#1f2023] rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden animate-fade-in"
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
        <span className="text-xs font-black text-white truncate pr-2 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          {npc.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {onOpenFull && (
            <button onClick={onOpenFull} className="p-1 text-white/50 hover:text-white transition" title="Abrir Ficha do NPC Completa">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={toggleMinimize} className="p-1 text-white/50 hover:text-white transition" title={isMinimized ? "Maximizar" : "Minimizar"}>
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div className="flex bg-[#232428] border-b border-white/5 overflow-x-auto no-scrollbar shrink-0 select-none">
            <button
              onClick={() => setActiveTab('fotos')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'fotos' ? 'border-indigo-400 text-indigo-400 bg-white/5' : 'border-transparent text-[#949ba4] hover:text-white'}`}
            >
              <ImageIcon className="w-3 h-3" /> Fotos
            </button>
            <button
              onClick={() => setActiveTab('anotacoes')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'anotacoes' ? 'border-indigo-400 text-indigo-400 bg-white/5' : 'border-transparent text-[#949ba4] hover:text-white'}`}
            >
              <FileText className="w-3 h-3" /> Anotações
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll min-h-0 bg-[#313338] relative select-text">
            {activeTab === 'fotos' && (
              <div className="h-full flex flex-col">
                {validImages.length > 0 ? (
                  <>
                    <div className="flex-1 relative bg-[#1e1f22] flex items-center justify-center overflow-hidden">
                      <img 
                        src={validImages[currentImageIndex] || validImages[0]} 
                        alt={npc.name}
                        className="max-w-full max-h-full object-contain"
                      />
                      <button 
                        onClick={() => handleDownload(validImages[currentImageIndex] || validImages[0])}
                        className="absolute top-2 right-2 w-8 h-8 rounded bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-sky-500/80 transition shadow-lg"
                        title="Baixar Foto"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {validImages.length > 1 && (
                        <>
                          <button 
                            onClick={() => setCurrentImageIndex(prev => prev === 0 ? validImages.length - 1 : prev - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setCurrentImageIndex(prev => prev === validImages.length - 1 ? 0 : prev + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                    {validImages.length > 1 && (
                      <div className="p-2 bg-[#232428] flex items-center justify-center gap-2 shrink-0">
                        {validImages.map((img, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-12 h-12 rounded border-2 overflow-hidden transition ${currentImageIndex === idx ? 'border-indigo-500 opacity-100' : 'border-transparent opacity-40 hover:opacity-100'}`}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs font-bold uppercase tracking-wider">Sem fotos</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'anotacoes' && (
              <div className="p-3 h-full">
                {npc.content ? (
                  <div 
                    className="prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-headings:font-black prose-a:text-sky-400"
                    dangerouslySetInnerHTML={{ __html: npc.content }} 
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                    <FileText className="w-8 h-8" />
                    <span className="text-xs font-bold uppercase tracking-wider">Sem anotações</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
