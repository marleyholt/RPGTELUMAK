import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { parseAndRollDice, DiceRollResult } from '../utils/diceRoller';

interface DiceTrayProps {
  onSendRoll: (htmlContent: string) => void;
}

export function DiceTray({ onSendRoll }: DiceTrayProps) {
  const [customFormula, setCustomFormula] = useState('');
  const [lastResult, setLastResult] = useState<DiceRollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = (formula: string) => {
    setIsRolling(true);
    setTimeout(() => {
      const res = parseAndRollDice(formula);
      if (res && res.length > 0) {
        setLastResult(res[0]); // show first result in preview
        const html = res.map(r => formatRollToHtml(r)).join('<div class="my-2 border-t border-white/5"></div>');
        onSendRoll(html);
      } else {
        alert('Formato inválido! Use por exemplo: "8+2d10!10 Golpe Final", "1d20+5" ou "2d10!9"');
      }
      setIsRolling(false);
    }, 400);
  };

  const formatRollToHtml = (res: DiceRollResult): string => {
    const isCrit = res.explodedRollsCount > 0 || (res.faces === 20 && res.rolls[0] === 20);
    const isFumble = res.faces === 20 && res.rolls[0] === 1;

    let statusLabel = '';
    if (isCrit) {
      statusLabel = `<span class="px-2 py-0.5 text-[9px] font-black text-rose-500 bg-rose-950/20 border border-rose-500/30 uppercase tracking-widest ml-2 animate-pulse">Crítico / Explosivo!</span>`;
    } else if (isFumble) {
      statusLabel = `<span class="px-2 py-0.5 text-[9px] font-black text-red-500 bg-red-950/20 border border-red-500/30 uppercase tracking-widest ml-2">Falha Crítica!</span>`;
    }

    const forSuffix = res.comment ? (res.comment.toLowerCase().startsWith('para ') ? ` ${res.comment}` : ` para ${res.comment}`) : '';

    return `
      <div class="dice-roll-block leading-normal p-1 border-l-2 border-blue-500/60 pl-3">
        <div class="flex flex-wrap items-center text-sky-400 font-sans font-black text-xs uppercase tracking-widest mb-1.5">
          <span>Rolou: <strong class="text-white font-mono bg-[#111111] px-2 py-0.5 border border-white/10 ml-1 select-all">${res.formattedFormula}</strong></span>
          ${statusLabel}
        </div>
        <div class="text-[11px] text-white/50 break-all leading-tight mb-2 font-mono">${res.formattedDetails}</div>
        <div class="text-xl font-black text-white uppercase tracking-wider font-sans italic">
          Resultado Total: <span class="text-sky-400 font-mono text-2xl">${res.total}</span>${forSuffix ? `<span class="text-sm font-normal text-white/70 font-sans ml-1.5">${forSuffix}</span>` : ''}
        </div>
      </div>
    `;
  };

  const standardDice = [20, 12, 10, 8, 6, 4, 100];

  return (
    <div className="bg-[#080808] border border-white/10 p-5 rounded-none shadow-xl">
      <h3 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 italic">
        <Sparkles className="h-4 w-4 stroke-[3]" />
        Rolador de Dados
      </h3>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-4">
        {standardDice.map(faces => (
          <button
            key={faces}
            onClick={() => handleRoll(`1d${faces}`)}
            disabled={isRolling}
            className="bg-[#0d0d0d] border border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02] text-white/80 font-mono font-black text-center py-2.5 px-1 rounded-none transition uppercase tracking-wider text-xs focus:outline-none"
          >
            D{faces}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          placeholder="Ex: 2d10!9 + 5"
          className="flex-1 bg-black border border-white/10 focus:border-blue-500 focus:outline-none text-white text-xs px-3.5 py-2.5 rounded-none font-mono placeholder-white/20"
          onKeyDown={(e) => e.key === 'Enter' && handleRoll(customFormula)}
        />
        <button
          onClick={() => handleRoll(customFormula)}
          disabled={!customFormula || isRolling}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-black px-5 rounded-none text-xs transition uppercase tracking-widest flex items-center justify-center min-w-[80px]"
        >
          {isRolling ? 'Rolando...' : 'Rolar'}
        </button>
      </div>

      {lastResult && (
        <div className="mt-4 p-4 bg-black/60 border border-white/5 rounded-none text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-black mb-1">Último Resultado Local</p>
          <div className="text-3xl font-black text-sky-400 font-mono tracking-tight">
            {lastResult.total}
          </div>
          <p className="text-[10px] text-white/30 font-mono mt-1.5 w-full truncate">
            {lastResult.formattedFormula} ➔ {lastResult.formattedDetails}
          </p>
        </div>
      )}
    </div>
  );
}
