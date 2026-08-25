const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf-8');
code = code.replace(
  "const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || firebaseConfigLocal.oAuthClientId || '';",
  "const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || firebaseConfigLocal.oAuthClientId || '80100152503-o4al8geedo0jhm8hfjq5h36it3e3muve.apps.googleusercontent.com';"
);
fs.writeFileSync('src/main.tsx', code);
