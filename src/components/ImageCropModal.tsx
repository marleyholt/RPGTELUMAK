import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Move, Check, X, Crop, RefreshCw } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (croppedDataUrl: string) => void;
  aspectRatio?: 'portrait' | 'square' | 'landscape' | 'free';
  title?: string;
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  onSave,
  aspectRatio = 'portrait',
  title = 'Ajustar e Focar Imagem'
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedRatio, setSelectedRatio] = useState<'portrait' | 'square' | 'landscape' | 'free'>(aspectRatio);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    // Reset transform on open
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setSelectedRatio(aspectRatio);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawPreview();
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, aspectRatio]);

  useEffect(() => {
    if (imageRef.current) {
      drawPreview();
    }
  }, [zoom, pan, rotation, selectedRatio]);

  const getTargetDimensions = () => {
    switch (selectedRatio) {
      case 'portrait': // 10:17 ratio for Telumak Character cards
        return { width: 340, height: 578 };
      case 'square': // 1:1 for tokens & user avatars
        return { width: 400, height: 400 };
      case 'landscape': // 16:9 for arena maps
        return { width: 560, height: 315 };
      default:
        return { width: 400, height: 400 };
    }
  };

  const drawPreview = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: targetW, height: targetH } = getTargetDimensions();
    canvas.width = targetW;
    canvas.height = targetH;

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    // Center transformations
    ctx.translate(targetW / 2 + pan.x, targetH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate base scale to fill target area
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleConfirmSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    try {
      const dataUrl = canvas.toDataURL('image/webp', 0.88);
      onSave(dataUrl);
      onClose();
    } catch (err) {
      console.error('Erro ao exportar recorte:', err);
      // Fallback
      const fallbackUrl = canvas.toDataURL('image/png');
      onSave(fallbackUrl);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const { width: targetW, height: targetH } = getTargetDimensions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#0c0c0c] border border-white/15 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-500">
              <Crop className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                {title}
              </h3>
              <p className="text-[9px] text-white/50 font-mono">
                Arraste para mover, use o zoom para enquadrar o foco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex bg-[#050505] border-b border-white/10 p-2 gap-2 justify-center text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setSelectedRatio('portrait')}
            className={`px-3 py-1 border transition uppercase ${
              selectedRatio === 'portrait'
                ? 'bg-orange-500 text-white border-orange-500 font-bold'
                : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            Ficha (10:17)
          </button>
          <button
            type="button"
            onClick={() => setSelectedRatio('square')}
            className={`px-3 py-1 border transition uppercase ${
              selectedRatio === 'square'
                ? 'bg-orange-500 text-white border-orange-500 font-bold'
                : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            Avatar / Token (1:1)
          </button>
          <button
            type="button"
            onClick={() => setSelectedRatio('landscape')}
            className={`px-3 py-1 border transition uppercase ${
              selectedRatio === 'landscape'
                ? 'bg-orange-500 text-white border-orange-500 font-bold'
                : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            Cenário (16:9)
          </button>
        </div>

        {/* Interactive Canvas Viewport */}
        <div 
          className="flex-1 bg-[#050505] p-6 flex flex-col items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing min-h-[300px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

          {/* Mask container */}
          <div 
            className="relative border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.2)] overflow-hidden"
            style={{
              width: `${Math.min(targetW, 300)}px`,
              height: `${Math.min(targetH, 360)}px`,
              aspectRatio: `${targetW} / ${targetH}`
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain pointer-events-none"
            />
            {/* Focal guide center cross */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-6 h-px bg-white"></div>
              <div className="h-6 w-px bg-white absolute"></div>
            </div>
          </div>

          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
            <span className="text-[9px] text-white/40 font-mono bg-black/60 px-2 py-0.5 border border-white/5">
              Arraste com o cursor para enquadrar
            </span>
          </div>
        </div>

        {/* Zoom & Adjustment Controls */}
        <div className="p-4 bg-[#0a0a0a] border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="h-3.5 w-3.5 text-white/40" />
            <input
              type="range"
              min="0.8"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500 h-1.5 bg-white/10 rounded appearance-none cursor-pointer"
            />
            <ZoomIn className="h-3.5 w-3.5 text-white/40" />
            <span className="text-[10px] font-mono text-orange-400 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[10px] font-mono flex items-center gap-1 transition"
                title="Girar 90°"
              >
                <RotateCw className="h-3 w-3 text-orange-400" />
                Girar
              </button>
              <button
                type="button"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[10px] font-mono flex items-center gap-1 transition"
                title="Resetar Posição"
              >
                <RefreshCw className="h-3 w-3" />
                Centralizar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isExporting}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow"
              >
                {isExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Aplicar Foco
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
