const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const target = `      allow update: if isSignedIn() && (
        isGM() || 
        (request.auth.uid == userId && !request.resource.data.keys().hasAny(['role']))
      );`;
const newTarget = `      allow update: if isSignedIn() && (
        isGM() || 
        (request.auth.uid == userId && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']))
      );`;

if(code.includes(target)) {
  code = code.replace(target, newTarget);
  fs.writeFileSync('firestore.rules', code);
  console.log('Patched firestore.rules');
} else {
  console.log('Could not find target in firestore.rules');
}
