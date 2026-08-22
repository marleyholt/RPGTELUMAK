import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, CustomStatusType, CharVersion } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { SheetVersions } from './SheetVersions';
import { 
  Heart, Zap, Star, Shield, Crosshair, Activity, Dumbbell, 
  Printer, Edit, Plus, Minus, Flame, Sparkles, Swords, 
  BookOpen, Backpack, Eye, Check, X
} from 'lucide-react';

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

  // Markers editing (GM only)
  const [eAlcance, setEAlcance] = useState(character.alcance_max || '10 Metros');
  const [eMovimento, setEMovimento] = useState(character.movimento_max || '15 Metros por Ação');
  const [eFortitude, setEFortitude] = useState(character.fortitude_max || '150 Kg');

  // If a transformation is active, override specific stats with version stats
  const activeVersion = character.versao_ativa_id && character.versao_ativa_id !== 'base'
    ? versions.find(v => v.id === character.versao_ativa_id)
    : null;

  // Resolved Stats
  const rNivel = activeVersion ? activeVersion.nivel : character.nivel;
  const rHpMax = activeVersion ? activeVersion.hp_max : character.hp_max;
  const rEtherMax = activeVersion ? activeVersion.ether_max : character.ether_max;
  const rDestinoMax = activeVersion ? activeVersion.destino_max : character.destino_max;

  const rAlcanceMax = activeVersion?.alcance_max || character.alcance_max || '10 Metros';
  const rMovimentoMax = activeVersion?.movimento_max || character.movimento_max || '15 Metros por Ação';
  const rFortitudeMax = activeVersion?.fortitude_max || character.fortitude_max || '150 Kg';

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
  const hpPct = Math.min(100, Math.max(0, (character.hp_atual / (rHpMax || 1)) * 100));
  const etherPct = Math.min(100, Math.max(0, (character.ether_atual / (rEtherMax || 1)) * 100));
  const destinoPct = Math.min(100, Math.max(0, (character.destino_atual / (rDestinoMax || 1)) * 100));

  let activeAvatarUrl = rImgSaudavel || 'https://via.placeholder.com/340x578?text=Sem+Avatar';
  let healthStatusLabel = 'Saudável';
  let healthStatusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

  if (hpPct < 25) {
    activeAvatarUrl = rImgMuitoFerido || rImgFerido || activeAvatarUrl;
    healthStatusLabel = 'Estado Crítico';
    healthStatusColor = 'text-rose-500 border-rose-500/40 bg-rose-950/40 animate-pulse';
  } else if (hpPct < 50) {
    activeAvatarUrl = rImgFerido || activeAvatarUrl;
    healthStatusLabel = 'Ferido';
    healthStatusColor = 'text-amber-400 border-amber-500/30 bg-amber-950/20';
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
        alcance_max: eAlcance,
        movimento_max: eMovimento,
        fortitude_max: eFortitude
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
    setEAlcance(character.alcance_max || '10 Metros');
    setEMovimento(character.movimento_max || '15 Metros por Ação');
    setEFortitude(character.fortitude_max || '150 Kg');
    setIsEditingTexts(true);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const activeStatusIcons = (character.status_ativos || []).map(id => statuses.find(s => s.id === id)).filter(Boolean) as CustomStatusType[];

  return (
    <div id="telumak-sheet-root" className="bg-[#030303] text-white select-none">
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; color: black !important; }
          #telumak-sheet-root { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .rich-content strong { color: #1e3a8a !important; }
          .rich-content b { color: #991b1b !important; }
        }
      `}} />

      {/* HEADER SECTION (Matching index (4) style) */}
      <div className="bg-black border-b border-white/10 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-[#0c0c0c] border-2 border-orange-500/60 overflow-hidden shadow-2xl">
              <img src={activeAvatarUrl} alt={character.nome} className="w-full h-full object-cover" />
            </div>
            {activeVersion && (
              <div className="absolute -top-1 -right-1 bg-orange-500 p-0.5 shadow-lg" title="Transformado!">
                <Flame className="h-3.5 w-3.5 text-white animate-pulse" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                {character.nome}
              </h1>
              <span className="bg-orange-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono">
                Nível {rNivel}
              </span>
              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${healthStatusColor}`}>
                {healthStatusLabel}
              </span>
            </div>
            <p className="text-xs text-white/60 font-mono uppercase tracking-widest mt-1">
              Clã: <span className="text-orange-400 font-bold">{character.cla || 'Sem Clã'}</span> • Ocupação: <span className="text-orange-400 font-bold">{character.ocupacao || 'Nenhum Ofício'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end no-print">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs py-2 px-4 border border-white/10 transition uppercase tracking-wider"
            title="Salvar como PDF / Imprimir"
          >
            <Printer className="h-3.5 w-3.5 text-orange-400" />
            <span>PDF</span>
          </button>

          {isGM && !isEditingTexts && (
            <button
              onClick={startEditTexts}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2 px-5 transition uppercase tracking-wider shadow-lg"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Editar Ficha</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* 1. STATUS CARDS (SAÚDE, ENERGIA, PODER) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* SAÚDE (HP) */}
          <div className="bg-black border border-white/10 hover:border-red-500/40 p-4 transition-all duration-200 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                <Heart className="h-4 w-4 fill-red-500 text-red-500 animate-pulse" />
                Saúde (Vida)
              </span>
              <span className="font-mono font-bold text-sm text-white">
                {character.hp_atual} <span className="text-white/40">/ {rHpMax}</span>
              </span>
            </div>

            {/* Health Bar Track */}
            <div className="h-3 bg-[#141414] border border-white/10 overflow-hidden relative mb-3">
              <div 
                className="h-full bg-gradient-to-r from-red-900 to-red-500 transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                style={{ width: `${hpPct}%` }}
              />
            </div>

            {/* GM Increment / Decrement controls */}
            {isGM ? (
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-[9px] text-white/40 font-mono uppercase">Ajuste de HP (GM)</span>
                <div className="flex gap-1.5">
                  <button onClick={() => handleUpdateVital('hp_atual', -5)} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-mono border border-white/10">-5</button>
                  <button onClick={() => handleUpdateVital('hp_atual', -1)} className="p-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"><Minus className="h-3 w-3" /></button>
                  <button onClick={() => handleUpdateVital('hp_atual', 1)} className="p-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"><Plus className="h-3 w-3" /></button>
                  <button onClick={() => handleUpdateVital('hp_atual', 5)} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-mono border border-white/10">+5</button>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-white/40 font-mono text-right">
                {hpPct < 25 ? '⚠️ Estado Crítico' : '✓ Estável'}
              </div>
            )}
          </div>

          {/* ENERGIA (ÉTER) */}
          <div className="bg-black border border-white/10 hover:border-blue-500/40 p-4 transition-all duration-200 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4 fill-blue-400 text-blue-400" />
                Energia (Éter)
              </span>
              <span className="font-mono font-bold text-sm text-white">
                {character.ether_atual} <span className="text-white/40">/ {rEtherMax}</span>
              </span>
            </div>

            {/* Ether Bar Track */}
            <div className="h-3 bg-[#141414] border border-white/10 overflow-hidden relative mb-3">
              <div 
                className="h-full bg-gradient-to-r from-blue-900 to-blue-500 transition-all duration-300 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                style={{ width: `${etherPct}%` }}
              />
            </div>

            {isGM ? (
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-[9px] text-white/40 font-mono uppercase">Ajuste de Éter (GM)</span>
                <div className="flex gap-1.5">
                  <button onClick={() => handleUpdateVital('ether_atual', -5)} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-mono border border-white/10">-5</button>
                  <button onClick={() => handleUpdateVital('ether_atual', -1)} className="p-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"><Minus className="h-3 w-3" /></button>
                  <button onClick={() => handleUpdateVital('ether_atual', 1)} className="p-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"><Plus className="h-3 w-3" /></button>
                  <button onClick={() => handleUpdateVital('ether_atual', 5)} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 text-[10px] font-mono border border-white/10">+5</button>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-white/40 font-mono text-right">
                {etherPct > 0 ? '✓ Canalizado' : 'Esgotado'}
              </div>
            )}
          </div>

          {/* PODER (DESTINO) */}
          <div className="bg-black border border-white/10 hover:border-yellow-500/40 p-4 transition-all duration-200 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                Poder (Destino)
              </span>
              <span className="font-mono font-bold text-sm text-white">
                {character.destino_atual} <span className="text-white/40">/ {rDestinoMax}</span>
              </span>
            </div>

            {/* Destino Bar Track */}
            <div className="h-3 bg-[#141414] border border-white/10 overflow-hidden relative mb-3">
              <div 
                className="h-full bg-gradient-to-r from-yellow-900 to-yellow-400 transition-all duration-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                style={{ width: `${destinoPct}%` }}
              />
            </div>

            {isGM ? (
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-[9px] text-white/40 font-mono uppercase">Ajuste de Destino (GM)</span>
                <div className="flex gap-1.5">
                  <button onClick={() => handleUpdateVital('destino_atual', -1)} className="p-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"><Minus className="h-3 w-3" /></button>
                  <button onClick={() => handleUpdateVital('destino_atual', 1)} className="p-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-white/40 font-mono text-right">
                Ponto de Inspiração
              </div>
            )}
          </div>

        </div>

        {/* 2. MARCADORES CARDS (ALCANCE, MOVIMENTO, FORTITUDE) - Exactly like index (4) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* ALCANCE */}
          <div className="bg-black border border-white/10 hover:border-emerald-500/40 p-4 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Crosshair className="h-4 w-4 text-emerald-400" />
                <span>Alcance</span>
              </div>
              <span className="text-[9px] font-mono bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 uppercase">
                Nível {rNivel}
              </span>
            </div>
            <p className="text-xl font-black text-emerald-400 font-mono mt-1">
              {rAlcanceMax}
            </p>
            <p className="text-[9px] text-white/40 font-mono mt-0.5">
              Raio de Ação & Projeção
            </p>
          </div>

          {/* MOVIMENTO */}
          <div className="bg-black border border-white/10 hover:border-cyan-500/40 p-4 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-wider">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Movimento</span>
              </div>
              <span className="text-[9px] font-mono bg-cyan-950/50 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 uppercase">
                Nível {rNivel}
              </span>
            </div>
            <p className="text-xl font-black text-cyan-400 font-mono mt-1">
              {rMovimentoMax}
            </p>
            <p className="text-[9px] text-white/40 font-mono mt-0.5">
              Deslocamento por Turno / Ação
            </p>
          </div>

          {/* FORTITUDE */}
          <div className="bg-black border border-white/10 hover:border-violet-500/40 p-4 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-black uppercase tracking-wider">
                <Shield className="h-4 w-4 text-violet-400" />
                <span>Fortitude</span>
              </div>
              <span className="text-[9px] font-mono bg-violet-950/50 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 uppercase">
                Nível {rNivel}
              </span>
            </div>
            <p className="text-xl font-black text-violet-400 font-mono mt-1">
              {rFortitudeMax}
            </p>
            <p className="text-[9px] text-white/40 font-mono mt-0.5">
              Capacidade de Carga & Resistência Física
            </p>
          </div>

        </div>

        {/* 3. MAIN GRID: ARTWORK (Aspect 10/17) + ATTRIBUTES & COMBAT TOOLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: CHARACTER ARTWORK (Aspect Ratio 10:17 Portrait Card) */}
          <div className="lg:col-span-1 flex flex-col items-center">
            <div className="w-full relative bg-[#070707] border-2 border-white/15 overflow-hidden shadow-2xl group" style={{ aspectRatio: '10/17' }}>
              <img
                src={activeAvatarUrl}
                alt={character.nome}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Bottom Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

              {/* Status Badge watermark */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 bg-black/80 border border-orange-500/30 px-2.5 py-1">
                    Nível {rNivel} • {character.cla || 'Sem Clã'}
                  </span>
                </div>
                {activeStatusIcons.length > 0 && (
                  <div className="flex gap-1 bg-black/80 p-1 border border-white/10">
                    {activeStatusIcons.map(st => (
                      <img key={st.id} src={st.imageUrl} alt={st.nome} title={st.nome} className="w-5 h-5 object-contain" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: ATTRIBUTES & COMBAT TOOLS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 4 Base Attributes (2x2 Grid) */}
            <div>
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-2.5 flex items-center gap-1.5">
                <span>Atributos Primários:</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                
                {/* FÍSICO */}
                <div className="bg-black border border-white/10 hover:border-orange-500/40 p-4 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-white">Físico</span>
                    <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.2 border border-orange-500/20">FIS</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-black text-white font-mono">{rFis}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/40">Modificador:</span>
                    <span className="text-orange-400 font-bold">+{character.ferramenta_fisico}</span>
                  </div>
                </div>

                {/* DESTREZA */}
                <div className="bg-black border border-white/10 hover:border-orange-500/40 p-4 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-white">Destreza</span>
                    <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.2 border border-orange-500/20">DES</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-black text-white font-mono">{rDes}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/40">Modificador:</span>
                    <span className="text-orange-400 font-bold">+{character.ferramenta_destreza}</span>
                  </div>
                </div>

                {/* COGNIÇÃO */}
                <div className="bg-black border border-white/10 hover:border-orange-500/40 p-4 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-white">Cognição</span>
                    <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.2 border border-orange-500/20">COG</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-black text-white font-mono">{rCog}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/40">Modificador:</span>
                    <span className="text-orange-400 font-bold">+{character.ferramenta_cognicao}</span>
                  </div>
                </div>

                {/* CARISMA */}
                <div className="bg-black border border-white/10 hover:border-orange-500/40 p-4 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-white">Carisma</span>
                    <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.2 border border-orange-500/20">CAR</span>
                  </div>
                  <div className="my-2">
                    <span className="text-3xl font-black text-white font-mono">{rCar}</span>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-white/40">Modificador:</span>
                    <span className="text-orange-400 font-bold">+{character.ferramenta_carisma}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* PRIMÓRDIO (Superior full span card) */}
            <div className="bg-gradient-to-r from-[#0d0714] to-[#120a1c] border border-violet-500/30 p-4 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-violet-300 font-black text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
                    <span>Primórdio (Atributo Superior)</span>
                  </div>
                  <p className="text-[10px] text-white/50 font-mono mt-0.5">
                    Canalização primordial, essência espiritual e poder divino
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-violet-400 font-mono">{rPri}</span>
                </div>
              </div>
            </div>

            {/* COMBAT TOOLS (Ferramentas de Combate) */}
            <div>
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-2.5 flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5 text-orange-500" />
                <span>Ferramentas de Combate:</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                <div className="bg-black border border-white/10 p-3 text-center">
                  <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">RESISTIR | ESMAGAR</p>
                  <p className="text-[9px] text-orange-400 font-mono mt-0.5">Físico</p>
                  <p className="text-lg font-black text-white font-mono mt-1">+{character.ferramenta_fisico}</p>
                </div>

                <div className="bg-black border border-white/10 p-3 text-center">
                  <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">EVADIR | ABDICAR</p>
                  <p className="text-[9px] text-orange-400 font-mono mt-0.5">Destreza</p>
                  <p className="text-lg font-black text-white font-mono mt-1">+{character.ferramenta_destreza}</p>
                </div>

                <div className="bg-black border border-white/10 p-3 text-center">
                  <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">PREVER | CONCENTRAR</p>
                  <p className="text-[9px] text-orange-400 font-mono mt-0.5">Cognição</p>
                  <p className="text-lg font-black text-white font-mono mt-1">+{character.ferramenta_cognicao}</p>
                </div>

                <div className="bg-black border border-white/10 p-3 text-center">
                  <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">RECUPERAR | INTIMIDAR</p>
                  <p className="text-[9px] text-orange-400 font-mono mt-0.5">Carisma</p>
                  <p className="text-lg font-black text-white font-mono mt-1">+{character.ferramenta_carisma}</p>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* 4. TEXT EDITING MODAL (WHEN GM CLICKS EDIT) */}
        {isEditingTexts && isGM && (
          <div className="bg-[#0c0c0c] border-2 border-orange-500/80 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                <Edit className="h-4 w-4" />
                <span>Editor de Conteúdo & Marcadores (Mestre GM)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingTexts(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Edit Marcadores values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-black p-3 border border-white/10">
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Alcance Máximo
                </label>
                <input
                  type="text"
                  value={eAlcance}
                  onChange={(e) => setEAlcance(e.target.value)}
                  placeholder="Ex: 10 Metros"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Movimento Máximo
                </label>
                <input
                  type="text"
                  value={eMovimento}
                  onChange={(e) => setEMovimento(e.target.value)}
                  placeholder="Ex: 15 Metros por Ação"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Fortitude Máxima
                </label>
                <input
                  type="text"
                  value={eFortitude}
                  onChange={(e) => setEFortitude(e.target.value)}
                  placeholder="Ex: 150 Kg"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Edit 4 Text Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Ataques e Técnicas (Suporta HTML: &lt;strong&gt;, &lt;b&gt;, etc.)
                </label>
                <textarea
                  rows={4}
                  value={eAtaques}
                  onChange={(e) => setEAtaques(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Dons e Habilidades Mágicas
                </label>
                <textarea
                  rows={4}
                  value={eDons}
                  onChange={(e) => setEDons(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Equipamento e Itens
                </label>
                <textarea
                  rows={4}
                  value={eEquipamentos}
                  onChange={(e) => setEEquipamentos(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Defesa e Armaduras
                </label>
                <textarea
                  rows={4}
                  value={eDefesa}
                  onChange={(e) => setEDefesa(e.target.value)}
                  className="w-full bg-black border border-white/10 p-3 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditingTexts(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTextBlocks}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow"
              >
                <Check className="h-4 w-4" />
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* 5. TABS NAVIGATION & RICH CONTENT (ATAQUES, DONS, EQUIPAMENTO, DEFESA, VERSÕES) */}
        <div className="bg-black border border-white/10 shadow-xl overflow-hidden">
          
          {/* Tabs header */}
          <div className="flex border-b border-white/10 bg-[#080808] overflow-x-auto custom-scroll">
            <button
              onClick={() => setActiveTab('ataques')}
              className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                activeTab === 'ataques'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.03]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Swords className="h-3.5 w-3.5" />
              Ataques
            </button>

            <button
              onClick={() => setActiveTab('dons')}
              className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                activeTab === 'dons'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.03]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Dons
            </button>

            <button
              onClick={() => setActiveTab('equip')}
              className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                activeTab === 'equip'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.03]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Backpack className="h-3.5 w-3.5" />
              Equipamento
            </button>

            <button
              onClick={() => setActiveTab('defesa')}
              className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                activeTab === 'defesa'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.03]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Defesa
            </button>

            <button
              onClick={() => setActiveTab('versoes')}
              className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                activeTab === 'versoes'
                  ? 'border-orange-500 text-orange-500 bg-white/[0.03]'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Versões / Avatar ({versions.length})
            </button>
          </div>

          {/* Tab contents */}
          <div className="p-6">
            
            {activeTab === 'ataques' && (
              <div className="rich-content space-y-3 text-xs leading-relaxed text-white/90">
                {rHtmlAtaques ? (
                  <div dangerouslySetInnerHTML={{ __html: rHtmlAtaques }} />
                ) : (
                  <p className="text-white/40 italic">Nenhum ataque registrado.</p>
                )}
              </div>
            )}

            {activeTab === 'dons' && (
              <div className="rich-content space-y-3 text-xs leading-relaxed text-white/90">
                {rHtmlDons ? (
                  <div dangerouslySetInnerHTML={{ __html: rHtmlDons }} />
                ) : (
                  <p className="text-white/40 italic">Nenhum dom ou habilidade mágica registrada.</p>
                )}
              </div>
            )}

            {activeTab === 'equip' && (
              <div className="rich-content space-y-3 text-xs leading-relaxed text-white/90">
                {rHtmlEquip ? (
                  <div dangerouslySetInnerHTML={{ __html: rHtmlEquip }} />
                ) : (
                  <p className="text-white/40 italic">Nenhum equipamento registrado.</p>
                )}
              </div>
            )}

            {activeTab === 'defesa' && (
              <div className="rich-content space-y-3 text-xs leading-relaxed text-white/90">
                {rHtmlDefesa ? (
                  <div dangerouslySetInnerHTML={{ __html: rHtmlDefesa }} />
                ) : (
                  <p className="text-white/40 italic">Nenhuma defesa registrada.</p>
                )}
              </div>
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

      </div>

    </div>
  );
}
