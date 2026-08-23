import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, RefreshCw, Crop } from 'lucide-react';
import { processImageFile } from '../utils/imageUpload';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'free';
  className?: string;
  helperText?: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  maxWidth = 800,
  maxHeight = 800,
  aspectRatio = 'portrait',
  className = '',
  helperText
}: ImageUploadFieldProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    setIsProcessing(true);
    try {
      const dataUrl = await processImageFile(file, maxWidth, maxHeight);
      setPendingCropImage(dataUrl);
      setShowCropModal(true);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Erro ao processar arquivo de imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const handleOpenCropForCurrent = () => {
    if (!value) return;
    setPendingCropImage(value);
    setShowCropModal(true);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider">
        {label}
      </label>

      {value ? (
        <div className="relative group border border-white/15 bg-black/80 p-2 flex items-center gap-3">
          <div className="w-16 h-16 bg-[#111] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span>✓ Imagem Carregada</span>
            </p>
            <p className="text-[9px] text-white/40 font-mono mt-0.5 truncate">
              Armazenada diretamente
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={handleOpenCropForCurrent}
                className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-sky-400 font-bold uppercase tracking-wider py-1 px-2.5 transition flex items-center gap-1 border border-blue-500/30"
                title="Focar, dar zoom e ajustar posição"
              >
                <Crop className="h-2.5 w-2.5" />
                Ajustar / Zoom
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[10px] bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider py-1 px-2 transition flex items-center gap-1"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Trocar
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-[10px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 font-bold uppercase tracking-wider py-1 px-2 transition flex items-center gap-1 border border-rose-900/40"
              >
                <X className="h-2.5 w-2.5" />
                Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed transition-all cursor-pointer p-4 flex flex-col items-center justify-center text-center ${
            dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/15 bg-black/40 hover:border-white/30 hover:bg-white/[0.02]'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2 text-xs text-sky-400 font-mono">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Otimizando imagem...</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1.5 text-white/60">
                <Upload className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-[11px] font-bold text-white uppercase tracking-wider">
                Clique para enviar foto ou arraste aqui
              </p>
              <p className="text-[9px] text-white/40 font-mono mt-0.5">
                PNG, JPG ou WEBP (Com ajuste de foco e zoom)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {helperText && (
        <p className="text-[9px] text-white/35 font-mono">{helperText}</p>
      )}

      {/* Image Crop & Zoom Modal */}
      {showCropModal && pendingCropImage && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setPendingCropImage(null);
          }}
          imageUrl={pendingCropImage}
          aspectRatio={aspectRatio}
          title={`Enquadrar: ${label}`}
          onSave={(croppedUrl) => {
            onChange(croppedUrl);
            setPendingCropImage(null);
            setShowCropModal(false);
          }}
        />
      )}
    </div>
  );
}
