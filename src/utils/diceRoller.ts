/**
 * Parser and roller for Telumak RPG / Rollem dice expressions.
 * Syntax: [mod+|-]xdy[!z] or xdy[!z][+|-mod]
 *
 * Rules:
 *  a = fixed modifier (+ or -)
 *  x = number of dice
 *  y = number of die faces
 *  !z = exploding critical threshold. Whenever a rolled die value >= z, an extra die of the same faces (y) is rolled.
 *       Explosion chains recursively (up to a safety maximum, e.g. 50 rolls).
 *
 * Examples:
 *  4+2d10!9
 *  2d10!9+4
 *  1d20!20
 *  3d6
 *  -2+4d10!8
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
}

// Regex matching [mod+]xdy[!z][+mod] followed by optional comment text
const DICE_COMMAND_REGEX = /^(?:[!\/]r(?:oll)?\s+)?([+-]?\s*\d+\s*)?\+?\s*(\d+)\s*d\s*(\d+)(?:\s*!\s*(\d+))?(?:\s*([+-]\s*\d+))?(?:\s+(.+))?$/i;

export function parseAndRollDice(text: string): DiceRollResult | null {
  const trimmed = text.trim();
  const match = trimmed.match(DICE_COMMAND_REGEX);

  if (!match) {
    return null;
  }

  // match groups:
  // 1: prefix modifier (e.g. "8", "+4", "-2")
  // 2: dice count x (e.g. "2")
  // 3: faces y (e.g. "10")
  // 4: explode threshold !z (e.g. "10")
  // 5: suffix modifier (e.g. "+4", "-2")
  // 6: trailing comment / action name (e.g. "Golpe Final")
  const prefixModStr = match[1];
  const diceCountStr = match[2];
  const facesStr = match[3];
  const explodeStr = match[4];
  const suffixModStr = match[5];
  const commentStr = match[6];

  const diceCount = parseInt(diceCountStr, 10);
  const faces = parseInt(facesStr, 10);

  if (isNaN(diceCount) || diceCount <= 0 || diceCount > 100) return null;
  if (isNaN(faces) || faces <= 1 || faces > 1000) return null;

  let modifier = 0;
  if (prefixModStr) {
    modifier += parseInt(prefixModStr.replace(/\s+/g, ''), 10) || 0;
  }
  if (suffixModStr) {
    modifier += parseInt(suffixModStr.replace(/\s+/g, ''), 10) || 0;
  }

  let explodeThreshold: number | null = null;
  if (explodeStr !== undefined) {
    explodeThreshold = parseInt(explodeStr, 10);
    if (isNaN(explodeThreshold) || explodeThreshold <= 1) {
      explodeThreshold = faces; // default to max face if invalid
    }
  }

  // Perform Rolls
  const rolls: number[] = [];
  let baseRollsCount = 0;
  let explodedRollsCount = 0;
  const maxSafetyRolls = 60;

  // Queue of dice left to roll
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

    // Check explode condition
    if (explodeThreshold !== null && roll >= explodeThreshold) {
      diceToRoll++; // explode! add 1 more die
    }
  }

  const diceSum = rolls.reduce((acc, curr) => acc + curr, 0);
  const total = diceSum + modifier;

  // Build clean representation with critical rolls bolded: 4 + 2d10!9 = 4 + (**9**, 6, **10**, 2) = 31
  let dicePart = `${diceCount}d${faces}${explodeThreshold !== null ? `!${explodeThreshold}` : ''}`;
  
  let formattedFormula = '';
  if (modifier !== 0) {
    formattedFormula = modifier > 0 ? `${modifier} + ${dicePart}` : `${dicePart} - ${Math.abs(modifier)}`;
  } else {
    formattedFormula = dicePart;
  }

  // Sort rolls descending (highest to lowest) for optimal readability
  const sortedRolls = [...rolls].sort((a, b) => b - a);

  // Format rolls with bold markdown for any criticals
  const formattedRolls = sortedRolls.map(roll => {
    const isCritical = (explodeThreshold !== null && roll >= explodeThreshold) || (explodeThreshold === null && faces > 1 && roll === faces);
    return isCritical ? `**${roll}**` : `${roll}`;
  });

  const rollsStr = `(${formattedRolls.join(', ')})`;
  let formattedDetails = '';
  if (modifier !== 0) {
    formattedDetails = modifier > 0 ? `${modifier} + ${rollsStr} = **${total}**` : `${rollsStr} - ${Math.abs(modifier)} = **${total}**`;
  } else {
    formattedDetails = `${rollsStr} = **${total}**`;
  }

  const cleanComment = commentStr ? commentStr.trim().replace(/^[:#-]\s*/, '') : undefined;

  return {
    rawExpression: trimmed,
    modifier,
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
  };
}

/**
 * Checks if a message text contains roll expressions (e.g. standalone lines or /r commands)
 * or if the whole message is a roll expression.
 */
export function extractDiceRollsFromMessage(text: string): { isRoll: boolean; results: DiceRollResult[]; cleanText: string } {
  const trimmed = text.trim();
  
  const singleResult = parseAndRollDice(trimmed);
  if (singleResult) {
    return {
      isRoll: true,
      results: [singleResult],
      cleanText: trimmed
    };
  }

  return {
    isRoll: false,
    results: [],
    cleanText: text
  };
}
