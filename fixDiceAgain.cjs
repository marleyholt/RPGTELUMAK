const fs = require('fs');

// Patch diceRoller.ts
let code = fs.readFileSync('src/utils/diceRoller.ts', 'utf-8');
if (!code.includes("isMathOnly?: boolean;")) {
  code = code.replace(
    "comment?: string;\n}",
    "comment?: string;\n  isMathOnly?: boolean;\n}"
  );
}

const mathFallback = `  if (results && results.length > 0) {
    return {
      isRoll: true,
      results: results,
      cleanText: trimmed
    };
  }

  // Check for simple math fallback (e.g. r4+2*3)
  const mathMatch = trimmed.match(/^[!\\/]?r\\s*([0-9\\+\\-\\*\\/\\s\\(\\)]+)$/i);
  if (mathMatch) {
    const mathExp = mathMatch[1].trim();
    if (mathExp.length > 0 && /[0-9]/.test(mathExp)) {
      try {
        const total = new Function('return ' + mathExp)();
        if (typeof total === 'number' && !isNaN(total)) {
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
              total: Number(total.toFixed(2)),
              formattedFormula: mathExp,
              formattedDetails: \`\${mathExp} = **\${Number(total.toFixed(2))}**\`
            }],
            cleanText: trimmed
          };
        }
      } catch (e) {}
    }
  }

  return {`;

code = code.replace(
  /if \(results && results\.length > 0\) \{\s*return \{\s*isRoll: true,\s*results: results,\s*cleanText: trimmed\s*\};\s*\}\s*return \{/m,
  mathFallback
);

fs.writeFileSync('src/utils/diceRoller.ts', code);

// Patch DiscordNotebook.tsx
let notebookCode = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf-8');

if (!notebookCode.includes("roll.isMathOnly")) {
  notebookCode = notebookCode.replace(
    /const sortedRolls = \[\.\.\.roll\.rolls\]\.sort\(\(a, b\) => b - a\);/,
    `if (roll.isMathOnly) {
          return \`🧮 **Cálculo Matemático:** \\\`\${roll.formattedFormula}\\\`\\n\` +
                 \`> 🏆 **Resultado = \${roll.total}**\`;
        }
        const sortedRolls = [...roll.rolls].sort((a, b) => b - a);`
  );
  fs.writeFileSync('src/components/DiscordNotebook.tsx', notebookCode);
}
