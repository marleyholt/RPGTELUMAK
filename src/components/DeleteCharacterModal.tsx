import React, { useState } from 'react';
import { Character } from '../types';
import { Trash2, AlertTriangle, X, ShieldAlert, Archive } from 'lucide-react';

interface DeleteCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onConfirmArchive: () => Promise<void>;
}

export function DeleteCharacterModal({
  isOpen,
  onClose,
  character,
  onConfirmArchive
}: DeleteCharacterModalProps) {
  const [typedName, setTypedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isMatched = typedName.trim() === character.nome.trim();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched) {
      setError(`Digite exatamente "${character.nome}" para autorizar a exclusão.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onConfirmArchive();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao remover a ficha.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b0b0b] border-2 border-rose-600/80 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2.5 text-rose-500">
            <div className="p-2 bg-rose-950/50 border border-rose-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Mover Ficha para a Lixeira
              </h2>
              <span className="text-[10px] font-mono text-rose-400">Remover da Mesa com Proteção</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security explanation */}
        <div className="bg-rose-950/20 border border-rose-500/30 p-3.5 space-y-2 text-left">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Segurança Contra Exclusão Acidental</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Ao confirmar, a ficha de <strong className="text-white bg-black/60 px-1 py-0.5 border border-white/10 font-mono">{character.nome}</strong> será <strong>ocultada da mesa e dos jogadores</strong>.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono bg-black/50 p-2 border border-emerald-500/20">
            <Archive className="h-3.5 w-3.5 shrink-0" />
            <span>Proteção Ativa: Os dados continuam salvos no banco. Você poderá restaurá-la a qualquer momento na Lixeira do Painel GM.</span>
          </div>
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-white/70 uppercase mb-1.5">
              Digite o nome da ficha para confirmar: <strong className="text-rose-400 font-mono select-all">"{character.nome}"</strong>
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
                setError('');
              }}
              placeholder={character.nome}
              autoFocus
              className="w-full bg-black border border-rose-500/40 focus:border-rose-500 text-white font-mono text-sm px-3.5 py-2.5 outline-none transition"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-mono bg-rose-950/40 p-2 border border-rose-500/30">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs uppercase font-mono transition border border-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isMatched || loading}
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-950/40 disabled:text-white/30 text-white font-black text-xs uppercase tracking-wider transition shadow-lg"
            >
              <Trash2 className="h-4 w-4" />
              <span>{loading ? 'Arquivando...' : 'Confirmar Exclusão'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
