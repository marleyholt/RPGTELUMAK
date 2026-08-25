const fs = require('fs');
let code = fs.readFileSync('src/components/PrintableSankoteiSheet.tsx', 'utf-8');
code = code.replace(
  "import React from 'react';",
  "import React from 'react';\nimport { createPortal } from 'react-dom';"
);
code = code.replace(
  "  return (",
  "  const content = ("
);
code = code.replace(
  "    </div>\n  );\n}",
  "    </div>\n  );\n\n  return createPortal(content, document.body);\n}"
);
fs.writeFileSync('src/components/PrintableSankoteiSheet.tsx', code);
