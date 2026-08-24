import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Character, CustomStatusType, CharVersion } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errors';
import { logAudit } from '../utils/auditTelemetry';
import { SheetVersions } from './SheetVersions';
import { ImageUploadField } from './ImageUploadField';
import { PrintableSankoteiSheet } from './PrintableSankoteiSheet';
import { DeleteCharacterModal } from './DeleteCharacterModal';
import RichTextEditor from "./RichTextEditor";
import { 
  Heart, Zap, Star, Shield, Crosshair, Activity, Dumbbell, 
  Printer, Edit, Plus, Minus, Flame, Sparkles, Swords, 
  BookOpen, Backpack, Eye, Check, X, User, Image as ImageIcon,
  Trash2, RotateCcw, History, Package
} from 'lucide-react';


const getFortitudeWeight = (fortitudeStr?: string | number): number => {
  if (!fortitudeStr) return 0;
  const val = String(fortitudeStr);
  const parts = val.split('|');
  const targetStr = parts.length > 1 ? parts[1] : parts[0];
  const match = targetStr.match(/\d+/);
  if (match) return parseInt(match[0], 10) * 50;
  const fallback = val.match(/\d+/);
  return fallback ? parseInt(fallback[0], 10) * 50 : 0;
};

interface CharacterSheetProps {
  character: Character;
  isGM: boolean;
  isOwner: boolean;
  statuses: CustomStatusType[];
  versions: CharVersion[];
  onCharacterArchived?: () => void;
}

