import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client, GatewayIntentBits } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';

// Helper para carregar a configuração do firebase
const getFirebaseConfig = () => {
  try {
    const rawConfig = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
    const firebaseConfigLocal = JSON.parse(rawConfig);
    
    return {
      apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseConfigLocal.apiKey,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigLocal.authDomain,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigLocal.projectId,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigLocal.storageBucket,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigLocal.messagingSenderId,
      appId: process.env.VITE_FIREBASE_APP_ID || firebaseConfigLocal.appId,
      measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigLocal.measurementId,
    };
  } catch (err) {
    console.error("Falha ao ler firebase-applet-config.json no backend:", err);
    return null;
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Inicializa o Firebase no Backend
  let db: any = null;
  const firebaseConfig = getFirebaseConfig();
  if (firebaseConfig && firebaseConfig.apiKey) {
    try {
      const firebaseApp = initializeApp(firebaseConfig, 'backend-app');
      const auth = getAuth(firebaseApp);
      
      const botEmail = 'discord-bot@system.local';
      const botPassword = 'discord-bot-secure-password-123';
      
      try {
        await signInWithEmailAndPassword(auth, botEmail, botPassword);
        console.log("Bot logado no Firebase Auth");
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, botEmail, botPassword);
          console.log("Usuário do bot criado e logado no Firebase Auth");
        } else {
          console.error("Erro ao autenticar o bot no Firebase", e);
        }
      }

      // Usa a configuração que funciona pra Node
      db = getFirestore(firebaseApp);
    } catch (e) {
      console.error("Erro ao inicializar Firebase no Backend", e);
    }
  }

  // Inicializa o Discord Bot
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  
  let discordClient: Client | null = null;
  
  if (token && channelId) {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    discordClient.on('ready', () => {
      console.log(`Discord Bot logado como ${discordClient?.user?.tag}`);
    });

    // Escutando mensagens do Discord
    discordClient.on('messageCreate', async (message) => {
      // Ignorar mensagens do próprio bot
      if (message.author.bot) return;
      
      // Apenas mensagens do canal configurado
      if (message.channelId !== channelId) return;

      if (db) {
        try {
          const newMessage = {
            remetente: `[Discord] ${message.author.username}`,
            remetente_email: 'discord-bot@system.local',
            destinatario: 'TODOS',
            tipo: 'CHAT',
            conteudo: message.content,
            createdAt: serverTimestamp() // Importante usar o timestamp do server
          };
          
          await addDoc(collection(db, 'messages'), newMessage);
          console.log("Mensagem do Discord enviada para o Firestore");
        } catch (err) {
          console.error("Erro ao salvar mensagem do Discord no Firestore:", err);
        }
      }
    });

    discordClient.login(token).catch(err => {
      console.error("Erro ao logar o bot no Discord:", err);
    });
  } else {
    console.warn("DISCORD_BOT_TOKEN e/ou DISCORD_CHANNEL_ID não configurados no .env");
  }

  // Rota para o frontend enviar mensagem para o Discord
  app.post("/api/discord/send", async (req, res) => {
    const { remetente, conteudo } = req.body;
    
    if (!discordClient || !discordClient.isReady() || !channelId) {
      return res.status(500).json({ error: "Discord Bot não está pronto ou não configurado" });
    }

    try {
      const channel = await discordClient.channels.fetch(channelId);
      if (channel && channel.isTextBased() && 'send' in channel) {
        await channel.send(`**[RPG - ${remetente}]** ${conteudo}`);
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: "Canal do Discord inválido ou não suporta texto" });
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem pro Discord", err);
      return res.status(500).json({ error: "Falha ao enviar" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
