import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, CustomStatusType, CharVersion } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { SheetVersions } from './SheetVersions';
import { Heart, Shield, Award, Edit, Printer, Plus, Minus, UserCheck, Flame } from 'lucide-react';

interface CharacterSheetProps {
  character: Character;
  isGM: boolean;
  isOwner: boolean;
  statuses: CustomStatusType[];
  versions: CharVersion[];
}

export function CharacterSheet({ character, isGM, isOwner, statuses, versions }: CharacterSheetProps) {
  const [activeTab, setActiveTab] = useState<'ataques' | 'dons' | 'equip' | 'defesa' | 'versoes'>('ataques');
  const [isEditingTexts, setIsEditingTexts] = useState(false);

  // Text inputs form editing
  const [eAtaques, setEAtaques] = useState(character.html_ataques || '');
  const [eDons, setEDons] = useState(character.html_dons || '');
  const [eEquipamentos, setEEquipamentos] = useState(character.html_equipamentos || '');
  const [eDefesa, setEDefesa] = useState(character.html_defesa || '');

  // If a transformation is active, override specific stats with version stats
  const activeVersion = character.versao_ativa_id && character.versao_ativa_id !== 'base'
    ? versions.find(v => v.id === character.versao_ativa_id)
    : null;

  // Resolved Stats
  const rNivel = activeVersion ? activeVersion.nivel : character.nivel;
  const rHpMax = activeVersion ? activeVersion.hp_max : character.hp_max;
  const rEtherMax = activeVersion ? activeVersion.ether_max : character.ether_max;
  const rDestinoMax = activeVersion ? activeVersion.destino_max : character.destino_max;

  const rFis = activeVersion ? activeVersion.fisico : character.fisico;
  const rDes = activeVersion ? activeVersion.destreza : character.destreza;
  const rCog = activeVersion ? activeVersion.cognicao : character.cognicao;
  const rCar = activeVersion ? activeVersion.carisma : character.carisma;
  const rPri = activeVersion ? activeVersion.primordio : character.primordio;

  const rImgSaudavel = activeVersion?.img_saudavel || character.img_saudavel;
  const rImgFerido = activeVersion?.img_ferido || character.img_ferido || rImgSaudavel;
  const rImgMuitoFerido = activeVersion?.img_muito_ferido || character.img_muito_ferido || rImgFerido || rImgSaudavel;

  const rHtmlAtaques = activeVersion?.html_ataques || character.html_ataques;
  const rHtmlDons = activeVersion?.html_dons || character.html_dons;
  const rHtmlEquip = activeVersion?.html_equipamentos || character.html_equipamentos;
  const rHtmlDefesa = activeVersion?.html_defesa || character.html_defesa;

  // HP dependent dynamic artwork
  const hpPct = (character.hp_atual / rHpMax) * 100;
  let activeAvatarUrl = rImgSaudavel || 'https://via.placeholder.com/300x400?text=Sem+Avatar';
  if (hpPct < 25) {
    activeAvatarUrl = rImgMuitoFerido || rImgFerido || activeAvatarUrl;
  } else if (hpPct < 50) {
    activeAvatarUrl = rImgFerido || activeAvatarUrl;
  }

  const handleUpdateVital = async (field: 'hp_atual' | 'ether_atual' | 'destino_atual', delta: number) => {
    const docPath = `characters/${character.id}`;
    let max = rHpMax;
    if (field === 'ether_atual') max = rEtherMax;
    if (field === 'destino_atual') max = rDestinoMax;

    let newVal = (character[field] || 0) + delta;
    if (newVal < 0) newVal = 0;
    if (newVal > max) newVal = max;

    try {
      await updateDoc(doc(db, 'characters', character.id), {
        [field]: newVal
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const handleSaveTextBlocks = async () => {
    const docPath = `characters/${character.id}`;
    try {
      await updateDoc(doc(db, 'characters', character.id), {
        html_ataques: eAtaques,
        html_dons: eDons,
        html_equipamentos: eEquipamentos,
        html_defesa: eDefesa,
      });
      setIsEditingTexts(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const startEditTexts = () => {
    setEAtaques(character.html_ataques || '');
    setEDons(character.html_dons || '');
    setEEquipamentos(character.html_equipamentos || '');
    setEDefesa(character.html_defesa || '');
    setIsEditingTexts(true);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const activeStatusIcons = (character.status_ativos || []).map(id => statuses.find(s => s.id === id)).filter(Boolean) as CustomStatusType[];

  return (
    <div id="telumak-print-sheet" className="bg-[#0a0a0a] border border-white/10 rounded-none shadow-2xl overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none">
      
      {/* SCOPED PRINT INJECT CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; color: black !important; }
          #telumak-print-sheet { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-full-sheet-stack { display: block !important; }
          .print-block { page-break-inside: avoid; border: 1px solid #ddd !important; padding: 15px !important; margin-bottom: 20px !important; border-radius: 0px !important; color: black !important; background: white !important; }
          .print-heading { color: #050505 !important; border-bottom: 2px solid #050505 !important; margin-bottom: 10px !important; font-size: 1.1rem !important; font-weight: 900 !important; font-family: 'Cinzel', serif !important; text-transform: uppercase !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; margin-bottom: 15px !important; }
          .print-attribute { border: 1px solid #ccc !important; padding: 8px !important; text-align: center !important; }
          .print-label { font-size: 8px !important; color: #555 !important; font-weight: bold !important; text-transform: uppercase !important; }
          .print-value { font-size: 1.3rem !important; font-weight: bold !important; color: black !important; }
          .print-bar { background: #eee !important; border: 1px solid #ccc !important; height: 12px !important; overflow: hidden !important; position: relative !important; }
          .print-bar-fill { background: #333 !important; height: 100% !important; }
          .print-header { border-bottom: 3px double #111 !important; padding-bottom: 10px !important; margin-bottom: 15px !important; }
          .print-avatar-container { float: right !important; width: 120px !important; height: 160px !important; border: 1px solid #ccc !important; margin-left: 15px !important; overflow: hidden !important; }
          .print-avatar-container img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
          .print-html { color: #222 !important; font-size: 13px !important; line-height: 1.5 !important; }
          .print-html strong { color: #000 !important; font-weight: bold !important; }
          .print-html b { color: #b91c1c !important; font-weight: bold !important; }
        }
      `}} />

      {/* STATIC PRINT HEADER - VISIBLE ONLY ON PRINTERS */}
      <div className="hidden print-full-sheet-stack print-header">
        <div className="print-avatar-container">
          <img src={activeAvatarUrl} alt={character.nome} />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-sans uppercase text-black">{character.nome}</h1>
          <p className="text-xs text-slate-700 font-mono uppercase tracking-widest font-bold">
            Clã: {character.cla || 'Não Registrado'} • Ocupação: {character.ocupacao || 'Desconhecida'} • Nível: {rNivel}
          </p>
          <div className="flex gap-4 mt-2 font-mono text-xs uppercase font-bold">
            <span>Vidas: <strong>{character.hp_atual}/{rHpMax}</strong></span>
            <span>Éter: <strong>{character.ether_atual}/{rEtherMax}</strong></span>
            <span>Destino: <strong>{character.destino_atual}/{rDestinoMax}</strong></span>
          </div>
        </div>
      </div>

      {/* STATIC PRINT ATTRIBUTES BLOCK - VISIBLE ONLY ON PRINTERS */}
      <div className="hidden print-full-sheet-stack print-grid pt-4">
        <div className="print-attribute">
          <p className="print-label">Físico</p>
          <p className="print-value">{rFis}</p>
          <span className="text-[9px] text-slate-500">Mod Combate: +{character.ferramenta_fisico}</span>
        </div>
        <div className="print-attribute">
          <p className="print-label">Destreza</p>
          <p className="print-value">{rDes}</p>
          <span className="text-[9px] text-slate-500">Mod Combate: +{character.ferramenta_destreza}</span>
        </div>
        <div className="print-attribute">
          <p className="print-label">Cognição</p>
          <p className="print-value">{rCog}</p>
          <span className="text-[9px] text-slate-500">Mod Combate: +{character.ferramenta_cognicao}</span>
        </div>
        <div className="print-attribute">
          <p className="print-label">Carisma</p>
          <p className="print-value">{rCar}</p>
          <span className="text-[9px] text-slate-500">Mod Combate: +{character.ferramenta_carisma}</span>
        </div>
      </div>

      {/* SCREEN UI CONTAINER */}
      <div className="no-print">
        {/* Banner Details */}
        <div className="bg-black border-b border-white/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-[#111] overflow-hidden border-2 border-orange-500/50 shadow-2xl">
                <img src={activeAvatarUrl} alt={character.nome} className="w-full h-full object-cover" />
              </div>
              {activeVersion && (
                <div className="absolute -top-1 -right-1 bg-orange-500 p-0.5" title="Transformado!">
                  <Flame className="h-3 w-3 text-white animate-pulse" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">{character.nome}</h2>
                <div className="flex gap-1.5 ml-1">
                  {activeStatusIcons.map(st => (
                    <img key={st.id} src={st.imageUrl} alt={st.nome} className="w-4 h-4 object-contain" title={st.nome} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-orange-500 capitalize font-mono font-bold tracking-widest">
                {character.cla || 'Sem Clã'} • {character.ocupacao || 'Nenhum Ofício'} • Nível {rNivel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white font-black text-xs py-2 px-4 border border-white/10 transition uppercase tracking-widest"
              title="Salvar como PDF / Imprimir"
            >
              <Printer className="h-4 w-4 text-orange-500" />
              PDF
            </button>
            {(isGM || isOwner) && !isEditingTexts && (
              <button
                onClick={startEditTexts}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2 px-5 transition uppercase tracking-widest shadow-lg"
              >
                <Edit className="h-4 w-4" />
                Editar Ficha
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Vitals Health Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-black/60 border-b border-white/10">
          <div className="bg-[#050505] p-4 border border-white/10 shadow-lg">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-rose-500 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                Vida (HP)
              </span>
              <span className="text-white font-mono font-bold text-[11px]">{character.hp_atual}/{rHpMax}</span>
            </div>
            <div className="h-3 bg-black/80 border border-white/5 overflow-hidden relative mb-3">
              <div className="h-full bg-rose-600 transition-all duration-300" style={{ width: `${(character.hp_atual / rHpMax) * 100}%` }}></div>
            </div>
            <div className="flex justify-end gap-1.5">
              <button onClick={() => handleUpdateVital('hp_atual', -1)} className="p-1 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs transition"><Minus className="h-3 w-3" /></button>
              <button onClick={() => handleUpdateVital('hp_atual', 1)} className="p-1 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs transition"><Plus className="h-3 w-3" /></button>
            </div>
          </div>

          <div className="bg-[#050505] p-4 border border-white/10 shadow-lg">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-indigo-405 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-indigo-400">
                <Award className="h-3.5 w-3.5 text-indigo-400" />
                Éter (Magia)
              </span>
              <span className="text-white font-mono font-bold text-[11px]">{character.ether_atual}/{rEtherMax}</span>
            </div>
            <div className="h-3 bg-black/80 border border-white/5 overflow-hidden relative mb-3">
              <div className="h-full bg-indigo-650 transition-all duration-300" style={{ width: `${(character.ether_atual / rEtherMax) * 100}%` }}></div>
            </div>
            <div className="flex justify-end gap-1.5">
              <button onClick={() => handleUpdateVital('ether_atual', -1)} className="p-1 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs transition"><Minus className="h-3 w-3" /></button>
              <button onClick={() => handleUpdateVital('ether_atual', 1)} className="p-1 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs transition"><Plus className="h-3 w-3" /></button>
            </div>
          </div>

          <div className="bg-[#050505] p-4 border border-white/10 shadow-lg">
            <div className="flex justify-between items-center mb-1.5 text-xs">
              <span className="text-orange-500 font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-orange-500" />
                Destino (Sorte)
              </span>
              <span className="text-white font-mono font-bold text-[11px]">{character.destino_atual}/{rDestinoMax}</span>
            </div>
            <div className="h-3 bg-black/80 border border-white/5 overflow-hidden relative mb-3">
              <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${(character.destino_atual / rDestinoMax) * 100}%` }}></div>
            </div>
            <div className="flex justify-end gap-1.5">
              <button onClick={() => handleUpdateVital('destino_atual', -1)} className="p-1 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs transition"><Minus className="h-3 w-3" /></button>
              <button onClick={() => handleUpdateVital('destino_atual', 1)} className="p-1 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-xs transition"><Plus className="h-3 w-3" /></button>
            </div>
          </div>
        </div>

        {/* Dynamic Sheet Stats block */}
        <div className="p-6 border-b border-white/10">
          <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mb-3">Atributos Primários e Modificadores</p>
          <div className="grid grid-cols-5 gap-3 text-center">
            <div className="bg-[#080808] border border-white/10 p-3 rounded-none flex flex-col justify-center items-center">
              <span className="block text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1 font-sans">FIS</span>
              <span className="text-2xl font-black text-white font-mono leading-none">{rFis}</span>
              <span className="block text-[9px] text-orange-500 font-extrabold font-mono mt-2">Mod +{character.ferramenta_fisico}</span>
            </div>
            <div className="bg-[#080808] border border-white/10 p-3 rounded-none flex flex-col justify-center items-center">
              <span className="block text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1 font-sans">DES</span>
              <span className="text-2xl font-black text-white font-mono leading-none">{rDes}</span>
              <span className="block text-[9px] text-orange-500 font-extrabold font-mono mt-2">Mod +{character.ferramenta_destreza}</span>
            </div>
            <div className="bg-[#080808] border border-white/10 p-3 rounded-none flex flex-col justify-center items-center">
              <span className="block text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1 font-sans">COG</span>
              <span className="text-2xl font-black text-white font-mono leading-none">{rCog}</span>
              <span className="block text-[9px] text-orange-500 font-extrabold font-mono mt-2">Mod +{character.ferramenta_cognicao}</span>
            </div>
            <div className="bg-[#080808] border border-white/10 p-3 rounded-none flex flex-col justify-center items-center">
              <span className="block text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1 font-sans">CAR</span>
              <span className="text-2xl font-black text-white font-mono leading-none">{rCar}</span>
              <span className="block text-[9px] text-orange-500 font-extrabold font-mono mt-2">Mod +{character.ferramenta_carisma}</span>
            </div>
            <div className="bg-[#0c0c0c] border border-orange-500/20 p-3 rounded-none flex flex-col justify-center items-center">
              <span className="block text-[9px] text-orange-400 font-bold uppercase tracking-widest mb-1 font-sans">PRI</span>
              <span className="text-2xl font-black text-orange-500 font-mono leading-none">{rPri}</span>
              <span className="block text-[9px] text-orange-500/50 font-extrabold font-mono mt-2">Primórdio</span>
            </div>
            </div>
          </div>

        {/* Text Blocks Editor Overlay */}
        {isEditingTexts ? (
          <div className="p-6 space-y-5 bg-[#050505] border border-white/10">
            <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest block italic">Editor de Rich Text / Abas de Habilidades</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Abas de Ataques e Técnicas</label>
                <textarea value={eAtaques} onChange={e => setEAtaques(e.target.value)} rows={4} className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-none p-4 text-xs placeholder-white/20 focus:outline-none focus:border-orange-500 font-mono" placeholder="Insira texto descriptivo ou tags HTML..." />
              </div>
              <div>
                <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Dons & Poderes</label>
                <textarea value={eDons} onChange={e => setEDons(e.target.value)} rows={4} className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-none p-4 text-xs placeholder-white/20 focus:outline-none focus:border-orange-500 font-mono" placeholder="Técnicas espirituais..." />
              </div>
              <div>
                <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Equipamentos & Itens</label>
                <textarea value={eEquipamentos} onChange={e => setEEquipamentos(e.target.value)} rows={4} className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-none p-4 text-xs placeholder-white/20 focus:outline-none focus:border-orange-500 font-mono" placeholder="Armaduras e pertences..." />
              </div>
              <div>
                <label className="block text-[10px] text-white/50 mb-1.5 font-bold uppercase tracking-wider">Defesa & Reação</label>
                <textarea value={eDefesa} onChange={e => setEDefesa(e.target.value)} rows={4} className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-none p-4 text-xs placeholder-white/20 focus:outline-none focus:border-orange-500 font-mono" placeholder="Movimentos defensivos..." />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditingTexts(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-none border border-white/10 text-xs font-black uppercase tracking-widest"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSaveTextBlocks}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-none text-xs font-black uppercase tracking-widest shadow-lg"
              >
                Confirmar Salvamento
              </button>
            </div>
          </div>
        ) : (
          /* Normal Tab Content Selector UI */
          <div>
            {/* Sheet Tabs Bar */}
            <div className="flex border-b border-white/10 bg-black overflow-x-auto select-none rounded-none">
              {(['ataques', 'dons', 'equip', 'defesa', 'versoes'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition duration-150 border-b-2 whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-orange-500 text-orange-500 bg-white/[0.02]'
                      : 'border-transparent text-white/40 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {tab === 'ataques' ? 'Ataques & Técnicas' : tab === 'dons' ? 'Dons & Poderes' : tab === 'equip' ? 'Equipamento' : tab === 'defesa' ? 'Defesa & Reação' : 'Versões / Avatar (Transformações)'}
                </button>
              ))}
            </div>

            {/* TAB ABAS CONTAINER */}
            <div className="p-6 min-h-[160px] bg-black/30 leading-relaxed font-sans text-xs text-white/80 border-t-0 border border-white/5 space-y-2">
              {activeTab === 'ataques' && (
                <div
                  className="print-html whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: rHtmlAtaques ? rHtmlAtaques.replace(/\n/g, '<br>') : '<span class="italic text-white/30">Nenhum ataque registrado nesta forma.</span>' }}
                />
              )}
              {activeTab === 'dons' && (
                <div
                  className="print-html whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: rHtmlDons ? rHtmlDons.replace(/\n/g, '<br>') : '<span class="italic text-white/30">Nenhum poder espiritual listado.</span>' }}
                />
              )}
              {activeTab === 'equip' && (
                <div
                  className="print-html whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: rHtmlEquip ? rHtmlEquip.replace(/\n/g, '<br>') : '<span class="italic text-white/30">A inventário desta forma está vazia.</span>' }}
                />
              )}
              {activeTab === 'defesa' && (
                <div
                  className="print-html whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: rHtmlDefesa ? rHtmlDefesa.replace(/\n/g, '<br>') : '<span class="italic text-white/30">Nenhuma reação defensiva cadastrada.</span>' }}
                />
              )}
              {activeTab === 'versoes' && (
                <SheetVersions
                  character={character}
                  isGM={isGM}
                  isOwner={isOwner}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* STATIC MULTI-TAB PRINT ALL VIEWS FOR HARD COPY EXPORTS - ONLY VISIBLE DURING WEB PRINT DIALOG */}
      <div className="hidden print-full-sheet-stack pb-10 space-y-6 pt-6">
        <div className="print-block">
          <h3 className="print-heading">Ataques & Técnicas</h3>
          <div
            className="print-html whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: rHtmlAtaques ? rHtmlAtaques.replace(/\n/g, '<br>') : '<span class="italic">Nenhum ataque cadastrado</span>' }}
          />
        </div>
        <div className="print-block">
          <h3 className="print-heading">Dons & Poderes</h3>
          <div
            className="print-html whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: rHtmlDons ? rHtmlDons.replace(/\n/g, '<br>') : '<span class="italic">Nenhum dom cadastrado</span>' }}
          />
        </div>
        <div className="print-block">
          <h3 className="print-heading">Equipamento</h3>
          <div
            className="print-html whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: rHtmlEquip ? rHtmlEquip.replace(/\n/g, '<br>') : '<span class="italic">Inventário vazio</span>' }}
          />
        </div>
        <div className="print-block">
          <h3 className="print-heading">Defesa & Reação</h3>
          <div
            className="print-html whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: rHtmlDefesa ? rHtmlDefesa.replace(/\n/g, '<br>') : '<span class="italic">Nenhuma reação defensiva cadastrada</span>' }}
          />
        </div>
      </div>

    </div>
  );
}
