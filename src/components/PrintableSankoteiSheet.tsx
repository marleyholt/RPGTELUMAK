import React from 'react';
import { Character } from '../types';
import { Printer, X, Download } from 'lucide-react';

interface PrintableSankoteiSheetProps {
  character: Character;
  isOpen?: boolean;
  onClose?: () => void;
}


// Converte textos brancos do editor rico para preto na impressão
const sanitizeHtmlForPrint = (html?: string) => {
  if (!html) return '';
  let sanitized = html;
  // Substitui style="color: white" 
  sanitized = sanitized.replace(/color:\s*(?:#ffffff|#fff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1\s*\))/gi, 'color: #000000');
  // Substitui color="white" (muito comum em tabelas criadas no editor)
  sanitized = sanitized.replace(/color=["'](?:#ffffff|#fff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1\s*\))["']/gi, 'color="#000000"');
  return sanitized;
};

export function PrintableSankoteiSheet({
  character,
  isOpen = true,
  onClose
}: PrintableSankoteiSheetProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculations for display
  const hpConsumidos = character.hp_consumidos ?? Math.max(0, character.hp_max - character.hp_atual);
  const etherConsumidos = character.ether_consumidos ?? Math.max(0, character.ether_max - character.ether_atual);
  const destinoConsumidos = character.destino_consumidos ?? Math.max(0, character.destino_max - character.destino_atual);

  const fisUso1 = `${character.ferramenta_fisico_atual ?? character.ferramenta_fisico_max ?? 2}/${character.ferramenta_fisico_max ?? 2}`;
  const fisUso2 = character.ferramenta_fisico_sec_max ? `${character.ferramenta_fisico_sec_atual ?? character.ferramenta_fisico_sec_max}/${character.ferramenta_fisico_sec_max}` : '';
  const desUso = `${character.ferramenta_destreza_atual ?? character.ferramenta_destreza_max ?? 0}/${character.ferramenta_destreza_max ?? 0}`;
  const cogUso = `${character.ferramenta_cognicao_atual ?? character.ferramenta_cognicao_max ?? 0}/${character.ferramenta_cognicao_max ?? 0}`;
  const carUso = `${character.ferramenta_carisma_atual ?? character.ferramenta_carisma_max ?? 1}/${character.ferramenta_carisma_max ?? 1}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md p-4 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Non-Print Control Toolbar */}
      <div className="no-print max-w-4xl mx-auto mb-4 bg-[#111] border border-blue-500/40 p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 sticky top-2 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white font-black text-xs">
            PDF SANKÖTEI
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Visualização de Exportação em PDF (Padrão Oficial Sankötei)
            </h3>
            <p className="text-[11px] text-white/50 font-mono">
              Ficha formatada em layout contínuo para impressão A4 e download em PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-2 px-4 shadow-lg uppercase tracking-wider transition"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / Gerar PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
              title="Fechar Visualização"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* PRINT-SPECIFIC CSS RULES */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .sankotei-page {
            page-break-after: auto !important;
            break-after: auto !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .sankotei-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .sankotei-header-ribbon {
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* FIX FOR RICH TEXT EDITOR COLUMNS IN PDF */
          .rich-content div[style*="display: flex"] {
            display: flex !important;
            flex-wrap: wrap !important; /* Allow wrapping if too tight */
            overflow: visible !important;
          }
          .rich-content div[style*="overflow: auto"] {
            overflow: visible !important;
            resize: none !important;
            border: none !important; /* Remove the dashed borders for clean PDF */
            padding: 0 !important; /* Remove padding to maximize space */
          }
          /* We add a small gap in flex to replace padding */
          .rich-content div[style*="display: flex"] {
            gap: 1.5rem !important; 
          }
          /* Ensure text wraps nicely and doesn't get cut off */
          .rich-content {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          /* Make sure actual tables don't break horribly */
          .rich-content table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          .rich-content tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .rich-content td, .rich-content th {
            border: 1px solid #ccc !important;
            padding: 4px !important;
            color: #000000;
          }
          .rich-content th {
            background-color: #eee !important;
          }
          
          /* Prevent flex from hiding content in print */
          .rich-content div[style*="display: flex"] {
            display: flex !important;
            flex-wrap: wrap !important;
            width: 100% !important;
            page-break-inside: avoid !important; 
          }
          
          /* Force auto height for everything */
          .rich-content * {
            height: auto !important;
            min-height: 0 !important;
          }
          /* Fix font size scaling issues */
          .rich-content font {
            line-height: 1.3 !important;
          }
        }
      `}} />

      {/* DOCUMENT WRAPPER */}
      <div className="max-w-[210mm] mx-auto space-y-8 print:space-y-0 text-black bg-white font-sans text-sm shadow-2xl">

        {/* ========================================================================= */}
        {/* PÁGINA 1: IDENTIDADE, FINANÇAS, MARCADORES, ATRIBUTOS & COMBATE           */}
        {/* ========================================================================= */}
        <div className="sankotei-page bg-white p-8 sm:p-10 border border-neutral-300 min-h-[297mm] flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Document Title Header */}
            <div className="text-center pb-2 border-b-2 border-neutral-800">
              <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-[0.25em] text-neutral-900">
                FICHA SANKÖTEI
              </h1>
            </div>

            {/* Header: Identity & Finances (Two Columns) */}
            <div className="grid grid-cols-12 gap-4 text-xs">
              
              {/* Left Identity Column */}
              <div className="col-span-8 space-y-1.5 leading-tight">
                <p>
                  <strong className="font-bold text-neutral-900">Nome e Clã:</strong>{' '}
                  <span className="text-neutral-800">{character.nome} {character.cla ? `(${character.cla}).` : ''}</span>
                </p>
                <p>
                  <strong className="font-bold text-neutral-900">Ocupação e Posição Social:</strong>{' '}
                  <span className="text-neutral-800">{character.ocupacao || character.posicao_social || 'Guerreiro Superior'}</span>
                </p>
                <p>
                  <strong className="font-bold text-neutral-900">Cidadania e Naturalidade:</strong>{' '}
                  <span className="text-neutral-800">{character.cidadania || 'Rëno.'}</span>
                </p>
                <p>
                  <strong className="font-bold text-neutral-900">Seguimento:</strong>{' '}
                  <span className="text-neutral-800">{character.seguimento || 'Conquistador'}</span>
                </p>
                <p>
                  <strong className="font-bold text-neutral-900">Nivelamento:</strong>{' '}
                  <span className="text-neutral-800">
                    {character.nivelamento_alma || `${character.nivel} (${character.nivel * 12 + 8}). Alma: Reihao (${character.nivel * 2 + 7}) 2x`}
                  </span>
                </p>
              </div>

              {/* Right Finances Column */}
              <div className="col-span-4 pl-4 border-l border-neutral-300 space-y-1">
                <h4 className="font-serif font-black text-sm uppercase tracking-wider text-neutral-900 mb-1">
                  FINANÇAS
                </h4>
                <p className="text-neutral-800 font-mono text-xs">- {character.ryo_dourado ?? 20} Ryo Dourado</p>
                <p className="text-neutral-800 font-mono text-xs">- {character.ryo_prateado ?? 0} Ryo Prateado</p>
                <p className="text-neutral-800 font-mono text-xs">- {character.ryo_bronze ?? 0} Ryo Bronze</p>
              </div>

            </div>

            {/* MARCADORES vs ATRIBUTOS SECTION (TABLE WITH BLACK HEADERS) */}
            <div className="grid grid-cols-12 gap-0 border border-black text-xs mt-2">
              
              {/* LEFT: MARCADORES */}
              <div className="col-span-7 border-r border-black">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  MARCADORES
                </div>
                <div className="p-3 space-y-1.5 font-sans leading-relaxed">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">SAÚDE :</span>
                    <span className="font-mono text-neutral-900 font-bold">
                      {character.hp_max} <span className="text-red-700 font-normal">/ {String(hpConsumidos).padStart(2, '0')} consumidos</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">ENERGIA (ÉTER):</span>
                    <span className="font-mono text-neutral-900 font-bold">
                      {character.ether_max} <span className="text-red-700 font-normal">/ {String(etherConsumidos).padStart(2, '0')} consumidos</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">DESTINO (HENAEN):</span>
                    <span className="font-mono text-neutral-900 font-bold">
                      {character.destino_max} <span className="text-red-700 font-normal">/ {String(destinoConsumidos).padStart(2, '0')} consumidos</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">FORTITUDE:</span>
                    <span className="font-mono text-neutral-900">
                      {character.fortitude_max || '29+4 | 33 equipados'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">MOVIMENTO:</span>
                    <span className="font-mono text-neutral-900">
                      {character.movimento_max || '03 | 15 metros'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">ALCANCE:</span>
                    <span className="font-mono text-neutral-900">
                      {character.alcance_max || '03 (6) | 15 (30) metros'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">TÉCNICAS:</span>
                    <span className="font-mono text-neutral-900">
                      {character.tecnicas_max || '02 | 00 equipada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: ATRIBUTOS & FERRAMENTAS */}
              <div className="col-span-5">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  ATRIBUTOS
                </div>
                <div className="p-3 space-y-1.5 font-sans leading-relaxed">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">FORÇA:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-neutral-900">{character.fisico}</span>
                      <span className="font-mono text-red-700 font-bold text-xs tracking-wider">
                        {fisUso1} {fisUso2}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">DESTREZA:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-neutral-900">{String(character.destreza).padStart(2, '0')}</span>
                      <span className="font-mono text-red-700 font-bold text-xs">{desUso}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">COGNIÇÃO:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-neutral-900">{String(character.cognicao).padStart(2, '0')}</span>
                      <span className="font-mono text-red-700 font-bold text-xs">{cogUso}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold uppercase text-neutral-900">CARISMA:</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-neutral-900">{String(character.carisma).padStart(2, '0')}</span>
                      <span className="font-mono text-red-700 font-bold text-xs">{carUso}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline pt-0.5 border-t border-neutral-200">
                    <span className="font-bold uppercase text-neutral-900">PRIMÓRDIO:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-black text-sm text-neutral-900">{character.primordio}</span>
                      {character.primordio_detalhe && (
                        <span className="font-mono text-[10px] text-neutral-500">{character.primordio_detalhe}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right pt-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                      FERRAMENTAS
                    </span>
                  </div>
                </div>
              </div>

            </div>

            
            {/* CONTINUOUS FLOW SECTION (Ataques, Defesa, Dons, Equipamentos) */}
            <div className="space-y-6 text-xs mt-6">
              
              {/* ATAQUES */}
              <div className="border border-black">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  ATAQUES
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_ataques ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlForPrint(character.html_ataques) }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhum ataque registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* DEFESA */}
              <div className="border border-black">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  DEFESA
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_defesa ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlForPrint(character.html_defesa) }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhuma defesa registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* DONS E PODERES */}
              <div className="border border-black">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  DONS E PODERES
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_dons ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlForPrint(character.html_dons) }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhum dom registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* EQUIPAMENTOS */}
              <div className="border border-black">
                <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                  EQUIPAMENTOS
                </div>
                <div className="p-4 leading-relaxed">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_equipamentos ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlForPrint(character.html_equipamentos) }} className="text-neutral-800" />
                    ) : (
                      <p className="text-neutral-500 italic font-mono text-[11px]">Nenhum equipamento registrado.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <div className="text-[9px] text-neutral-400 font-mono text-center pt-4 border-t border-neutral-200 mt-8 mb-4">
            RPG TELUMAK • FICHA OFICIAL SANKÖTEI
          </div>
        </div>
      </div>
    </div>
  );
}
