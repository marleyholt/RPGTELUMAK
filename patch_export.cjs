const fs = require('fs');

let code = fs.readFileSync('src/components/DiscordExportModal.tsx', 'utf8');

const oldCode = `      let msgsRef = collection(db, 'discord_notebook_messages');
      let q;
      
      if (selectedChannelId !== 'ALL') {
        q = query(msgsRef, where('channelId', '==', selectedChannelId), orderBy('createdAt', 'asc'));
      } else {
        q = query(msgsRef, orderBy('createdAt', 'asc'));
      }

      const snap = await getDocs(q);
      let allMessages: DiscordNotebookMessage[] = [];
      
      snap.forEach(doc => {
        allMessages.push(Object.assign({ id: doc.id }, doc.data()) as DiscordNotebookMessage);
      });

      // Se ALL channels foram baixados, filtrar apenas pros canais permitidos (channels da props)
      if (selectedChannelId === 'ALL') {
        const allowedIds = new Set(channels.map(c => c.id));
        allMessages = allMessages.filter(m => allowedIds.has(m.channelId));
      }`;

const newCode = `      let msgsRef = collection(db, 'discord_notebook_messages');
      const snap = await getDocs(msgsRef);
      let allMessages: DiscordNotebookMessage[] = [];
      
      snap.forEach(doc => {
        allMessages.push(Object.assign({ id: doc.id }, doc.data()) as DiscordNotebookMessage);
      });

      // Filtrar apenas pros canais permitidos (channels da props)
      const allowedIds = new Set(channels.map(c => c.id));
      allMessages = allMessages.filter(m => allowedIds.has(m.channelId));

      // Se um canal específico foi selecionado
      if (selectedChannelId !== 'ALL') {
        allMessages = allMessages.filter(m => m.channelId === selectedChannelId);
      }
      
      // Ordenar por data
      allMessages.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return timeA - timeB;
      });`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/DiscordExportModal.tsx', code);
console.log('Patched export modal to filter client-side');