export function CharacterSheet({ character, isGM, isOwner, statuses, versions, onCharacterArchived }: CharacterSheetProps) {
  const [activeTab, setActiveTab] = useState<'ataques' | 'dons' | 'equip' | 'defesa' | 'versoes'>('ataques');
  const [isEditingTexts, setIsEditingTexts] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Avatar Images for 3 health states
  const [eImgSaudavel, setEImgSaudavel] = useState(character.img_saudavel || '');
  const [eImgFerido, setEImgFerido] = useState(character.img_ferido || '');
  const [eImgMuitoFerido, setEImgMuitoFerido] = useState(character.img_muito_ferido || '');

  // Identity editing & Sankötei extras
  const [eNome, setENome] = useState(character.nome || '');
  const [eCla, setECla] = useState(character.cla || '');
  const [eOcupacao, setEOcupacao] = useState(character.ocupacao || '');
  const [ePosicaoSocial, setEPosicaoSocial] = useState(character.posicao_social || '');
  const [eCidadania, setECidadania] = useState(character.cidadania || 'Rëno');
  const [eSeguimento, setESeguimento] = useState(character.seguimento || 'Conquistador');
  const [eNivelamentoAlma, setENivelamentoAlma] = useState(character.nivelamento_alma || '');
  const [eNivel, setENivel] = useState(character.nivel || 1);

  // Finanças editing
  const [eRyoDourado, setERyoDourado] = useState(character.ryo_dourado ?? 20);
  const [eRyoPrateado, setERyoPrateado] = useState(character.ryo_prateado ?? 0);
  const [eRyoBronze, setERyoBronze] = useState(character.ryo_bronze ?? 0);

  // Vitals Max editing
  const [eHpMax, setEHpMax] = useState(character.hp_max || 100);
  const [eEtherMax, setEEtherMax] = useState(character.ether_max || 100);
  const [eDestinoMax, setEDestinoMax] = useState(character.destino_max || 5);

  // Primary Attributes editing
  const [eFisico, setEFisico] = useState(character.fisico || 10);
  const [eDestreza, setEDestreza] = useState(character.destreza || 10);
  const [eCognicao, setECognicao] = useState(character.cognicao || 10);
  const [eCarisma, setECarisma] = useState(character.carisma || 10);
  const [ePrimordio, setEPrimordio] = useState(character.primordio || 0);
  const [ePrimordioDetalhe, setEPrimordioDetalhe] = useState(character.primordio_detalhe || '');

  // Combat Tools Modifiers & Usages editing
  const [eFerramentaFisico, setEFerramentaFisico] = useState(character.ferramenta_fisico || 0);
  const [eFerramentaFisicoMax, setEFerramentaFisicoMax] = useState(character.ferramenta_fisico_max ?? 2);
  const [eFerramentaFisicoAtual, setEFerramentaFisicoAtual] = useState(character.ferramenta_fisico_atual ?? character.ferramenta_fisico_max ?? 2);
  const [eFerramentaFisicoSecMax, setEFerramentaFisicoSecMax] = useState(character.ferramenta_fisico_sec_max ?? 3);
  const [eFerramentaFisicoSecAtual, setEFerramentaFisicoSecAtual] = useState(character.ferramenta_fisico_sec_atual ?? character.ferramenta_fisico_sec_max ?? 3);

  const [eFerramentaDestreza, setEFerramentaDestreza] = useState(character.ferramenta_destreza || 0);
  const [eFerramentaDestrezaMax, setEFerramentaDestrezaMax] = useState(character.ferramenta_destreza_max ?? 0);
  const [eFerramentaDestrezaAtual, setEFerramentaDestrezaAtual] = useState(character.ferramenta_destreza_atual ?? character.ferramenta_destreza_max ?? 0);

  const [eFerramentaCognicao, setEFerramentaCognicao] = useState(character.ferramenta_cognicao || 0);
  const [eFerramentaCognicaoMax, setEFerramentaCognicaoMax] = useState(character.ferramenta_cognicao_max ?? 0);
  const [eFerramentaCognicaoAtual, setEFerramentaCognicaoAtual] = useState(character.ferramenta_cognicao_atual ?? character.ferramenta_cognicao_max ?? 0);

  const [eFerramentaCarisma, setEFerramentaCarisma] = useState(character.ferramenta_carisma || 0);
  const [eFerramentaCarismaMax, setEFerramentaCarismaMax] = useState(character.ferramenta_carisma_max ?? 1);
  const [eFerramentaCarismaAtual, setEFerramentaCarismaAtual] = useState(character.ferramenta_carisma_atual ?? character.ferramenta_carisma_max ?? 1);

  // Text inputs form editing
  const [eAtaques, setEAtaques] = useState(character.html_ataques || '');
  const [eDons, setEDons] = useState(character.html_dons || '');
  const [eEquipamentos, setEEquipamentos] = useState(character.html_equipamentos || '');
  const [eDefesa, setEDefesa] = useState(character.html_defesa || '');

  // Markers editing (GM only)
  const [eAlcance, setEAlcance] = useState(character.alcance_max || '03 (6) | 15 (30) metros');
  const [eMovimento, setEMovimento] = useState(character.movimento_max || '03 | 15 metros');
  const [eFortitude, setEFortitude] = useState(character.fortitude_max || '29+4 | 33 equipados');
  const [eTecnicas, setETecnicas] = useState(character.tecnicas_max || '02 | 00 equipada');

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
  // 51% to 100%: Saudável
  // 26% to 50%: Ferido
  // <= 25%: Muito Ferido (Crítico)
  const hpPct = Math.min(100, Math.max(0, (character.hp_atual / (rHpMax || 1)) * 100));
  const etherPct = Math.min(100, Math.max(0, (character.ether_atual / (rEtherMax || 1)) * 100));
  const destinoPct = Math.min(100, Math.max(0, (character.destino_atual / (rDestinoMax || 1)) * 100));

  let activeAvatarUrl = rImgSaudavel || 'https://via.placeholder.com/340x578?text=Sem+Avatar';
  let healthStatusLabel = 'Saudável (51% - 100%)';
  let healthStatusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

  if (hpPct <= 25) {
    activeAvatarUrl = rImgMuitoFerido || rImgFerido || rImgSaudavel || activeAvatarUrl;
    healthStatusLabel = 'Muito Ferido (≤ 25%)';
    healthStatusColor = 'text-rose-500 border-rose-500/40 bg-rose-950/40 animate-pulse';
  } else if (hpPct <= 50) {
    activeAvatarUrl = rImgFerido || rImgSaudavel || activeAvatarUrl;
    healthStatusLabel = 'Ferido (26% - 50%)';
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

  const handleUpdateToolCounter = async (
    field: 'ferramenta_fisico_atual' | 'ferramenta_fisico_sec_atual' | 'ferramenta_destreza_atual' | 'ferramenta_cognicao_atual' | 'ferramenta_carisma_atual',
    delta: number,
    maxVal: number
  ) => {
    const docPath = `characters/${character.id}`;
    let current = character[field];
    if (current === undefined || current === null) {
      current = maxVal;
    }
    let newVal = current + delta;
    if (newVal < 0) newVal = 0;
    if (newVal > maxVal) newVal = maxVal;

    try {
      await updateDoc(doc(db, 'characters', character.id), {
        [field]: newVal
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const handleRestoreAllTools = async () => {
    const docPath = `characters/${character.id}`;
    try {
      await updateDoc(doc(db, 'characters', character.id), {
        ferramenta_fisico_atual: character.ferramenta_fisico_max ?? 2,
        ferramenta_fisico_sec_atual: character.ferramenta_fisico_sec_max ?? 3,
        ferramenta_destreza_atual: character.ferramenta_destreza_max ?? 0,
        ferramenta_cognicao_atual: character.ferramenta_cognicao_max ?? 0,
        ferramenta_carisma_atual: character.ferramenta_carisma_max ?? 1,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const handleSaveTextBlocks = async () => {
    const docPath = `characters/${character.id}`;
    try {
      await updateDoc(doc(db, 'characters', character.id), {
        nome: eNome.trim() || character.nome,
        cla: eCla.trim(),
        ocupacao: eOcupacao.trim(),
        posicao_social: ePosicaoSocial.trim(),
        cidadania: eCidadania.trim(),
        seguimento: eSeguimento.trim(),
        nivelamento_alma: eNivelamentoAlma.trim(),
        nivel: Number(eNivel) || 1,
        ryo_dourado: Number(eRyoDourado) || 0,
        ryo_prateado: Number(eRyoPrateado) || 0,
        ryo_bronze: Number(eRyoBronze) || 0,
        hp_max: Number(eHpMax) || 1,
        ether_max: Number(eEtherMax) || 0,
        destino_max: Number(eDestinoMax) || 0,
        fisico: Number(eFisico) || 0,
        destreza: Number(eDestreza) || 0,
        cognicao: Number(eCognicao) || 0,
        carisma: Number(eCarisma) || 0,
        primordio: Number(ePrimordio) || 0,
        primordio_detalhe: ePrimordioDetalhe.trim(),
        ferramenta_fisico: Number(eFerramentaFisico) || 0,
        ferramenta_fisico_max: Number(eFerramentaFisicoMax) || 0,
        ferramenta_fisico_atual: Number(eFerramentaFisicoAtual) || 0,
        ferramenta_fisico_sec_max: Number(eFerramentaFisicoSecMax) || 0,
        ferramenta_fisico_sec_atual: Number(eFerramentaFisicoSecAtual) || 0,
        ferramenta_destreza: Number(eFerramentaDestreza) || 0,
        ferramenta_destreza_max: Number(eFerramentaDestrezaMax) || 0,
        ferramenta_destreza_atual: Number(eFerramentaDestrezaAtual) || 0,
        ferramenta_cognicao: Number(eFerramentaCognicao) || 0,
        ferramenta_cognicao_max: Number(eFerramentaCognicaoMax) || 0,
        ferramenta_cognicao_atual: Number(eFerramentaCognicaoAtual) || 0,
        ferramenta_carisma: Number(eFerramentaCarisma) || 0,
        ferramenta_carisma_max: Number(eFerramentaCarismaMax) || 0,
        ferramenta_carisma_atual: Number(eFerramentaCarismaAtual) || 0,
        img_saudavel: eImgSaudavel || '',
        img_ferido: eImgFerido || '',
        img_muito_ferido: eImgMuitoFerido || '',
        html_ataques: eAtaques,
        html_dons: eDons,
        html_equipamentos: eEquipamentos,
        html_defesa: eDefesa,
        alcance_max: eAlcance,
        movimento_max: eMovimento,
        fortitude_max: eFortitude,
        tecnicas_max: eTecnicas
      });
      setIsEditingTexts(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const startEditTexts = () => {
    setENome(character.nome || '');
    setECla(character.cla || '');
    setEOcupacao(character.ocupacao || '');
    setEPosicaoSocial(character.posicao_social || '');
    setECidadania(character.cidadania || 'Rëno');
    setESeguimento(character.seguimento || 'Conquistador');
    setENivelamentoAlma(character.nivelamento_alma || '');
    setENivel(character.nivel || 1);
    setERyoDourado(character.ryo_dourado ?? 20);
    setERyoPrateado(character.ryo_prateado ?? 0);
    setERyoBronze(character.ryo_bronze ?? 0);
    setEHpMax(character.hp_max || 100);
    setEEtherMax(character.ether_max || 100);
    setEDestinoMax(character.destino_max || 5);
    setEFisico(character.fisico || 10);
    setEDestreza(character.destreza || 10);
    setECognicao(character.cognicao || 10);
    setECarisma(character.carisma || 10);
    setEPrimordio(character.primordio || 0);
    setEPrimordioDetalhe(character.primordio_detalhe || '');
    setEFerramentaFisico(character.ferramenta_fisico || 0);
    setEFerramentaFisicoMax(character.ferramenta_fisico_max ?? 2);
    setEFerramentaFisicoAtual(character.ferramenta_fisico_atual ?? character.ferramenta_fisico_max ?? 2);
    setEFerramentaFisicoSecMax(character.ferramenta_fisico_sec_max ?? 3);
    setEFerramentaFisicoSecAtual(character.ferramenta_fisico_sec_atual ?? character.ferramenta_fisico_sec_max ?? 3);
    setEFerramentaDestreza(character.ferramenta_destreza || 0);
    setEFerramentaDestrezaMax(character.ferramenta_destreza_max ?? 0);
    setEFerramentaDestrezaAtual(character.ferramenta_destreza_atual ?? character.ferramenta_destreza_max ?? 0);
    setEFerramentaCognicao(character.ferramenta_cognicao || 0);
    setEFerramentaCognicaoMax(character.ferramenta_cognicao_max ?? 0);
    setEFerramentaCognicaoAtual(character.ferramenta_cognicao_atual ?? character.ferramenta_cognicao_max ?? 0);
    setEFerramentaCarisma(character.ferramenta_carisma || 0);
    setEFerramentaCarismaMax(character.ferramenta_carisma_max ?? 1);
    setEFerramentaCarismaAtual(character.ferramenta_carisma_atual ?? character.ferramenta_carisma_max ?? 1);
    setEImgSaudavel(character.img_saudavel || '');
    setEImgFerido(character.img_ferido || '');
    setEImgMuitoFerido(character.img_muito_ferido || '');
    setEAtaques(character.html_ataques || '');
    setEDons(character.html_dons || '');
    setEEquipamentos(character.html_equipamentos || '');
    setEDefesa(character.html_defesa || '');
    setEAlcance(character.alcance_max || '03 (6) | 15 (30) metros');
    setEMovimento(character.movimento_max || '03 | 15 metros');
    setEFortitude(character.fortitude_max || '29+4 | 33 equipados');
    setETecnicas(character.tecnicas_max || '02 | 00 equipada');
    setIsEditingTexts(true);
  };

  const handleArchiveCharacter = async () => {
    const docPath = `characters/${character.id}`;
    try {
      await updateDoc(doc(db, 'characters', character.id), {
        arquivado: true,
        arquivadoEm: new Date().toISOString()
      });
      if (onCharacterArchived) {
        onCharacterArchived();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const handleExportPdf = () => {
    setShowPrintModal(true);
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

      {/* FIXED SIDEBAR + SCROLLABLE CONTENT TWO-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row items-start gap-6">

        {/* 1. LEFT SIDEBAR: FIXED / STICKY CHARACTER IDENTITY & ARTWORK */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-4 self-start space-y-4">
          
          <div className="bg-black border border-white/10 p-5 shadow-2xl space-y-5">
            
            {/* Character Artwork (Aspect 10:17 Portrait) */}
            <div className="relative bg-[#070707] border-2 border-blue-500/40 overflow-hidden shadow-2xl group" style={{ aspectRatio: '10/17' }}>
              <img
                src={activeAvatarUrl}
                alt={character.nome}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Bottom Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />

              {/* Transformation Flame Badge */}
              {activeVersion && (
                <div className="absolute top-2 right-2 bg-blue-600 p-1 shadow-lg" title="Forma Transformada Ativa!">
                  <Flame className="h-4 w-4 text-white animate-pulse" />
                </div>
              )}

              {/* Status Badge watermark on art */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-black/90 border border-blue-500/30 px-2 py-0.5">
                    Nível {rNivel}
                  </span>
                </div>
                {activeStatusIcons.length > 0 && (
                  <div className="flex gap-1 bg-black/90 p-1 border border-white/10">
                    {activeStatusIcons.map(st => (
                      <img key={st.id} src={st.imageUrl} alt={st.nome} title={st.nome} className="w-5 h-5 object-contain" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Character Name & Badges */}
            <div className="space-y-2 border-b border-white/10 pb-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                  {character.nome}
                </h1>
                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${healthStatusColor}`}>
                  {healthStatusLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 font-mono">
                  Nível {rNivel}
                </span>
                {character.cla && (
                  <span className="text-[10px] bg-white/5 border border-white/10 text-white/70 font-mono px-2 py-0.5 uppercase">
                    Clã: <strong className="text-sky-400">{character.cla}</strong>
                  </span>
                )}
              </div>

              {character.ocupacao && (
                <p className="text-[11px] text-white/60 font-mono uppercase tracking-wider">
                  Ocupação: <span className="text-sky-400 font-bold">{character.ocupacao}</span>
                </p>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2 no-print">
              <button
                onClick={handleExportPdf}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs py-2.5 px-4 border border-white/10 transition uppercase tracking-wider"
                title="Salvar como PDF / Imprimir Ficha no Padrão Sankötei"
              >
                <Printer className="h-3.5 w-3.5 text-sky-400" />
                <span>Exportar Ficha em PDF (Sankötei)</span>
              </button>

              {isGM && !isEditingTexts && (
                <>
                  <button
                    onClick={startEditTexts}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-2.5 px-4 transition uppercase tracking-wider shadow-lg"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Editar Ficha, Atributos & Marcadores</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-[11px] py-2 px-3 border border-rose-500/30 transition uppercase font-mono tracking-wider"
                    title="Mover ficha para a lixeira do GM com segurança"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Excluir Ficha (Mover para Lixeira)</span>
                  </button>
                </>
              )}
            </div>

            {/* GM Information details */}
            {isGM && (
              <div className="pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Dono da Ficha:</span>
                  <span className="text-sky-400 font-bold truncate max-w-[160px]">{character.email_dono || 'Sem Dono (Mestre)'}</span>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* 2. RIGHT COLUMN: SCROLLABLE INDICATIVES, ATTRIBUTES & TEXT CONTENT */}
        <div className="flex-1 min-w-0 space-y-6 w-full">

          {/* 2.1 STATUS CARDS (SAÚDE, ENERGIA, PODER) */}
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

          {/* 2.2 MARCADORES (ALCANCE, MOVIMENTO, FORTITUDE) */}
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
              <p className="text-[10px] font-mono mt-1 mb-1 text-violet-300 bg-violet-950/40 inline-block px-1.5 py-0.5 rounded border border-violet-500/20">
                Peso Máx: {getFortitudeWeight(rFortitudeMax)}kg
              </p>
              <p className="text-[9px] text-white/40 font-mono mt-0.5 block">
                Capacidade de Carga & Resistência Física
              </p>
            </div>

          </div>

          {/* 2.3 ATRIBUTOS PRIMÁRIOS & PRIMÓRDIO */}
          <div className="space-y-4">
            <p className="text-[10px] text-white/50 uppercase font-black tracking-widest flex items-center gap-1.5">
              <span>Atributos Primários:</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* FÍSICO */}
              <div className="bg-black border border-white/10 hover:border-blue-500/40 p-4 transition-all flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-white">Físico</span>
                  <span className="text-[9px] font-mono text-sky-400 bg-blue-500/10 px-1.5 py-0.2 border border-blue-500/20">FIS</span>
                </div>
                <div className="my-2">
                  <span className="text-3xl font-black text-white font-mono">{rFis}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40">Mod:</span>
                  <span className="text-sky-400 font-bold">+{character.ferramenta_fisico}</span>
                </div>
              </div>

              {/* DESTREZA */}
              <div className="bg-black border border-white/10 hover:border-blue-500/40 p-4 transition-all flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-white">Destreza</span>
                  <span className="text-[9px] font-mono text-sky-400 bg-blue-500/10 px-1.5 py-0.2 border border-blue-500/20">DES</span>
                </div>
                <div className="my-2">
                  <span className="text-3xl font-black text-white font-mono">{rDes}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40">Mod:</span>
                  <span className="text-sky-400 font-bold">+{character.ferramenta_destreza}</span>
                </div>
              </div>

              {/* COGNIÇÃO */}
              <div className="bg-black border border-white/10 hover:border-blue-500/40 p-4 transition-all flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-white">Cognição</span>
                  <span className="text-[9px] font-mono text-sky-400 bg-blue-500/10 px-1.5 py-0.2 border border-blue-500/20">COG</span>
                </div>
                <div className="my-2">
                  <span className="text-3xl font-black text-white font-mono">{rCog}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40">Mod:</span>
                  <span className="text-sky-400 font-bold">+{character.ferramenta_cognicao}</span>
                </div>
              </div>

              {/* CARISMA */}
              <div className="bg-black border border-white/10 hover:border-blue-500/40 p-4 transition-all flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-white">Carisma</span>
                  <span className="text-[9px] font-mono text-sky-400 bg-blue-500/10 px-1.5 py-0.2 border border-blue-500/20">CAR</span>
                </div>
                <div className="my-2">
                  <span className="text-3xl font-black text-white font-mono">{rCar}</span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                  <span className="text-white/40">Mod:</span>
                  <span className="text-sky-400 font-bold">+{character.ferramenta_carisma}</span>
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

          </div>

          {/* 2.4 COMBAT TOOLS (Ferramentas de Combate & Contadores de Uso) */}
          <div className="space-y-3 bg-[#080808] border border-blue-500/30 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-sky-400 uppercase font-black tracking-widest flex items-center gap-1.5">
                <Swords className="h-4 w-4 text-sky-400" />
                <span>Ferramentas de Combate & Contadores de Uso</span>
              </p>
              {isGM && (
                <button
                  type="button"
                  onClick={handleRestoreAllTools}
                  className="flex items-center gap-1 text-[10px] bg-blue-950/40 hover:bg-blue-900/60 text-sky-300 border border-blue-500/30 px-2.5 py-1 font-mono uppercase font-bold transition"
                  title="Restaurar todos os contadores de ferramentas para o valor máximo"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Restaurar Usos</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* FÍSICO */}
              <div className="bg-black border border-white/10 p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">RESISTIR | ESMAGAR</p>
                    <p className="text-[10px] text-sky-400 font-mono font-bold">Físico</p>
                  </div>
                  <span className="text-sm font-black text-white font-mono bg-white/5 px-2 py-0.5 border border-white/10">
                    +{character.ferramenta_fisico || 0}
                  </span>
                </div>

                {/* Primary Tool Counter */}
                <div className="bg-[#0b0b0b] p-1.5 border border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/50 uppercase">Uso Padrão:</span>
                  <div className="flex items-center gap-1.5">
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_fisico_atual', -1, character.ferramenta_fisico_max ?? 2)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Gastar 1 uso"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <span className="font-mono font-bold text-xs text-sky-400">
                      {character.ferramenta_fisico_atual ?? character.ferramenta_fisico_max ?? 2}
                      <span className="text-white/40 font-normal">/{character.ferramenta_fisico_max ?? 2}</span>
                    </span>
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_fisico_atual', 1, character.ferramenta_fisico_max ?? 2)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Recuperar 1 uso"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Tool Counter (if max > 0) */}
                {(character.ferramenta_fisico_sec_max ?? 3) > 0 && (
                  <div className="bg-[#0b0b0b] p-1.5 border border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/50 uppercase">2º Uso:</span>
                    <div className="flex items-center gap-1.5">
                      {isGM && (
                        <button
                          type="button"
                          onClick={() => handleUpdateToolCounter('ferramenta_fisico_sec_atual', -1, character.ferramenta_fisico_sec_max ?? 3)}
                          className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                          title="Gastar 1 uso"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                      )}
                      <span className="font-mono font-bold text-xs text-sky-400">
                        {character.ferramenta_fisico_sec_atual ?? character.ferramenta_fisico_sec_max ?? 3}
                        <span className="text-white/40 font-normal">/{character.ferramenta_fisico_sec_max ?? 3}</span>
                      </span>
                      {isGM && (
                        <button
                          type="button"
                          onClick={() => handleUpdateToolCounter('ferramenta_fisico_sec_atual', 1, character.ferramenta_fisico_sec_max ?? 3)}
                          className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                          title="Recuperar 1 uso"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* DESTREZA */}
              <div className="bg-black border border-white/10 p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">EVADIR | ABDICAR</p>
                    <p className="text-[10px] text-sky-400 font-mono font-bold">Destreza</p>
                  </div>
                  <span className="text-sm font-black text-white font-mono bg-white/5 px-2 py-0.5 border border-white/10">
                    +{character.ferramenta_destreza || 0}
                  </span>
                </div>

                <div className="bg-[#0b0b0b] p-1.5 border border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/50 uppercase">Usos:</span>
                  <div className="flex items-center gap-1.5">
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_destreza_atual', -1, character.ferramenta_destreza_max ?? 0)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Gastar 1 uso"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <span className="font-mono font-bold text-xs text-sky-400">
                      {character.ferramenta_destreza_atual ?? character.ferramenta_destreza_max ?? 0}
                      <span className="text-white/40 font-normal">/{character.ferramenta_destreza_max ?? 0}</span>
                    </span>
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_destreza_atual', 1, character.ferramenta_destreza_max ?? 0)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Recuperar 1 uso"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* COGNIÇÃO */}
              <div className="bg-black border border-white/10 p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">PREVER | CONCENTRAR</p>
                    <p className="text-[10px] text-sky-400 font-mono font-bold">Cognição</p>
                  </div>
                  <span className="text-sm font-black text-white font-mono bg-white/5 px-2 py-0.5 border border-white/10">
                    +{character.ferramenta_cognicao || 0}
                  </span>
                </div>

                <div className="bg-[#0b0b0b] p-1.5 border border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/50 uppercase">Usos:</span>
                  <div className="flex items-center gap-1.5">
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_cognicao_atual', -1, character.ferramenta_cognicao_max ?? 0)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Gastar 1 uso"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <span className="font-mono font-bold text-xs text-sky-400">
                      {character.ferramenta_cognicao_atual ?? character.ferramenta_cognicao_max ?? 0}
                      <span className="text-white/40 font-normal">/{character.ferramenta_cognicao_max ?? 0}</span>
                    </span>
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_cognicao_atual', 1, character.ferramenta_cognicao_max ?? 0)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Recuperar 1 uso"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CARISMA */}
              <div className="bg-black border border-white/10 p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] text-white/50 uppercase font-bold tracking-tight">RECUPERAR | INTIMIDAR</p>
                    <p className="text-[10px] text-sky-400 font-mono font-bold">Carisma</p>
                  </div>
                  <span className="text-sm font-black text-white font-mono bg-white/5 px-2 py-0.5 border border-white/10">
                    +{character.ferramenta_carisma || 0}
                  </span>
                </div>

                <div className="bg-[#0b0b0b] p-1.5 border border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/50 uppercase">Usos:</span>
                  <div className="flex items-center gap-1.5">
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_carisma_atual', -1, character.ferramenta_carisma_max ?? 1)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Gastar 1 uso"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <span className="font-mono font-bold text-xs text-sky-400">
                      {character.ferramenta_carisma_atual ?? character.ferramenta_carisma_max ?? 1}
                      <span className="text-white/40 font-normal">/{character.ferramenta_carisma_max ?? 1}</span>
                    </span>
                    {isGM && (
                      <button
                        type="button"
                        onClick={() => handleUpdateToolCounter('ferramenta_carisma_atual', 1, character.ferramenta_carisma_max ?? 1)}
                        className="p-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        title="Recuperar 1 uso"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2.5 COMPLETE SHEET & ATTRIBUTES EDITING MODAL (WHEN GM CLICKS EDIT) */}
          {isEditingTexts && isGM && (
            <div className="bg-[#0c0c0c] border-2 border-blue-500/80 p-5 space-y-5 shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  <span>Editor de Ficha, Atributos Máximos & Marcadores (Mestre GM)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingTexts(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Section 1: Identity, Level & Finances */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block tracking-wider">
                  1. Identidade Sankötei, Nível & Finanças
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-black p-3 border border-white/10">
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Nome do Herói
                    </label>
                    <input
                      type="text"
                      value={eNome}
                      onChange={(e) => setENome(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Nível
                    </label>
                    <input
                      type="number"
                      value={eNivel}
                      onChange={(e) => setENivel(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Clã
                    </label>
                    <input
                      type="text"
                      value={eCla}
                      onChange={(e) => setECla(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Ocupação / Posição Social
                    </label>
                    <input
                      type="text"
                      value={eOcupacao}
                      onChange={(e) => setEOcupacao(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Cidadania / Naturalidade
                    </label>
                    <input
                      type="text"
                      value={eCidadania}
                      onChange={(e) => setECidadania(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Seguimento
                    </label>
                    <input
                      type="text"
                      value={eSeguimento}
                      onChange={(e) => setESeguimento(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Nivelamento & Alma
                    </label>
                    <input
                      type="text"
                      value={eNivelamentoAlma}
                      onChange={(e) => setENivelamentoAlma(e.target.value)}
                      placeholder="Ex: 05 (68). Alma: Reihao (17) 2x"
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Finanças */}
                  <div className="sm:col-span-4 grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[8px] text-amber-400 font-mono uppercase mb-1">
                        Ryo Dourado
                      </label>
                      <input
                        type="number"
                        value={eRyoDourado}
                        onChange={(e) => setERyoDourado(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-amber-500/30 px-2.5 py-1 text-amber-400 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-300 font-mono uppercase mb-1">
                        Ryo Prateado
                      </label>
                      <input
                        type="number"
                        value={eRyoPrateado}
                        onChange={(e) => setERyoPrateado(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-slate-400/30 px-2.5 py-1 text-slate-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-amber-700 font-mono uppercase mb-1">
                        Ryo Bronze
                      </label>
                      <input
                        type="number"
                        value={eRyoBronze}
                        onChange={(e) => setERyoBronze(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-amber-700/30 px-2.5 py-1 text-amber-600 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Dynamic Health Avatars (Saudável, Ferido, Muito Ferido) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-sky-400 flex items-center gap-1.5 tracking-wider">
                    <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
                    <span>2. Avatares Dinâmicos por Estado de Saúde (GM)</span>
                  </span>
                  <span className="text-[9px] text-white/40 font-mono">
                    A arte muda na ficha automaticamente de acordo com o HP do herói
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-black p-4 border border-white/10">
                  
                  {/* 1. Saudável (51% a 100%) */}
                  <div className="space-y-2 border border-emerald-500/20 bg-emerald-950/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"></span>
                        Saudável
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-500/30">
                        51% a 100% HP
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 leading-tight">
                      Aparência padrão do herói em perfeitas condições.
                    </p>
                    <ImageUploadField
                      label="Avatar Saudável (51% - 100%)"
                      value={eImgSaudavel}
                      onChange={(dataUrl) => setEImgSaudavel(dataUrl)}
                      aspectRatio="portrait"
                      maxWidth={600}
                      maxHeight={900}
                    />
                  </div>

                  {/* 2. Ferido (26% a 50%) */}
                  <div className="space-y-2 border border-amber-500/20 bg-amber-950/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400 inline-block"></span>
                        Ferido
                      </span>
                      <span className="text-[9px] font-mono text-amber-400/80 bg-amber-950/40 px-1.5 py-0.5 border border-amber-500/30">
                        26% a 50% HP
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 leading-tight">
                      Aparência com ferimentos, cansaço ou postura de guarda.
                    </p>
                    <ImageUploadField
                      label="Avatar Ferido (26% - 50%)"
                      value={eImgFerido}
                      onChange={(dataUrl) => setEImgFerido(dataUrl)}
                      aspectRatio="portrait"
                      maxWidth={600}
                      maxHeight={900}
                    />
                  </div>

                  {/* 3. Muito Ferido (Abaixo de 25%) */}
                  <div className="space-y-2 border border-rose-500/30 bg-rose-950/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>
                        Muito Ferido
                      </span>
                      <span className="text-[9px] font-mono text-rose-400/80 bg-rose-950/40 px-1.5 py-0.5 border border-rose-500/30">
                        ≤ 25% HP
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 leading-tight">
                      Aparência em estado crítico ou sangrando severamente.
                    </p>
                    <ImageUploadField
                      label="Avatar Muito Ferido (≤ 25%)"
                      value={eImgMuitoFerido}
                      onChange={(dataUrl) => setEImgMuitoFerido(dataUrl)}
                      aspectRatio="portrait"
                      maxWidth={600}
                      maxHeight={900}
                    />
                  </div>

                </div>
              </div>

              {/* Section 3: Vitals Max Values */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-rose-400 block tracking-wider">
                  3. Valores Máximos dos Vitais
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black p-3 border border-white/10">
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-500" />
                      HP Máximo (Saúde)
                    </label>
                    <input
                      type="number"
                      value={eHpMax}
                      onChange={(e) => setEHpMax(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-rose-400 font-bold text-xs font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-cyan-400" />
                      Éter Máximo (Energia)
                    </label>
                    <input
                      type="number"
                      value={eEtherMax}
                      onChange={(e) => setEEtherMax(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-cyan-400 font-bold text-xs font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      Destino Máximo (Poder)
                    </label>
                    <input
                      type="number"
                      value={eDestinoMax}
                      onChange={(e) => setEDestinoMax(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-amber-400 font-bold text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Primary Attributes & Primordio */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block tracking-wider">
                  4. Atributos Primários & Primórdio
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-black p-3 border border-white/10">
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Físico (FIS)
                    </label>
                    <input
                      type="number"
                      value={eFisico}
                      onChange={(e) => setEFisico(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Destreza (DES)
                    </label>
                    <input
                      type="number"
                      value={eDestreza}
                      onChange={(e) => setEDestreza(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Cognição (COG)
                    </label>
                    <input
                      type="number"
                      value={eCognicao}
                      onChange={(e) => setECognicao(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1">
                      Carisma (CAR)
                    </label>
                    <input
                      type="number"
                      value={eCarisma}
                      onChange={(e) => setECarisma(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-violet-950/20 border border-violet-500/30 p-1.5 space-y-1">
                    <label className="block text-[9px] text-violet-300 font-bold uppercase tracking-wider mb-1">
                      Primórdio (PRI)
                    </label>
                    <input
                      type="number"
                      value={ePrimordio}
                      onChange={(e) => setEPrimordio(Number(e.target.value))}
                      className="w-full bg-[#050505] border border-violet-500/40 px-3 py-1 text-violet-300 text-xs font-mono font-bold focus:outline-none focus:border-violet-400"
                    />
                    <input
                      type="text"
                      value={ePrimordioDetalhe}
                      onChange={(e) => setEPrimordioDetalhe(e.target.value)}
                      placeholder="(45+20+5+5)"
                      className="w-full bg-[#050505] border border-violet-500/20 px-2 py-0.5 text-violet-300/80 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Combat Tools Modifiers & Max Usages */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block tracking-wider">
                  5. Ferramentas de Combate (Modificadores & Contadores de Uso Máximos)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-black p-3 border border-white/10">
                  
                  {/* Físico */}
                  <div className="space-y-1.5 p-2 bg-[#090909] border border-white/5">
                    <label className="block text-[8px] text-white/70 font-bold uppercase tracking-tight">
                      Resistir | Esmagar (FIS)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Bônus:</span>
                      <input
                        type="number"
                        value={eFerramentaFisico}
                        onChange={(e) => setEFerramentaFisico(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-white/10 px-2 py-1 text-sky-400 text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Uso 1:</span>
                      <input
                        type="number"
                        value={eFerramentaFisicoAtual}
                        onChange={(e) => setEFerramentaFisicoAtual(Number(e.target.value))}
                        placeholder="Atual"
                        title="Uso Atual"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                      <span className="text-white/40">/</span>
                      <input
                        type="number"
                        value={eFerramentaFisicoMax}
                        onChange={(e) => setEFerramentaFisicoMax(Number(e.target.value))}
                        placeholder="Máx"
                        title="Uso Máximo"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Uso 2:</span>
                      <input
                        type="number"
                        value={eFerramentaFisicoSecAtual}
                        onChange={(e) => setEFerramentaFisicoSecAtual(Number(e.target.value))}
                        placeholder="Atual 2"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                      <span className="text-white/40">/</span>
                      <input
                        type="number"
                        value={eFerramentaFisicoSecMax}
                        onChange={(e) => setEFerramentaFisicoSecMax(Number(e.target.value))}
                        placeholder="Máx 2"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Destreza */}
                  <div className="space-y-1.5 p-2 bg-[#090909] border border-white/5">
                    <label className="block text-[8px] text-white/70 font-bold uppercase tracking-tight">
                      Evadir | Abdicar (DES)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Bônus:</span>
                      <input
                        type="number"
                        value={eFerramentaDestreza}
                        onChange={(e) => setEFerramentaDestreza(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-white/10 px-2 py-1 text-sky-400 text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Usos:</span>
                      <input
                        type="number"
                        value={eFerramentaDestrezaAtual}
                        onChange={(e) => setEFerramentaDestrezaAtual(Number(e.target.value))}
                        placeholder="Atual"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                      <span className="text-white/40">/</span>
                      <input
                        type="number"
                        value={eFerramentaDestrezaMax}
                        onChange={(e) => setEFerramentaDestrezaMax(Number(e.target.value))}
                        placeholder="Máx"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Cognição */}
                  <div className="space-y-1.5 p-2 bg-[#090909] border border-white/5">
                    <label className="block text-[8px] text-white/70 font-bold uppercase tracking-tight">
                      Prever | Concentrar (COG)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Bônus:</span>
                      <input
                        type="number"
                        value={eFerramentaCognicao}
                        onChange={(e) => setEFerramentaCognicao(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-white/10 px-2 py-1 text-sky-400 text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Usos:</span>
                      <input
                        type="number"
                        value={eFerramentaCognicaoAtual}
                        onChange={(e) => setEFerramentaCognicaoAtual(Number(e.target.value))}
                        placeholder="Atual"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                      <span className="text-white/40">/</span>
                      <input
                        type="number"
                        value={eFerramentaCognicaoMax}
                        onChange={(e) => setEFerramentaCognicaoMax(Number(e.target.value))}
                        placeholder="Máx"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Carisma */}
                  <div className="space-y-1.5 p-2 bg-[#090909] border border-white/5">
                    <label className="block text-[8px] text-white/70 font-bold uppercase tracking-tight">
                      Recuperar | Intimidar (CAR)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Bônus:</span>
                      <input
                        type="number"
                        value={eFerramentaCarisma}
                        onChange={(e) => setEFerramentaCarisma(Number(e.target.value))}
                        className="w-full bg-[#050505] border border-white/10 px-2 py-1 text-sky-400 text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-white/40 font-mono w-10">Usos:</span>
                      <input
                        type="number"
                        value={eFerramentaCarismaAtual}
                        onChange={(e) => setEFerramentaCarismaAtual(Number(e.target.value))}
                        placeholder="Atual"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                      <span className="text-white/40">/</span>
                      <input
                        type="number"
                        value={eFerramentaCarismaMax}
                        onChange={(e) => setEFerramentaCarismaMax(Number(e.target.value))}
                        placeholder="Máx"
                        className="w-1/2 bg-[#050505] border border-white/10 px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Section 6: Marcadores de Campo */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block tracking-wider">
                  6. Marcadores de Campo Sankötei
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-black p-3 border border-white/10">
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                      Alcance Máximo
                    </label>
                    <input
                      type="text"
                      value={eAlcance}
                      onChange={(e) => setEAlcance(e.target.value)}
                      placeholder="03 (6) | 15 (30) metros"
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
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
                      placeholder="03 | 15 metros"
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
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
                      placeholder="29+4 | 33 equipados"
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                      Técnicas
                    </label>
                    <input
                      type="text"
                      value={eTecnicas}
                      onChange={(e) => setETecnicas(e.target.value)}
                      placeholder="02 | 00 equipada"
                      className="w-full bg-[#050505] border border-white/10 px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 7: 4 Text Blocks */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 block tracking-wider">
                  7. Conteúdo e Habilidades (Formatação Rica e Colunas)
                </span>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Ataques e Técnicas
                    </label>
                    <RichTextEditor value={eAtaques} onChange={setEAtaques} placeholder="Digite os ataques..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Defesa e Armaduras
                    </label>
                    <RichTextEditor value={eDefesa} onChange={setEDefesa} placeholder="Detalhes de defesa..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Dons e Habilidades Mágicas
                    </label>
                    <RichTextEditor value={eDons} onChange={setEDons} placeholder="Digite os dons e habilidades..." />
                  </div>

                  <div>
                    <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-2">
                      Equipamento e Itens
                    </label>
                    <RichTextEditor value={eEquipamentos} onChange={setEEquipamentos} placeholder="Lista de equipamentos..." />
                  </div>
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow"
                >
                  <Check className="h-4 w-4" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {/* 2.6 TABS NAVIGATION & RICH CONTENT (ATAQUES, DONS, EQUIPAMENTO, DEFESA, VERSÕES) */}
          <div className="bg-black border border-white/10 shadow-xl overflow-hidden">
            
            {/* Tabs header */}
            <div className="flex border-b border-white/10 bg-[#080808] overflow-x-auto custom-scroll">
              <button
                onClick={() => setActiveTab('ataques')}
                className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                  activeTab === 'ataques'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <Swords className="h-3.5 w-3.5" />
                Ataques
              </button>

              <button
                onClick={() => setActiveTab('defesa')}
                className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                  activeTab === 'defesa'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Defesa
              </button>

              <button
                onClick={() => setActiveTab('dons')}
                className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                  activeTab === 'dons'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
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
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                Equipamento
              </button>

              <button
                onClick={() => setActiveTab('versoes')}
                className={`px-5 py-3.5 text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border-b-2 shrink-0 ${
                  activeTab === 'versoes'
                    ? 'border-blue-500 text-sky-400 bg-white/[0.03]'
                    : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                Versões Salvas
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

      {/* Delete Character Confirmation Modal */}
      {showDeleteModal && (
        <DeleteCharacterModal
          isOpen={showDeleteModal}
          character={character}
          onClose={() => setShowDeleteModal(false)}
          onConfirmArchive={handleArchiveCharacter}
        />
      )}

      {/* Printable Sankötei Sheet for PDF Export */}
      {showPrintModal && (
        <PrintableSankoteiSheet
          character={character}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
}
