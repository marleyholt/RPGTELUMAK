import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomStatusType, Character } from '../types';
import { Plus, Trash2, Edit3, Sparkles, Check } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';

interface StatusManagerProps {
  isGM: boolean;
  activeCharacter?: Character | null; // For character-specific quick toggles
}

export function StatusManager({ isGM, activeCharacter }: StatusManagerProps) {
  const [statuses, setStatuses] = useState<CustomStatusType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [nome, setNome] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load Status list from firestore
  useEffect(() => {
    const listPath = 'statuses';
    const unsub = onSnapshot(collection(db, listPath), (snap) => {
      const items: CustomStatusType[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...d.data() } as CustomStatusType);
      });
      setStatuses(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, listPath);
    });

    return unsub;
  }, []);

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !imageUrl.trim()) return;

    const id = editingId || nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const path = `statuses/${id}`;

    try {
      await setDoc(doc(db, 'statuses', id), {
        id,
        nome: nome.trim(),
        imageUrl: imageUrl.trim()
      });
      setNome('');
      setImageUrl('');
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteStatus = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o status "${name}"?`)) return;
    const path = `statuses/${id}`;
    try {
      await deleteDoc(doc(db, 'statuses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleToggleOnCharacter = async (statusId: string, char: Character) => {
    if (!char) return;
    const path = `characters/${char.id}`;
    const isActive = char.status_ativos?.includes(statusId);

    try {
      await updateDoc(doc(db, 'characters', char.id), {
        status_ativos: isActive ? arrayRemove(statusId) : arrayUnion(statusId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  if (!isGM) {
    return null;
  }

  return (
    <div className="bg-[#080808] border border-white/10 p-5 rounded-none shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5 italic">
          <Sparkles className="h-4 w-4 stroke-[3]" />
          Gerenciar Status de Jogo
        </h3>
        <span className="text-[9px] bg-white/5 text-white/70 px-2.5 py-1 rounded-none font-mono font-black border border-white/10">PAINEL DO MESTRE</span>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSaveStatus} className="space-y-4 bg-black border border-white/5 p-4 rounded-none">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">
          {editingId ? 'Editar Status Cadastrado' : 'Adicionar Novo Tipo de Status'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Nome do Status</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Paralisado, Queimado"
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none placeholder-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">URL da Imagem / Ícone direto</label>
            <div className="flex gap-1.5">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://icon-library/burn.png"
                className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-mono placeholder-white/10"
                required
              />
              <button
                type="button"
                onClick={() => setImageUrl('https://cdn-icons-png.flaticon.com/512/599/599502.png')}
                className="px-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-none text-xs font-black uppercase tracking-wider transition shrink-0"
                title="Usar fogo padrão"
              >
                FOGO 🔥
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setNome('');
                setImageUrl('');
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-none text-xs font-black uppercase tracking-widest transition"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2 px-5 rounded-none uppercase tracking-widest transition shadow-lg shrink-0"
          >
            {editingId ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Plus className="h-4 w-4 stroke-[3]" />}
            {editingId ? 'Salvar Edições' : 'Cadastrar Status'}
          </button>
        </div>
      </form>

      {/* Applied Status Quick Toggles for Selected Active Character */}
      {activeCharacter && (
        <div className="bg-black border border-orange-500/10 p-4 rounded-none">
          <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest mb-3.5">
            Alternar Status Ativos em: <span className="text-white normal-case font-mono">{activeCharacter.nome}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {statuses.length === 0 ? (
              <span className="text-xs text-white/30 italic">Nenhum status no sistema. Crie um acima primeiro.</span>
            ) : (
              statuses.map(st => {
                const isActive = activeCharacter.status_ativos?.includes(st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() => handleToggleOnCharacter(st.id, activeCharacter)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-none text-xs transition duration-150 border font-bold ${
                      isActive
                        ? 'bg-[#0f0b05] border-orange-500/50 text-orange-500'
                        : 'bg-black border-white/10 hover:border-white/20 text-white/40 hover:text-white/80'
                    }`}
                  >
                    <img src={st.imageUrl} alt={st.nome} className="w-5 h-5 object-contain rounded-none border border-white/5 p-0.5" />
                    <span>{st.nome}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Grid of All Status Registries with images */}
      <div className="space-y-2.5">
        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
          Banco de Status no Sistema ({statuses.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {statuses.map(st => (
            <div key={st.id} className="bg-black border border-white/10 p-3 rounded-none flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-none bg-[#050505] border border-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={st.imageUrl} alt={st.nome} className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white uppercase tracking-wider">{st.nome}</p>
                  <p className="text-[9px] text-orange-400 font-mono tracking-tight">{st.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition duration-150">
                <button
                  onClick={() => {
                    setEditingId(st.id);
                    setNome(st.nome);
                    setImageUrl(st.imageUrl);
                  }}
                  className="p-1.5 hover:text-white text-white/40 rounded-none hover:bg-white/5 border border-transparent hover:border-white/10 transition"
                  title="Editar"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteStatus(st.id, st.nome)}
                  className="p-1.5 hover:text-red-400 text-white/40 rounded-none hover:bg-white/5 border border-transparent hover:border-white/10 transition"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {statuses.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-white/30 uppercase tracking-widest font-black border border-dashed border-white/10">
              Nenhum status personalizado registrado pelo mestre até agora.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
