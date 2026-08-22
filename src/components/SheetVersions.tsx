import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, CharVersion } from '../types';
import { Sparkles, Plus, Trash2, Check, ArrowRight, Edit } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errors';

interface SheetVersionsProps {
  character: Character;
  isGM: boolean;
  isOwner: boolean;
}

export function SheetVersions({ character, isGM, isOwner }: SheetVersionsProps) {
  const [versions, setVersions] = useState<CharVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [versaoNome, setVersaoNome] = useState('');
  const [vNivel, setVNivel] = useState(character.nivel);
  const [vHpMax, setVHpMax] = useState(character.hp_max);
  const [vEtherMax, setVEtherMax] = useState(character.ether_max);
  const [vDestinoMax, setVDestinoMax] = useState(character.destino_max);
  
  const [vFisico, setVFisico] = useState(character.fisico);
  const [vDestreza, setVDestreza] = useState(character.destreza);
  const [vCognicao, setVCognicao] = useState(character.cognicao);
  const [vCarisma, setVCarisma] = useState(character.carisma);
  const [vPrimordio, setVPrimordio] = useState(character.primordio);

  const [vImgSaudavel, setVImgSaudavel] = useState(character.img_saudavel || '');
  const [vImgFerido, setVImgFerido] = useState(character.img_ferido || '');
  const [vImgMuitoFerido, setVImgMuitoFerido] = useState(character.img_muito_ferido || '');

  const [vHtmlAtaques, setVHtmlAtaques] = useState(character.html_ataques || '');
  const [vHtmlDons, setVHtmlDons] = useState(character.html_dons || '');
  const [vHtmlEquipamentos, setVHtmlEquipamentos] = useState(character.html_equipamentos || '');
  const [vHtmlDefesa, setVHtmlDefesa] = useState(character.html_defesa || '');

  // Load versions
  useEffect(() => {
    if (!character?.id) return;
    const path = `characters/${character.id}/versions`;
    const unsub = onSnapshot(collection(db, 'characters', character.id, 'versions'), (snap) => {
      const items: CharVersion[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...d.data() } as CharVersion);
      });
      setVersions(items);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsub;
  }, [character.id]);

  const handleActivateVersion = async (versionId: string | null) => {
    const path = `characters/${character.id}`;
    try {
      await updateDoc(doc(db, 'characters', character.id), {
        versao_ativa_id: versionId || 'base'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versaoNome.trim()) return;

    const id = editingId || `v_${Date.now()}`;
    const path = `characters/${character.id}/versions/${id}`;

    const newVersion: CharVersion = {
      id,
      versao_nome: versaoNome.trim(),
      nivel: Number(vNivel),
      hp_max: Number(vHpMax),
      ether_max: Number(vEtherMax),
      destino_max: Number(vDestinoMax),
      fisico: Number(vFisico),
      destreza: Number(vDestreza),
      cognicao: Number(vCognicao),
      carisma: Number(vCarisma),
      primordio: Number(vPrimordio),
      img_saudavel: vImgSaudavel.trim() || undefined,
      img_ferido: vImgFerido.trim() || undefined,
      img_muito_ferido: vImgMuitoFerido.trim() || undefined,
      html_ataques: vHtmlAtaques.trim() || undefined,
      html_dons: vHtmlDons.trim() || undefined,
      html_equipamentos: vHtmlEquipamentos.trim() || undefined,
      html_defesa: vHtmlDefesa.trim() || undefined,
    };

    try {
      await setDoc(doc(db, 'characters', character.id, 'versions', id), newVersion);
      
      // Reset form
      setShowForm(false);
      setEditingId(null);
      setVersaoNome('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleEditSetup = (ver: CharVersion) => {
    setEditingId(ver.id);
    setVersaoNome(ver.versao_nome);
    setVNivel(ver.nivel);
    setVHpMax(ver.hp_max);
    setVEtherMax(ver.ether_max);
    setVDestinoMax(ver.destino_max);
    setVFisico(ver.fisico);
    setVDestreza(ver.destreza);
    setVCognicao(ver.cognicao);
    setVCarisma(ver.carisma);
    setVPrimordio(ver.primordio);
    setVImgSaudavel(ver.img_saudavel || '');
    setVImgFerido(ver.img_ferido || '');
    setVImgMuitoFerido(ver.img_muito_ferido || '');
    setVHtmlAtaques(ver.html_ataques || '');
    setVHtmlDons(ver.html_dons || '');
    setVHtmlEquipamentos(ver.html_equipamentos || '');
    setVHtmlDefesa(ver.html_defesa || '');
    setShowForm(true);
  };

  const handleDeleteVersion = async (verId: string, verName: string) => {
    if (!confirm(`Excluir permanentemente o estado de versão "${verName}"?`)) return;
    const path = `characters/${character.id}/versions/${verId}`;
    try {
      await deleteDoc(doc(db, 'characters', character.id, 'versions', verId));
      if (character.versao_ativa_id === verId) {
        await handleActivateVersion(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const canEdit = isGM || isOwner;

  return (
    <div className="space-y-6">
      {/* Current transformation status widget */}
      <div className="bg-[#080808] border border-white/10 p-5 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-none bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest block">Forma Ativa Atual</span>
            <span className="text-sm font-black text-white uppercase tracking-wider font-sans italic mt-0.5 block">
              {character.versao_ativa_id && character.versao_ativa_id !== 'base'
                ? versions.find(v => v.id === character.versao_ativa_id)?.versao_nome || 'Forma Alternativa'
                : 'Forma Base (Padrão)'
              }
            </span>
          </div>
        </div>

        {character.versao_ativa_id && character.versao_ativa_id !== 'base' && (
          <button
            onClick={() => handleActivateVersion(null)}
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-black text-xs py-2.5 px-4 rounded-none border border-white/10 uppercase tracking-widest transition"
          >
            Reverter para Forma Base
          </button>
        )}
      </div>

      {/* Adding or editing versions */}
      {canEdit && (
        <div className="pt-1">
          {!showForm ? (
            <button
              onClick={() => {
                setEditingId(null);
                setVersaoNome('');
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs py-3 px-5 rounded-none font-black uppercase tracking-widest transition shadow-lg shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Criar Nova Versão / Forma de Transformação
            </button>
          ) : (
            <form onSubmit={handleSaveVersion} className="bg-[#080808] border border-white/10 p-5 rounded-none space-y-5">
              <h4 className="text-xs font-black text-orange-500 uppercase tracking-widest border-b border-white/10 pb-2.5 italic">
                {editingId ? 'Editar Dados da Versão' : 'Modelar Novo Estado / Forma'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Nome da Sobrecarga / Transformação</label>
                  <input
                    type="text"
                    value={versaoNome}
                    onChange={(e) => setVersaoNome(e.target.value)}
                    placeholder="Ex: Modo Titan, Despertar de Éter, Corrupção"
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Nível Substitutivo</label>
                  <input
                    type="number"
                    value={vNivel}
                    onChange={(e) => setVNivel(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-mono"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">HP Máximo na Forma</label>
                  <input
                    type="number"
                    value={vHpMax}
                    onChange={(e) => setVHpMax(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-mono"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Éter Máximo na Forma</label>
                  <input
                    type="number"
                    value={vEtherMax}
                    onChange={(e) => setVEtherMax(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-mono"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Destino Máximo na Forma</label>
                  <input
                    type="number"
                    value={vDestinoMax}
                    onChange={(e) => setVDestinoMax(Number(e.target.value))}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-3.5 py-2.5 text-white text-xs focus:border-orange-500 focus:outline-none font-mono"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Attributes block */}
              <div>
                <span className="block text-[10px] text-orange-500 uppercase font-black tracking-widest mb-2.5 italic">Atributos Substitutos</span>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">FIS</span>
                    <input type="number" value={vFisico} onChange={e => setVFisico(Number(e.target.value))} className="w-full text-center bg-transparent focus:outline-none font-black text-white font-mono text-sm" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">DES</span>
                    <input type="number" value={vDestreza} onChange={e => setVDestreza(Number(e.target.value))} className="w-full text-center bg-transparent focus:outline-none font-black text-white font-mono text-sm" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">COG</span>
                    <input type="number" value={vCognicao} onChange={e => setVCognicao(Number(e.target.value))} className="w-full text-center bg-transparent focus:outline-none font-black text-white font-mono text-sm" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">CAR</span>
                    <input type="number" value={vCarisma} onChange={e => setVCarisma(Number(e.target.value))} className="w-full text-center bg-transparent focus:outline-none font-black text-white font-mono text-sm" />
                  </div>
                  <div className="bg-[#030303] p-2 border border-white/5 rounded-none">
                    <span className="text-[9px] text-white/30 block uppercase font-bold tracking-widest mb-1">PRI</span>
                    <input type="number" value={vPrimordio} onChange={e => setVPrimordio(Number(e.target.value))} className="w-full text-center bg-transparent focus:outline-none font-black text-orange-500 font-mono text-sm" />
                  </div>
                </div>
              </div>

              {/* Alternate images */}
              <div className="space-y-2">
                <span className="block text-[10px] text-orange-500 uppercase font-black tracking-widest italic">Imagens da Forma (Estilizada para Transformações)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1.5 uppercase font-bold">Saudável</label>
                    <input type="url" value={vImgSaudavel} onChange={e => setVImgSaudavel(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-2.5 py-1.5 text-white text-[11px] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1.5 uppercase font-bold">Ferido (&lt;50% HP)</label>
                    <input type="url" value={vImgFerido} onChange={e => setVImgFerido(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-2.5 py-1.5 text-white text-[11px] font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1.5 uppercase font-bold">Muito Ferido (&lt;25% HP)</label>
                    <input type="url" value={vImgMuitoFerido} onChange={e => setVImgMuitoFerido(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded-none px-2.5 py-1.5 text-white text-[11px] font-mono" />
                  </div>
                </div>
              </div>

              {/* Alternate Rich Text blocks */}
              <div className="space-y-3">
                <span className="block text-[10px] text-orange-500 uppercase font-black tracking-widest italic">Planilhas de Ataques e Dons da Forma (Texto/Tags HTML)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1 uppercase font-bold">Habilidades & Ataques Diferenciados</label>
                    <textarea value={vHtmlAtaques} onChange={e => setVHtmlAtaques(e.target.value)} placeholder="Técnicas especiais liberadas..." className="w-full h-24 bg-[#0a0a0a] border border-white/10 rounded-none p-3 text-[11px] text-white focus:outline-none focus:border-orange-500 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/40 mb-1 uppercase font-bold">Dons & Poderes Ativos na Transformação</label>
                    <textarea value={vHtmlDons} onChange={e => setVHtmlDons(e.target.value)} placeholder="Dons exclusivos modificados..." className="w-full h-24 bg-[#0a0a0a] border border-white/10 rounded-none p-3 text-[11px] text-white focus:outline-none focus:border-orange-500 font-mono" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-none border border-white/10 text-xs font-black uppercase tracking-widest transition"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-none text-xs font-black uppercase tracking-widest transition shadow-lg"
                >
                  Salvar Mudanças
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Version List */}
      <div className="space-y-3">
        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Versões de Transformação Cadastradas ({versions.length})</p>
        <div className="space-y-3">
          {versions.map(v => {
            const isActive = character.versao_ativa_id === v.id;
            return (
              <div
                key={v.id}
                className={`p-4 rounded-none border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isActive
                    ? 'bg-[#0f0b05] border-orange-500/50 shadow'
                    : 'bg-[#080808] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-black text-sm text-white uppercase tracking-wider italic">{v.versao_nome}</span>
                    <span className="text-[9px] bg-white/10 text-white border border-white/10 py-0.5 px-2 rounded-none font-mono font-black uppercase tracking-wider">Nvl {v.nivel}</span>
                  </div>
                  <div className="text-[10px] text-white/50 mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                    <span>HP Max: <strong className="text-orange-500 font-bold">{v.hp_max}</strong></span>
                    <span>Éter Max: <strong className="text-orange-500 font-bold">{v.ether_max}</strong></span>
                    <span>Destino Max: <strong className="text-orange-500 font-bold">{v.destino_max}</strong></span>
                    <span>Atributos (F/D/C/C/P): <strong className="text-white font-bold">{v.fisico}/{v.destreza}/{v.cognicao}/{v.carisma}/{v.primordio}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {!isActive ? (
                    <button
                      onClick={() => handleActivateVersion(v.id)}
                      className="text-[10px] font-black uppercase tracking-widest bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-none transition flex items-center gap-1.5 shrink-0"
                    >
                      <span>Ativar</span>
                      <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
                    </button>
                  ) : (
                    <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-none font-black uppercase tracking-widest shrink-0 flex items-center gap-1.5 shadow-sm">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      Ativo
                    </span>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleEditSetup(v)}
                        className="p-2 hover:bg-white/5 text-white/50 hover:text-white rounded-none border border-transparent hover:border-white/10 transition"
                        title="Editar Versão"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVersion(v.id, v.versao_nome)}
                        className="p-2 hover:bg-white/5 text-white/50 hover:text-red-400 rounded-none border border-transparent hover:border-white/10 transition"
                        title="Deletar Versão"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && versions.length === 0 && (
            <div className="text-center py-10 bg-black/40 border border-dashed border-white/10 text-xs text-white/30 uppercase tracking-widest font-bold">
              Nenhum outro estado ou variante de transformação cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
