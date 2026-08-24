const fs = require('fs');
let code = fs.readFileSync('src/components/DiscordNotebook.tsx', 'utf8');

code = code.replace(/logEvent\('info', \`Rolagem de dados executada: \$\{roll\.formattedFormula\} = \$\{roll\.total\}\`, \{\s*autor: senderName,\s*formula: roll\.formattedFormula,\s*dados: roll\.rolls,\s*total: roll\.total\s*\}\);/m, 
`const firstRoll = diceCheck.results[0];
      logEvent('info', \`Rolagem de dados executada: \$\{firstRoll.formattedFormula\} = \$\{firstRoll.total\} \$\{diceCheck.results.length > 1 ? '(e outras)' : ''\}\`, {
        autor: senderName,
        formula: firstRoll.formattedFormula,
        dados: firstRoll.rolls,
        total: firstRoll.total,
        totalRolagens: diceCheck.results.length
      });`);
fs.writeFileSync('src/components/DiscordNotebook.tsx', code);
