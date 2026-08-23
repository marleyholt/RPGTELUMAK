import React from 'react';
import { Character } from '../types';
import { Printer, X, Download } from 'lucide-react';

interface PrintableSankoteiSheetProps {
  character: Character;
  isOpen?: boolean;
  onClose?: () => void;
}

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
              Ficha formatada em 4 páginas diagramadas para impressão A4 e download em PDF
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
            page-break-after: always !important;
            break-after: page !important;
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

            {/* COMBATE SECTION */}
            <div className="border border-black text-xs">
              <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                COMBATE
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                
                {/* Column 1: ATAQUES */}
                <div className="space-y-3">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_ataques ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: character.html_ataques }} 
                        className="space-y-1 text-neutral-800"
                      />
                    ) : (
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <p className="font-bold text-neutral-900">ATAQUE (Desarmado): <span className="text-neutral-700 font-normal">81+21d10!10</span> <strong className="float-right text-red-800">DANO: 03</strong></p>
                        <p className="text-neutral-600 pl-2">nuero: ( DANO+3 por 1 p. de Destino )</p>
                        <p className="text-neutral-600 pl-2">palantyr: ( DANO+6 por 2 p. de Destino )</p>
                        <p className="font-bold text-neutral-900 pt-1">ATAQUE (Armas): <span className="text-neutral-700 font-normal">88+21d10!10</span> <strong className="float-right text-red-800">DANO: 13</strong></p>
                        <p className="text-neutral-600 pl-2">nuero: ( DANO+3 por 1 p. de Destino )</p>
                        <p className="text-neutral-600 pl-2">Ragnarok: (BLEED+3, por 2 p. de ENERGIA)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: REDUTORES & DEFESA */}
                <div className="space-y-3 border-l md:border-l-neutral-300 md:pl-4">
                  <div className="rich-content space-y-2 text-xs">
                    {character.html_defesa ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: character.html_defesa }} 
                        className="space-y-1 text-neutral-800"
                      />
                    ) : (
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <p className="font-bold text-neutral-900">REDUTOR (Desarmado): <span className="text-neutral-700 font-normal">78+21d10!10</span> <strong className="float-right text-neutral-900">REDUTOR: 13</strong></p>
                        <p className="font-bold text-neutral-900 pt-1">REDUTOR (Armadura): <span className="text-neutral-700 font-normal">0</span> <strong className="float-right text-neutral-900">REDUTOR: 16</strong></p>
                        <p className="text-neutral-600 pl-2">nuero: ( REDUTOR+3 por 1 p. de Destino )</p>
                        <p className="text-neutral-600 pl-2">nuero-palantyr: ( OU, REDUTOR+6 por 2 p. de Destino )</p>
                        <p className="font-bold text-neutral-900 pt-1">REDUTOR (Emboscada): <span className="text-neutral-700 font-normal">0</span> <strong className="float-right text-neutral-900">REDUTOR: 16</strong></p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>

          <div className="text-[9px] text-neutral-400 font-mono text-center pt-4 border-t border-neutral-200">
            RPG TELUMAK • FICHA OFICIAL SANKÖTEI • PÁGINA 1
          </div>
        </div>


        {/* ========================================================================= */}
        {/* PÁGINA 2: DONS E PODERES, DOMÍNIOS | VIRTUDES, FRAQUEZAS                  */}
        {/* ========================================================================= */}
        <div className="sankotei-page bg-white p-8 sm:p-10 border border-neutral-300 min-h-[297mm] flex flex-col justify-between">
          <div className="space-y-5">
            
            {/* DONS E PODERES */}
            <div className="border border-black">
              <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                DONS E PODERES
              </div>
              <div className="p-4 space-y-3 text-xs leading-relaxed text-neutral-800">
                {character.html_dons ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: character.html_dons }} 
                    className="rich-content space-y-2"
                  />
                ) : (
                  <>
                    <div className="text-center font-bold text-neutral-900 uppercase text-xs">
                      CORPO TITAN
                    </div>
                    <div className="space-y-1.5 text-justify">
                      <p><strong className="text-red-900 uppercase">FORÇA TITÂNICA:</strong> A cada 20 pontos completos no atributo FÍSICO, o personagem receberá ARMAMENTO +1.</p>
                      <p><strong className="text-red-900 uppercase">SAÚDE TITÂNICA:</strong> A cada 20 pontos completos no atributo FÍSICO, o personagem receberá SAÚDE +1.</p>
                      <p><strong className="text-red-900 uppercase">RESISTÊNCIA TITÂNICA:</strong> A cada 20 pontos completos no atributo FÍSICO, o personagem receberá REDUTOR +1.</p>
                      <p><strong className="text-red-900 uppercase">FERRAMENTA TITÂNICA:</strong> A cada 30 pontos completos no atributo FÍSICO, o personagem pode utilizar por dia, uma super ferramenta avançada à sua escolha com bônus de +3d10.</p>
                    </div>

                    <div className="text-center font-bold text-neutral-900 uppercase text-xs pt-2">
                      PODER NUERO
                    </div>
                    <div className="space-y-1.5 text-justify">
                      <p><strong className="text-blue-900 uppercase">AURA HËNAËNY:</strong> permite manifestar e expandir a aura do Aënhën no corpo ou em armamentos (DANO+3 ou REDUTOR+3 por 1 p. de Destino); regenera danos severos (SAÚDE+3 por 1 p. de Destino); e resiste a efeitos [ignora até 3 status ativos por 1 p. de Destino].</p>
                      <p><strong className="text-blue-900 uppercase">METALOGÊNESE:</strong> armas marcadas pelos ritos de Aenys podem ser invocadas ou magnetizadas (não pode ser desarmado nem roubado); durabilidade renovada em troca do sangue (SAÚDE-2 para recuperar arma).</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* DOMÍNIOS | VIRTUDES */}
            <div className="border border-black">
              <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                DOMÍNIOS | VIRTUDES
              </div>
              <div className="p-4 space-y-3 text-xs leading-relaxed text-neutral-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-900 uppercase text-xs">COMBATE GIGANTE:</p>
                    <p><strong className="text-neutral-900">Estágio I)</strong> Estilo desarmado que recebe DEFESA e ATAQUE +1, e +1 para cada 30 pontos em Físico.</p>
                    <p><strong className="text-neutral-900">Estágio II)</strong> Sempre que utiliza SAÚDE, há aumento de +1 de ATAQUE ou DEFESA.</p>
                    <p><strong className="text-neutral-900">Estágio III)</strong> Recebe +1 de FORTITUDE.</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-900 uppercase text-xs">VIGOR GIGANTE:</p>
                    <p><strong className="text-neutral-900">Estágio I)</strong> +3 para atos de esforço prolongado e resistência a dor, veneno, etc.</p>
                    <p><strong className="text-neutral-900">Estágio II)</strong> Bônus de +6 para erguer, empurrar, segurar ou escalar.</p>
                    <p><strong className="text-neutral-900">Estágio III)</strong> Recebe +1 de SAÚDE.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FRAQUEZAS */}
            <div className="border border-black">
              <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1 uppercase tracking-widest text-[11px]">
                FRAQUEZAS
              </div>
              <div className="p-4 space-y-2 text-xs leading-relaxed text-neutral-800">
                <p className="font-bold text-neutral-900 uppercase text-xs">CORPO GIGANTE:</p>
                <p><strong className="text-neutral-900">Estágio I)</strong> PENALIDADE DE -8 de atributo quando em espaços apertados ou pequenos.</p>
                <p><strong className="text-neutral-900">Estágio II)</strong> PENALIDADE DE -12 de combate quando em espaços apertados.</p>
                <p><strong className="text-neutral-900">Estágio III)</strong> ENFRAQUECE EM -2 PONTO DE DESTINO no uso em cavernas ou espaços pequenos.</p>
              </div>
            </div>

          </div>

          <div className="text-[9px] text-neutral-400 font-mono text-center pt-4 border-t border-neutral-200">
            RPG TELUMAK • FICHA OFICIAL SANKÖTEI • PÁGINA 2
          </div>
        </div>


        {/* ========================================================================= */}
        {/* PÁGINAS 3 & 4: EQUIPAMENTOS                                               */}
        {/* ========================================================================= */}
        <div className="sankotei-page bg-white p-8 sm:p-10 border border-neutral-300 min-h-[297mm] flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="border border-black">
              <div className="sankotei-header-ribbon bg-black text-white text-center font-bold font-sans py-1.5 uppercase tracking-widest text-xs">
                EQUIPAMENTOS
              </div>

              <div className="p-4 space-y-4 text-xs leading-relaxed text-neutral-800">
                {character.html_equipamentos ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: character.html_equipamentos }} 
                    className="rich-content space-y-3"
                  />
                ) : (
                  <>
                    <div className="text-center font-bold text-neutral-700 tracking-wider text-xs border-b border-neutral-300 pb-1">
                      ____________________ UTILITÁRIOS ____________________
                    </div>
                    <div className="space-y-2">
                      <p><strong>1. TATUAGEM LENDÁRIA: DO REI COLOSSAL (Peso 0):</strong> +4 FORTITUDE; +2 DESTINO; +4 SAÚDE.</p>
                      <p><strong>2. ELMO PRIMORDIAL: COROA DE ZARENKAI (Peso 5):</strong> REDUTOR +10; REFLETIR DANO na forma de cabeçada até limite de 6 de dano direto.</p>
                      <p><strong>3. PINGENTE PRIMORDIAL: PALANTIR (Peso 5):</strong> Conhecimento da Era Ancestral; Ressonância da Aura (consumo dobrado para efeitos dobrados).</p>
                    </div>

                    <div className="text-center font-bold text-neutral-700 tracking-wider text-xs border-b border-neutral-300 pb-1 pt-3">
                      ____________________ EQUIPAMENTOS EM USO ____________________
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-red-900">MÖGGERGAUNTR: Armadura Ancestral Lendária. (PESO 4).</strong> Defesa Base REDUTOR +4. Defesa especial REDUTOR +4 por 1 p. Destino.</p>
                      <p><strong className="text-red-900">MÖGGERSÚFR: Machado de Duas Mãos Lendário. (PESO 4).</strong> Ataque Base Dano 4. Status de paralisia por 1 p. Energia.</p>
                      <p><strong className="text-red-900">MÖGGENIR: Martelo de Guerra de Uma Mão Lendário. (PESO 3).</strong> Ataque Base Dano 2. Penalidade de Defesa -2 contra escudos.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          <div className="text-[9px] text-neutral-400 font-mono text-center pt-4 border-t border-neutral-200">
            RPG TELUMAK • FICHA OFICIAL SANKÖTEI • PÁGINA 3 / 4
          </div>
        </div>

      </div>

    </div>
  );
}
