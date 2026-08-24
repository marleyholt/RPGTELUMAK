const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

const regexDiscord = /if \(diceCheck\.isRoll && diceCheck\.results\.length > 0\) \{([\s\S]*?)logEvent\('info'/m;
const newDiscord = `if (diceCheck.isRoll && diceCheck.results.length > 0) {
      const rollsStrArray = diceCheck.results.map(roll => {
        const sortedRolls = [...roll.rolls].sort((a, b) => b - a);
        const formattedRollArray = sortedRolls.map(r => {
          const isCrit = (roll.explodeThreshold !== null && r >= roll.explodeThreshold) || (roll.explodeThreshold === null && roll.faces > 1 && r === roll.faces);
          return isCrit ? \`**\${r}**\` : \`\${r}\`;
        });
        const rollsDisplay = formattedRollArray.join(', ');
        
        let explodeInfo = '';
        if (roll.explodeThreshold !== null) {
          explodeInfo = \` (Críticos >= \${roll.explodeThreshold}\${roll.explodedRollsCount > 0 ? \` • +\${roll.explodedRollsCount} dado(s) extra\` : ''})\`;
        }

        const forSuffix = roll.comment ? (roll.comment.toLowerCase().startsWith('para ') ? \` \${roll.comment}\` : \` para \${roll.comment}\`) : '';
        return \`🎲 **Rolagem:** \\\`\${roll.formattedFormula}\\\`\${explodeInfo}\\n\` +
          \`> **Dados Rolados:** [ \${rollsDisplay} ]\\n\` +
          \`> **Cálculo:** \${roll.formattedDetails}\\n\` +
          \`> 🏆 **Resultado Total = \${roll.total}**\${forSuffix}\`;
      });
      
      finalContent = rollsStrArray.join('\\n\\n');
      
      logEvent('info'`;

code = code.replace(regexDiscord, newDiscord);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
