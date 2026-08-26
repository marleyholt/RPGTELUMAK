/**
 * Parser and roller for Telumak RPG / Rollem dice expressions.
 * Supports:
 * - Complex prefix & suffix math expressions: e.g. 2+70-15+10d10!10 or 10+2d10!9-3
 * - Math-only expressions with comments: e.g. r2+4+4 de Dano -> Result = 10 de Dano
 * - Repetitions: e.g. 3# 2+10d10!10
 * - Optional command triggers: !r, /r, /roll, r
 */

export interface DiceRollResult {
  rawExpression: string;
  modifier: number;
  diceCount: number;
  faces: number;
  explodeThreshold: number | null;
  rolls: number[]; // All rolls including exploding dice
  baseRollsCount: number;
  explodedRollsCount: number;
  diceSum: number;
  total: number;
  formattedFormula: string;
  formattedDetails: string;
  comment?: string;
  isMathOnly?: boolean;
}

/**
 * Safely evaluates a pure mathematical expression string containing numbers and operators.
 * Returns null if invalid or unsafe.
 */
export function safeEvalMath(expr: string): number | null {
  const clean = expr.trim().replace(/\s+/g, '');
  if (!clean) return null;
  // Must only contain digits, operators +, -, *, /, %, (, ), .
  if (!/^[0-9+\-*/().%]+$/.test(clean)) return null;
  // Must contain at least one digit
  if (!/[0-9]/.test(clean)) return null;

  try {
    const fn = new Function(`return (${clean})`);
    const val = fn();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return Number(val.toFixed(2));
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function parseAndRollDice(text: string): DiceRollResult[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Check for repetition prefix: e.g. "3# 2+10d10!10"
  let workingText = trimmed;
  let repetitions = 1;
  const repMatch = workingText.match(/^(\d+)\s*#\s*(.+)$/);
  if (repMatch) {
    const r = parseInt(repMatch[1], 10);
    if (r > 0 && r <= 20) {
      repetitions = r;
      workingText = repMatch[2].trim();
    }
  }

  // 2. Strip optional command prefix: e.g. "!r ", "/r ", "/roll ", "r "
  const cmdMatch = workingText.match(/^(?:[!\/]?r(?:oll)?\s+)(.+)$/i);
  if (cmdMatch) {
    workingText = cmdMatch[1].trim();
  }

  // 3. Locate the dice specification: (\d+)d(\d+)(?:!(\d+))?
  // We match the dice part in the string, while allowing complex math before and after.
  const diceRegex = /\b(\d+)\s*d\s*(\d+)(?:\s*!\s*(\d+))?\b/i;
  const match = workingText.match(diceRegex);

  if (!match || match.index === undefined) {
    return null;
  }

  const diceCount = parseInt(match[1], 10);
  const faces = parseInt(match[2], 10);
  const explodeStr = match[3];

  if (isNaN(diceCount) || diceCount <= 0 || diceCount > 100) return null;
  if (isNaN(faces) || faces <= 1 || faces > 1000) return null;

  let explodeThreshold: number | null = null;
  if (explodeStr !== undefined) {
    explodeThreshold = parseInt(explodeStr, 10);
    if (isNaN(explodeThreshold) || explodeThreshold <= 1) {
      explodeThreshold = faces;
    }
  }

  const diceStartIndex = match.index;
  const diceEndIndex = diceStartIndex + match[0].length;

  const rawBefore = workingText.substring(0, diceStartIndex).trim();
  const rawAfter = workingText.substring(diceEndIndex).trim();

  // Parse prefix math: e.g. "2+70-15+" or "4+" or "10-" or empty
  let prefixMathStr = rawBefore;
  let prefixTrailingOp = '';
  if (/[+\-*/]$/.test(prefixMathStr)) {
    prefixTrailingOp = prefixMathStr.slice(-1);
    prefixMathStr = prefixMathStr.slice(0, -1).trim();
  }

  let prefixModifier = 0;
  let hasPrefixMath = false;
  if (prefixMathStr) {
    const val = safeEvalMath(prefixMathStr);
    if (val !== null) {
      prefixModifier = val;
      hasPrefixMath = true;
    } else {
      // If prefix is not valid math, then this might not be a valid dice roll formula
      return null;
    }
  }

  // Parse suffix: it may contain math and/or trailing comment text
  // e.g. "+5-2 de Dano" or "+ 10" or " de Dano"
  let suffixModifier = 0;
  let hasSuffixMath = false;
  let commentStr = '';
  let suffixMathExpr = '';

  if (rawAfter) {
    // Try to separate leading math expression from comment text
    // A suffix math begins with + or - or * or /
    const suffixPartsMatch = rawAfter.match(/^([+\-*/]\s*[\d\s+\-*/().%]+)(.*)$/);
    if (suffixPartsMatch) {
      const candidateMath = suffixPartsMatch[1].trim();
      const candidateComment = suffixPartsMatch[2].trim();
      const val = safeEvalMath(candidateMath);
      if (val !== null) {
        suffixModifier = val;
        hasSuffixMath = true;
        suffixMathExpr = candidateMath;
        commentStr = candidateComment;
      } else {
        commentStr = rawAfter;
      }
    } else {
      commentStr = rawAfter;
    }
  }

  const totalModifier = prefixModifier + suffixModifier;
  const cleanComment = commentStr ? commentStr.trim().replace(/^[:#-]\s*/, '') : undefined;

  const results: DiceRollResult[] = [];

  for (let rep = 0; rep < repetitions; rep++) {
    const rolls: number[] = [];
    let baseRollsCount = 0;
    let explodedRollsCount = 0;
    const maxSafetyRolls = 60;

    let diceToRoll = diceCount;
    while (diceToRoll > 0 && rolls.length < maxSafetyRolls) {
      diceToRoll--;
      const roll = Math.floor(Math.random() * faces) + 1;
      rolls.push(roll);

      if (rolls.length <= diceCount) {
        baseRollsCount++;
      } else {
        explodedRollsCount++;
      }

      if (explodeThreshold !== null && roll >= explodeThreshold) {
        diceToRoll++;
      }
    }

    const diceSum = rolls.reduce((acc, curr) => acc + curr, 0);
    const total = Number((diceSum + totalModifier).toFixed(2));

    const dicePart = `${diceCount}d${faces}${explodeThreshold !== null ? `!${explodeThreshold}` : ''}`;
    
    // Build human-friendly formatted formula
    let formattedFormula = '';
    if (hasPrefixMath) {
      formattedFormula = `${prefixMathStr} + ${dicePart}`;
      if (hasSuffixMath) {
        formattedFormula += ` ${suffixMathExpr}`;
      }
    } else if (hasSuffixMath) {
      formattedFormula = `${dicePart} ${suffixMathExpr}`;
    } else if (totalModifier !== 0) {
      formattedFormula = totalModifier > 0 ? `${totalModifier} + ${dicePart}` : `${dicePart} - ${Math.abs(totalModifier)}`;
    } else {
      formattedFormula = dicePart;
    }

    const sortedRolls = [...rolls].sort((a, b) => b - a);
    const formattedRolls = sortedRolls.map(roll => {
      const isCritical = (explodeThreshold !== null && roll >= explodeThreshold) || (explodeThreshold === null && faces > 1 && roll === faces);
      return isCritical ? `**${roll}**` : `${roll}`;
    });

    const rollsStr = `[ ${formattedRolls.join(', ')} ]`;

    let formattedDetails = '';
    if (hasPrefixMath && hasSuffixMath) {
      formattedDetails = `(${prefixMathStr} = ${prefixModifier}) + ${rollsStr} + (${suffixMathExpr} = ${suffixModifier}) = **${total}**`;
    } else if (hasPrefixMath) {
      formattedDetails = `${prefixMathStr.includes('+') || prefixMathStr.includes('-') ? `(${prefixMathStr} = ${prefixModifier})` : prefixModifier} + ${rollsStr} = **${total}**`;
    } else if (hasSuffixMath) {
      formattedDetails = `${rollsStr} + ${suffixMathExpr} = **${total}**`;
    } else if (totalModifier !== 0) {
      formattedDetails = totalModifier > 0 ? `${totalModifier} + ${rollsStr} = **${total}**` : `${rollsStr} - ${Math.abs(totalModifier)} = **${total}**`;
    } else {
      formattedDetails = `${rollsStr} = **${total}**`;
    }

    results.push({
      rawExpression: trimmed,
      modifier: totalModifier,
      diceCount,
      faces,
      explodeThreshold,
      rolls,
      baseRollsCount,
      explodedRollsCount,
      diceSum,
      total,
      formattedFormula,
      formattedDetails,
      comment: cleanComment
    });
  }

  return results;
}

export function extractDiceRollsFromMessage(text: string): { isRoll: boolean; results: DiceRollResult[]; cleanText: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isRoll: false, results: [], cleanText: text };
  }

  // 1. Try standard / complex dice roll parser
  const diceResults = parseAndRollDice(trimmed);
  if (diceResults && diceResults.length > 0) {
    return {
      isRoll: true,
      results: diceResults,
      cleanText: trimmed
    };
  }

  // 2. Check for math-only expression with optional comment (e.g. "r2+4+4 de Dano", "!r 50+20", "r 10*5+2 de XP")
  // Matches: optional "!r", "/r", or "r" at start, followed by math expression, followed by optional trailing text/comment
  const mathWithCommentMatch = trimmed.match(/^(?:[!\/]?r(?:oll)?\s*|\s*r\s*)([0-9\+\-\*\/\s\(\)\.%]+)(.*)$/i);
  if (mathWithCommentMatch) {
    const candidateMath = mathWithCommentMatch[1].trim();
    const candidateComment = mathWithCommentMatch[2].trim();

    if (candidateMath.length > 0 && /[0-9]/.test(candidateMath)) {
      const val = safeEvalMath(candidateMath);
      if (val !== null) {
        const cleanComment = candidateComment ? candidateComment.replace(/^[:#-]\s*/, '').trim() : undefined;
        return {
          isRoll: true,
          results: [{
            isMathOnly: true,
            rawExpression: trimmed,
            modifier: 0,
            diceCount: 0,
            faces: 0,
            explodeThreshold: null,
            rolls: [],
            baseRollsCount: 0,
            explodedRollsCount: 0,
            diceSum: 0,
            total: val,
            formattedFormula: candidateMath,
            formattedDetails: `${candidateMath} = **${val}**`,
            comment: cleanComment
          }],
          cleanText: trimmed
        };
      }
    }
  }

  return {
    isRoll: false,
    results: [],
    cleanText: text
  };
}

