const fs = require('fs');
let code = fs.readFileSync('src/components/DataBackupSystem.tsx', 'utf8');

const target = `      try {
        const notesSnap = await getDocs(collection(db, 'campaign_notes'));
        snapshot.campaign_notes = [];
        notesSnap.forEach(d => snapshot.campaign_notes.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch notes', e);
      }`;
      
const newTarget = `      try {
        const notesSnap = await getDocs(collection(db, 'campaign_notes'));
        snapshot.campaign_notes = [];
        notesSnap.forEach(d => snapshot.campaign_notes.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch notes', e);
      }
      
      try {
        const npcsSnap = await getDocs(collection(db, 'npcs'));
        snapshot.npcs = [];
        npcsSnap.forEach(d => snapshot.npcs.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Could not fetch npcs', e);
      }`;

code = code.replace(target, newTarget);
fs.writeFileSync('src/components/DataBackupSystem.tsx', code);
console.log('DataBackupSystem patched');
