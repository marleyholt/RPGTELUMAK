const fs = require('fs');
let code = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf8');
code = code.replace('  public state: State;\n  public props: Props;', '');
fs.writeFileSync('src/components/ErrorBoundary.tsx', code);
