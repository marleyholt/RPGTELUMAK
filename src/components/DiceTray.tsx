import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface DiceTrayProps {
  onSendRoll: (htmlContent: string) => void;
}

export interface RollResult {
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  isCrit: boolean;
  isFumble: boolean;
  exploded: boolean;
}

export function parseAndRollExpression(expr: string): RollResult | null {
  const cleanedExpr = expr.replace(/\s+/g, '').toLowerCase();
  const pattern = /^(\d*)d(\d+)(?:!(\d+))?([+-]\d+)?$/;
  const match = cleanedExpr.match(pattern);

  if (!match) return null;

  const qty = parseInt(match[1]) || 1;
  const faces = parseInt(match[2]);
  const explodeOn = match[3] ? parseInt(match[3]) : null;
  const modifier = match[4] ? parseInt(match[4]) : 0;

  const rolls: number[] = [];
  let total = 0;
  let exploded = false;
  let isCrit = false;
  let isFumble = false;

  const rollSingle = (f: number): number => {
    return Math.floor(Math.random() * f) + 1;
  };

  const recursiveRoll = (f: number, expThresh: number | null): number => {
    const r = rollSingle(f);
    rolls.push(r);
    
    let sum = r;
    if (expThresh !== null && r >= expThresh) {
      exploded = true;
      if (rolls.length < 25) {
        sum += recursiveRoll(f, expThresh);
      }
    }
    return sum;
  };

  for (let i = 0; i < qty; i++) {
    total += recursiveRoll(faces, explodeOn);
  }

  if (faces === 20 && qty > 0) {
    if (rolls[0] === 20) isCrit = true;
    if (rolls[0] === 1) isFumble = true;
  }

  return {
    formula: cleanedExpr,
    rolls,
    modifier,
    total: total + modifier,
    isCrit,
    isFumble,
    exploded,
  };
}

export function DiceTray({ onSendRoll }: DiceTrayProps) {
  const [customFormula, setCustomFormula] = useState('');
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = (formula: string) => {
    setIsRolling(true);
    setTimeout(() => {
      const res = parseAndRollExpression(formula);
      if (res) {
        setLastResult(res);
        const html = formatRollToHtml(res);
        onSendRoll(html);
      } else {
        alert('Formato inválido! Use por exemplo: "1d20+5" ou "2d10!9"');
      }
      setIsRolling(false);
    }, 400);
  };

  const formatRollToHtml = (res: RollResult): string => {
    const sign = res.modifier >= 0 ? '+' : '';
    const modStr = res.modifier !== 0 ? ` ${sign}${res.modifier}` : '';
    const rollDetail = `[${res.rolls.join(' + ')}]${modStr}`;
    
    let statusLabel = '';
    if (res.isCrit) {
      statusLabel = `<span class="px-2 py-0.5 text-[9px] font-black text-rose-500 bg-rose-950/20 border border-rose-500/30 uppercase tracking-widest ml-2 animate-pulse">Crítico!</span>`;
    } else if (res.isFumble) {
      statusLabel = `<span class="px-2 py-0.5 text-[9px] font-black text-red-500 bg-red-950/20 border border-red-500/30 uppercase tracking-widest ml-2">Falha Crítica!</span>`;
    } else if (res.exploded) {
      statusLabel = `<span class="px-2 py-0.5 text-[9px] font-black text-orange-500 bg-orange-950/20 border border-orange-500/30 uppercase tracking-widest ml-2">Explosivo!</span>`;
    }

    return `
      <div class="dice-roll-block leading-normal p-1 border-l-2 border-orange-500/60 pl-3">
        <div class="flex flex-wrap items-center text-orange-400 font-sans font-black text-xs uppercase tracking-widest mb-1.5">
          <span>Rolou: <strong class="text-white font-mono bg-[#111111] px-2 py-0.5 border border-white/10 ml-1 select-all">${res.formula}</strong></span>
          ${statusLabel}
        </div>
        <div class="text-[11px] text-white/50 break-all leading-tight mb-2 font-mono">${rollDetail}</div>
        <div class="text-xl font-black text-white uppercase tracking-wider font-sans italic">
          Resultado: <span class="text-orange-500 font-mono text-2xl">${res.total}</span>
        </div>
      </div>
    `;
  };

  const standardDice = [20, 12, 10, 8, 6, 4, 100];

  return (
    <div className="bg-[#080808] border border-white/10 p-5 rounded-none shadow-xl">
      <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 italic">
        <Sparkles className="h-4 w-4 stroke-[3]" />
        Rolador de Dados
      </h3>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-4">
        {standardDice.map(faces => (
          <button
            key={faces}
            onClick={() => handleRoll(`1d${faces}`)}
            disabled={isRolling}
            className="bg-[#0d0d0d] border border-white/10 hover:border-orange-500/50 hover:bg-white/[0.02] text-white/80 font-mono font-black text-center py-2.5 px-1 rounded-none transition uppercase tracking-wider text-xs focus:outline-none"
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
          className="flex-1 bg-black border border-white/10 focus:border-orange-500 focus:outline-none text-white text-xs px-3.5 py-2.5 rounded-none font-mono placeholder-white/20"
          onKeyDown={(e) => e.key === 'Enter' && handleRoll(customFormula)}
        />
        <button
          onClick={() => handleRoll(customFormula)}
          disabled={!customFormula || isRolling}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-white font-black px-5 rounded-none text-xs transition uppercase tracking-widest flex items-center justify-center min-w-[80px]"
        >
          {isRolling ? 'Rolando...' : 'Rolar'}
        </button>
      </div>

      {lastResult && (
        <div className="mt-4 p-4 bg-black/60 border border-white/5 rounded-none text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-black mb-1">Último Resultado Local</p>
          <div className="text-3xl font-black text-orange-500 font-mono tracking-tight">
            {lastResult.total}
          </div>
          <p className="text-[10px] text-white/30 font-mono mt-1.5 w-full truncate">
            {lastResult.formula} ➔ {'[' + lastResult.rolls.join('+') + ']' + (lastResult.modifier ? `${lastResult.modifier >= 0 ? '+' : ''}${lastResult.modifier}` : '')}
          </p>
        </div>
      )}
    </div>
  );
}
