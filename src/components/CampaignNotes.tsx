import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { CampaignNote, Character } from '../types';
import { BookOpen, Plus, Trash2, ShieldAlert, Users, Lock, Eye, Edit3, X, Save } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { User } from 'firebase/auth';

interface CampaignNotesProps {
  isGM: boolean;
  currentUser: User;
  characters: Character[];
}

export function CampaignNotes({ isGM, currentUser, characters }: CampaignNotesProps) {
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteTypeFilter, setNoteTypeFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE' | 'GM_ONLY'>('ALL');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<CampaignNote['tipo']>('PUBLIC');

  useEffect(() => {
    const notesPath = 'campaign_notes';
    const q = query(collection(db, notesPath), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      const items: CampaignNote[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...d.data() } as CampaignNote);
      });
      setNotes(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, notesPath);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;

    const noteId = editingNoteId || `note_${Date.now()}`;
    const notePath = `campaign_notes/${noteId}`;

    const noteData = {
      id: noteId,
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      autor_uid: currentUser.uid,
      autor_email: currentUser.email || 'desconhecido@telumak.com',
      tipo,
      createdAt: editingNoteId ? notes.find(n => n.id === editingNoteId)?.createdAt : new Date()
    };

    try {
      await setDoc(doc(db, 'campaign_notes', noteId), noteData);
      setTitulo('');
      setConteudo('');
      setTipo('PUBLIC');
      setEditingNoteId(null);
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, notePath);
    }
  };

  const handleEditNote = (note: CampaignNote) => {
    setEditingNoteId(note.id);
    setTitulo(note.titulo);
    setConteudo(note.conteudo);
    setTipo(note.tipo);
    setShowForm(true);
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Excluir esta anotação permanentemente?')) return;
    const notePath = `campaign_notes/${id}`;
    try {
      await deleteDoc(doc(db, 'campaign_notes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, notePath);
    }
  };

  // Filter notes based on Firestore security rules and client view filters
  const visibleNotes = notes.filter(n => {
    // 1. Decidir se o usuário tem permissão de leitura sobre esta nota
    const canRead = n.tipo === 'PUBLIC' || isGM || n.autor_uid === currentUser.uid;
    if (!canRead) return false;

    // 2. Aplicar o filtro visual selecionado pela aba
    if (noteTypeFilter === 'ALL') return true;
    return n.tipo === noteTypeFilter;
  });

  return (
    <div className="bg-[#080808] border border-white/10 p-5 rounded-none shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-orange-500 stroke-[2.5]" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest italic">
            Bloco de Notas da Campanha
          </h3>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingNoteId(null);
              setTitulo('');
              setConteudo('');
            }
          }}
          className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white border border-transparent font-black text-[10px] uppercase tracking-widest transition flex items-center gap-1"
        >
          {showForm ? <X className="h-3 w-3 stroke-[3]" /> : <Plus className="h-3 w-3 stroke-[3]" />}
          {showForm ? 'Fechar' : 'Nova Anotação'}
        </button>
      </div>

      {/* Editor Form */}
      {showForm && (
        <form onSubmit={handleSaveNote} className="space-y-3 bg-black border border-orange-500/20 p-4 rounded-none">
          <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest">
            {editingNoteId ? 'Editar Anotação' : 'Criar Nova Anotação'}
          </p>
          
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Título do Registro"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-none px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none placeholder-white/20"
              required
            />

            <textarea
              placeholder="Escreva aqui suas memórias, lore, pistas de mistérios ou anotações tácticas..."
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              rows={4}
              className="w-full bg-[#0d0d0d] border border-white/10 rounded-none px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none placeholder-white/20 font-sans leading-relaxed"
              required
            />

            <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1">
                {/* Tipo de Nota Selector */}
                <button
                  type="button"
                  onClick={() => setTipo('PUBLIC')}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                    tipo === 'PUBLIC' ? 'bg-[#151205] text-orange-400 border border-orange-500/30' : 'text-white/40 border border-transparent hover:text-white/70'
                  }`}
                  title="Visível para todos os jogadores"
                >
                  <Users className="h-2.5 w-2.5" />
                  Público
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('PRIVATE')}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                    tipo === 'PRIVATE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'text-white/40 border border-transparent hover:text-white/70'
                  }`}
                  title="Visível apenas para você e para o GM"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Privado
                </button>

                {isGM && (
                  <button
                    type="button"
                    onClick={() => setTipo('GM_ONLY')}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                      tipo === 'GM_ONLY' ? 'bg-rose-950/20 text-rose-400 border border-rose-500/30' : 'text-white/40 border border-transparent hover:text-white/70'
                    }`}
                    title="Visível apenas para o GM (Segredo de Mestre)"
                  >
                    <ShieldAlert className="h-2.5 w-2.5" />
                    Mestre GM
                  </button>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNoteId(null);
                    setTitulo('');
                    setConteudo('');
                  }}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 text-[9px] font-black uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                >
                  <Save className="h-3 w-3 stroke-[2.5]" />
                  {editingNoteId ? 'Salvar Edição' : 'Publicar Nota'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-white/5 pb-1 select-none flex-wrap gap-1">
        <button
          onClick={() => setNoteTypeFilter('ALL')}
          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-b-2 transition ${
            noteTypeFilter === 'ALL' ? 'border-orange-500 text-orange-500 font-extrabold' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setNoteTypeFilter('PUBLIC')}
          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-b-2 transition ${
            noteTypeFilter === 'PUBLIC' ? 'border-orange-500 text-orange-500 font-extrabold' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Públicas
        </button>
        <button
          onClick={() => setNoteTypeFilter('PRIVATE')}
          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-b-2 transition ${
            noteTypeFilter === 'PRIVATE' ? 'border-orange-500 text-orange-500 font-extrabold' : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          Privadas
        </button>
        {isGM && (
          <button
            onClick={() => setNoteTypeFilter('GM_ONLY')}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border-b-2 transition ${
              noteTypeFilter === 'GM_ONLY' ? 'border-rose-500 text-rose-500 font-extrabold' : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Segredos do GM 🛡️
          </button>
        )}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="text-center py-6 text-xs text-white/30 uppercase tracking-widest font-black">
          Buscando manuscritos...
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="text-center py-8 text-xs text-white/20 border border-dashed border-white/5 italic">
          Nenhuma anotação nesta seção ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto custom-scroll pr-1.5">
          {visibleNotes.map(note => {
            const isAuthor = note.autor_uid === currentUser.uid;

            // Resolve badge/color metadata
            let badgeBg = 'bg-white/5 border-white/10 text-white/50';
            let badgeText = 'Pública';
            let iconElement = <Users className="h-2.5 w-2.5" />;

            if (note.tipo === 'PRIVATE') {
              badgeBg = 'bg-[#151205] border-orange-500/10 text-orange-400';
              badgeText = 'Privada (Eu & GM)';
              iconElement = <Lock className="h-2.5 w-2.5" />;
            } else if (note.tipo === 'GM_ONLY') {
              badgeBg = 'bg-rose-950/20 border-rose-500/20 text-rose-400';
              badgeText = 'Apenas GM';
              iconElement = <ShieldAlert className="h-2.5 w-2.5" />;
            }

            return (
              <div 
                key={note.id} 
                className="bg-[#050505] border border-white/10 p-4 rounded-none hover:border-white/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className={`px-2 py-0.5 rounded-none border text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${badgeBg}`}>
                      {iconElement}
                      {badgeText}
                    </span>
                    <span className="text-[8px] text-white/20 font-mono">
                      Por: {note.autor_email.split('@')[0]}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 px-1">{note.titulo}</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed font-sans whitespace-pre-wrap break-words px-1 bg-black/25 p-2 border border-white/5 font-normal">
                    {note.conteudo}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-white/5 min-h-[24px]">
                  {(isAuthor || isGM) && (
                    <>
                      <button
                        onClick={() => handleEditNote(note)}
                        className="px-2 py-1 hover:bg-white/5 text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest transition flex items-center gap-1 border border-transparent hover:border-white/10"
                        title="Editar anotação"
                      >
                        <Edit3 className="h-3 w-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="px-2 py-1 hover:bg-[#1a0a0a] text-[9px] font-black text-[#ffffff]/30 hover:text-red-400 uppercase tracking-widest transition flex items-center gap-1 border border-transparent hover:border-white/10"
                        title="Remover anotação"
                      >
                        <Trash2 className="h-3 w-3" />
                         Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
