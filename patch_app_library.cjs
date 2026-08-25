const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update NpcManager invocation
code = code.replace(
  "<NpcManager />",
  "<NpcManager characters={characters} />"
);

fs.writeFileSync('src/App.tsx', code);
