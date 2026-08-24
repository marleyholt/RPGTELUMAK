const fs = require('fs');
let code = fs.readFileSync('src/utils/diceRoller.ts', 'utf8');

// I will just overwrite the file from scratch to be safe.
const newCode = `/**
 * Parser and roller for Telumak RPG / Rollem dice expressions.
 * Syntax: [mod+|-]xdy[!z] or xdy[!z][+|-mod]
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

const DICE_COMMAND_REGEX = /^(?:[!\\/]r(?:oll)?\\s+)?(?:(\\d+)\\s*#\\s*)?([+-]?\\s*\\d+\\s*)?\\+?\\s*(\\d+)\\s*d\\s*(\\d+)(?:\\s*!\\s*(\\d+))?(?:\\s*([+-]\\s*\\d+))?(?:\\s+(.+))?$/i;

export function parseAndRollDice(text: string): DiceRollResult[] | null {
  const trimmed = text.trim();
  const match = trimmed.match(DICE_COMMAND_REGEX);
  if (!match) {
    return null;
  }

  const repsStr = match[1];
  const prefixModStr = match[2];
  const diceCountStr = match[3];
  const facesStr = match[4];
  const explodeStr = match[5];
  const suffixModStr = match[6];
  const commentStr = match[7];

  const repetitions = repsStr ? parseInt(repsStr, 10) : 1;
  const diceCount = parseInt(diceCountStr, 10);
  const faces = parseInt(facesStr, 10);

  if (isNaN(diceCount) || diceCount <= 0 || diceCount > 100) return null;
  if (isNaN(faces) || faces <= 1 || faces > 1000) return null;
  if (isNaN(repetitions) || repetitions <= 0 || repetitions > 20) return null;

  let modifier = 0;
  if (prefixModStr) {
    modifier += parseInt(prefixModStr.replace(/\\s+/g, ''), 10) || 0;
  }
  if (suffixModStr) {
    modifier += parseInt(suffixModStr.replace(/\\s+/g, ''), 10) || 0;
  }

  let explodeThreshold: number | null = null;
  if (explodeStr !== undefined) {
    explodeThreshold = parseInt(explodeStr, 10);
    if (isNaN(explodeThreshold) || explodeThreshold <= 1) {
      explodeThreshold = faces;
    }
  }

  const results: DiceRollResult[] = [];

  for (let i = 0; i < repetitions; i++) {
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
    const total = diceSum + modifier;

    let dicePart = \`\${diceCount}d\${faces}\${explodeThreshold !== null ? \`!\${explodeThreshold}\` : ''}\`;
    
    let formattedFormula = '';
    if (modifier !== 0) {
      formattedFormula = modifier > 0 ? \`\${modifier} + \${dicePart}\` : \`\${dicePart} - \${Math.abs(modifier)}\`;
    } else {
      formattedFormula = dicePart;
    }

    const sortedRolls = [...rolls].sort((a, b) => b - a);

    const formattedRolls = sortedRolls.map(roll => {
      const isCritical = (explodeThreshold !== null && roll >= explodeThreshold) || (explodeThreshold === null && faces > 1 && roll === faces);
      return isCritical ? \`**\${roll}**\` : \`\${roll}\`;
    });

    const rollsStr = \`(\${formattedRolls.join(', ')})\`;

    let formattedDetails = '';
    if (modifier !== 0) {
      formattedDetails = modifier > 0 ? \`\${modifier} + \${rollsStr} = **\${total}**\` : \`\${rollsStr} - \${Math.abs(modifier)} = **\${total}**\`;
    } else {
      formattedDetails = \`\${rollsStr} = **\${total}**\`;
    }

    const cleanComment = commentStr ? commentStr.trim().replace(/^[:#-]\\s*/, '') : undefined;

    results.push({
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
    });
  }

  return results;
}

export function extractDiceRollsFromMessage(text: string): { isRoll: boolean; results: DiceRollResult[]; cleanText: string } {
  const trimmed = text.trim();
  const results = parseAndRollDice(trimmed);
  if (results && results.length > 0) {
    return {
      isRoll: true,
      results: results,
      cleanText: trimmed
    };
  }
  return {
    isRoll: false,
    results: [],
    cleanText: text
  };
}
`;
fs.writeFileSync('src/utils/diceRoller.ts', newCode);
