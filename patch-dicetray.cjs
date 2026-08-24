const fs = require('fs');
let code = fs.readFileSync('src/components/DiceTray.tsx', 'utf8');

const regex = /const res = parseAndRollDice\(formula\);\s*if \(res\) \{\s*setLastResult\(res\);\s*const html = formatRollToHtml\(res\);\s*onSendRoll\(html\);\s*\} else \{/m;
const newCode = `const res = parseAndRollDice(formula);
      if (res && res.length > 0) {
        setLastResult(res[0]); // show first result in preview
        const html = res.map(r => formatRollToHtml(r)).join('<div class="my-2 border-t border-white/5"></div>');
        onSendRoll(html);
      } else {`;
code = code.replace(regex, newCode);
fs.writeFileSync('src/components/DiceTray.tsx', code);
