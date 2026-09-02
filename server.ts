import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
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
      firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigLocal.firestoreDatabaseId,
    };
  } catch (err) {
    console.error("Falha ao ler firebase-applet-config.json no backend:", err);
    return null;
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  const PORT = Number(process.env.PORT) || 3000;

  // Accept larger payloads for base64 PDF and image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static assets from public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

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
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
          try {
            await createUserWithEmailAndPassword(auth, botEmail, botPassword);
            console.log("Usuário do bot criado e logado no Firebase Auth");
          } catch (createErr) {
            console.error("Erro ao criar usuário do bot no Firebase:", createErr);
          }
        } else {
          console.error("Erro ao autenticar o bot no Firebase", e);
        }
      }

      db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);
      console.log(`[FIREBASE BACKEND] Firestore conectado no banco: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
    } catch (e) {
      console.error("Erro ao inicializar Firebase no Backend", e);
    }
  }

  // Inicializa o Discord Bot
  const token = process.env.DISCORD_BOT_TOKEN;
  const defaultChannelId = process.env.DISCORD_CHANNEL_ID;
  
  let discordClient: Client | null = null;
  let botStatusMessage: string = 'Iniciando...';
  let botLastError: string | null = null;

  // Cache in-memory para deduplicar eventos de mensagens recebidas do Discord
  const processedDiscordMsgIds = new Set<string>();

  let activeBridgeUnsub1: (() => void) | null = null;
  let activeBridgeUnsub2: (() => void) | null = null;

  async function initOrRestartDiscordBot() {
    const activeToken = process.env.DISCORD_BOT_TOKEN || token;
    if (!activeToken) {
      botStatusMessage = 'Token não configurado no .env (DISCORD_BOT_TOKEN ausente)';
      console.warn("[DISCORD BOT] " + botStatusMessage);
      return { success: false, message: botStatusMessage };
    }

    try {
      if (discordClient) {
        console.log("[DISCORD BOT] Destruindo cliente anterior para reinicialização...");
        try {
          await discordClient.destroy();
        } catch (destroyErr) {
          console.warn("[DISCORD BOT] Aviso ao encerrar cliente anterior:", destroyErr);
        }
        discordClient = null;
      }

      discordClient = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      discordClient.on('ready', () => {
        botStatusMessage = `Online e conectado como ${discordClient?.user?.tag}`;
        botLastError = null;
        console.log(`[DISCORD BOT] ${botStatusMessage}`);
        if (db) {
          setupFirestoreToDiscordBridge(db, discordClient, defaultChannelId);
        }
      });

      discordClient.on('error', (err) => {
        botLastError = err?.message || 'Erro de conexão no Discord';
        console.error("[DISCORD BOT CLIENT ERROR]:", err);
      });

      // Escutando mensagens do Discord de QUALQUER canal ao qual o bot tem acesso
      discordClient.on('messageCreate', async (message) => {
        // Ignorar mensagens do próprio bot
        if (message.author.bot) return;

        // Deduplicação in-memory contra re-processamento do mesmo snowflake do Discord
        if (processedDiscordMsgIds.has(message.id)) {
          return;
        }
        processedDiscordMsgIds.add(message.id);
        setTimeout(() => processedDiscordMsgIds.delete(message.id), 60000);

        console.log(`[DISCORD -> BACKEND] Mensagem recebida no canal ${message.channelId} de ${message.author.username}: "${message.content}"`);

        if (db) {
          try {
            const attachments = message.attachments ? Array.from(message.attachments.values()).map(att => att.url) : [];
            
            // 1. Salva na coleção do NOTEBOOK do Discord com ID determinístico para evitar duplicatas
            const docId = `discord_${message.id}`;
            const chanName = ('name' in message.channel && typeof (message.channel as any).name === 'string') ? (message.channel as any).name : '';
            const notebookDoc: any = {
              channelId: message.channelId,
              channelName: chanName,
              discordMessageId: message.id,
              authorName: message.member?.displayName || message.author.globalName || message.author.username,
              authorAvatar: message.author.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
              authorEmail: 'discord-bot@system.local',
              content: message.content || '',
              isFromDiscord: true,
              pinned: false,
              createdAt: serverTimestamp()
            };

            if (attachments.length > 0) {
              notebookDoc.attachments = attachments;
            }

            await setDoc(doc(db, 'discord_notebook_messages', docId), notebookDoc, { merge: true });
            console.log(`[DISCORD -> FIRESTORE] Mensagem gravada/atualizada com sucesso! Doc ID: ${docId} no canal ${message.channelId}`);

            // 2. Se for o canal principal/padrão, salva também no chat rápido de jogo (usando ID determinístico para evitar duplicatas)
            if (defaultChannelId && message.channelId === defaultChannelId) {
              const chatMsg = {
                remetente: `[Discord] ${message.author.username}`,
                remetente_email: 'discord-bot@system.local',
                destinatario: 'TODOS',
                tipo: 'CHAT',
                conteudo: message.content || '',
                createdAt: serverTimestamp()
              };
              await setDoc(doc(db, 'messages', `discord_${message.id}`), chatMsg, { merge: true });
            }
          } catch (err: any) {
            console.error("[DISCORD -> FIRESTORE] Erro ao salvar mensagem do Discord no Firestore:", err?.message || err);
          }
        } else {
          console.warn("[DISCORD -> FIRESTORE] db do Firestore não está inicializado no backend.");
        }
      });

      // Escutando edições de mensagens no Discord
      discordClient.on('messageUpdate', async (_oldMsg, newMsg) => {
        try {
          if (newMsg.author?.bot) return;
          if (!newMsg.content) return;

          console.log(`[DISCORD -> BACKEND] Mensagem editada no canal ${newMsg.channelId} (ID: ${newMsg.id})`);

          if (db) {
            const q = query(
              collection(db, 'discord_notebook_messages'),
              where('discordMessageId', '==', newMsg.id)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              for (const docSnap of snap.docs) {
                await updateDoc(doc(db, 'discord_notebook_messages', docSnap.id), {
                  content: newMsg.content,
                  editedAt: serverTimestamp()
                });
              }
              console.log(`[DISCORD -> FIRESTORE] Mensagem do Discord sincronizada após edição!`);
            }
          }
        } catch (err: any) {
          console.warn("[DISCORD -> FIRESTORE] Erro ao sincronizar edição feita no Discord:", err?.message || err);
        }
      });

      await discordClient.login(activeToken);
      botStatusMessage = `Autenticado no Discord. Conectando Gateway...`;
      return { success: true, message: botStatusMessage };
    } catch (err: any) {
      botLastError = err?.message || 'Falha ao autenticar no Discord';
      botStatusMessage = `Erro: ${botLastError}`;
      console.error("[DISCORD BOT] Erro ao inicializar bot no Discord:", err);
      return { success: false, error: botLastError };
    }
  }

  // Inicialização inicial
  if (token) {
    initOrRestartDiscordBot();
  } else {
    botStatusMessage = 'DISCORD_BOT_TOKEN não configurado no .env';
    console.warn("[DISCORD BOT] " + botStatusMessage);
  }

  // Função da Ponte Bidirecional Firestore <-> Discord
  function setupFirestoreToDiscordBridge(dbInstance: any, client: Client, defaultChanId?: string) {
    if (!dbInstance || !client) return;

    if (activeBridgeUnsub1) {
      try { activeBridgeUnsub1(); } catch {}
      activeBridgeUnsub1 = null;
    }
    if (activeBridgeUnsub2) {
      try { activeBridgeUnsub2(); } catch {}
      activeBridgeUnsub2 = null;
    }

    console.log("[FIRESTORE BRIDGE] Inicializando ponte bidirecional Firestore <-> Discord...");

    const inFlightMessages = new Set<string>();

    // 1. Escuta novas mensagens no discord_notebook_messages criadas no Portal
    activeBridgeUnsub1 = onSnapshot(
      query(
        collection(dbInstance, 'discord_notebook_messages'),
        where('isFromDiscord', '==', false)
      ),
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === 'added' || change.type === 'modified') {
            const docId = change.doc.id;
            const data = change.doc.data();

            // Mensagem já enviada para o Discord ou em processo de envio
            if (data.discordMessageId || data.discordSynced || inFlightMessages.has(docId)) {
              continue;
            }

            // Descobre o ID do canal do Discord
            let targetDiscordChannelId = data.discordTargetId;
            if (!targetDiscordChannelId && data.channelId && /^\d{17,20}$/.test(data.channelId)) {
              targetDiscordChannelId = data.channelId;
            }

            if (!targetDiscordChannelId && data.channelId) {
              try {
                const chDoc = await getDoc(doc(dbInstance, 'discord_channels', data.channelId));
                if (chDoc.exists() && chDoc.data()?.discordChannelId) {
                  targetDiscordChannelId = chDoc.data()?.discordChannelId;
                }
              } catch (err) {
                console.warn("[FIRESTORE BRIDGE] Erro ao buscar canal vinculado em discord_channels:", err);
              }
            }

            if (!targetDiscordChannelId) {
              // Canal puramente local no Firestore
              continue;
            }

            inFlightMessages.add(docId);

            try {
              if (!client.isReady()) {
                inFlightMessages.delete(docId);
                continue;
              }

              const channel = await client.channels.fetch(targetDiscordChannelId).catch(() => null);
              if (channel && channel.isTextBased() && 'send' in channel) {
                const sendOptions: any = {};
                const sender = data.authorName || 'Jogador';
                sendOptions.content = `**[${sender}]**\n${data.content || ''}`;

                // Lista de anexos unificada
                const allAtts: string[] = [];
                if (Array.isArray(data.attachments)) {
                  allAtts.push(...data.attachments.filter(Boolean));
                } else if (data.attachment && typeof data.attachment === 'string') {
                  allAtts.push(data.attachment);
                }

                const filesToSend: AttachmentBuilder[] = [];
                let fileIdx = 1;
                for (const att of allAtts) {
                  if (typeof att === 'string' && att.startsWith('data:image/')) {
                    const base64Data = att.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const rawExt = att.substring(att.indexOf('/') + 1, att.indexOf(';')) || 'png';
                    const cleanExt = rawExt.replace('+xml', '').replace('jpeg', 'jpg');
                    filesToSend.push(new AttachmentBuilder(buffer, { name: `anexo_${Date.now()}_${fileIdx}.${cleanExt}` }));
                    fileIdx++;
                  } else if (typeof att === 'string' && (att.startsWith('http://') || att.startsWith('https://'))) {
                    filesToSend.push(new AttachmentBuilder(att, { name: `anexo_${Date.now()}_${fileIdx}.png` }));
                    fileIdx++;
                  }
                }

                if (filesToSend.length > 0) {
                  sendOptions.files = filesToSend.slice(0, 10);
                }

                const sentMsg = await channel.send(sendOptions);
                console.log(`[PORTAL -> FIRESTORE -> DISCORD] Mensagem enviada para #${channel.name || targetDiscordChannelId}! ID Discord: ${sentMsg.id}`);

                await updateDoc(doc(dbInstance, 'discord_notebook_messages', docId), {
                  discordMessageId: sentMsg.id,
                  discordSynced: true,
                  discordChannelId: targetDiscordChannelId
                });
              } else {
                console.warn(`[PORTAL -> FIRESTORE -> DISCORD] Canal ${targetDiscordChannelId} não encontrado no Discord ou sem permissão de envio.`);
              }
            } catch (err: any) {
              console.error("[PORTAL -> FIRESTORE -> DISCORD] Erro ao enviar mensagem para o Discord:", err?.message || err);
            } finally {
              setTimeout(() => {
                inFlightMessages.delete(docId);
              }, 5000);
            }
          }
        }
      },
      (err) => {
        console.error("[FIRESTORE BRIDGE] Erro no listener de discord_notebook_messages:", err);
      }
    );

    // 2. Escuta mensagens do chat RPG de jogo (coleção 'messages') para o canal padrão do Discord
    if (defaultChanId) {
      activeBridgeUnsub2 = onSnapshot(
        query(
          collection(dbInstance, 'messages'),
          where('tipo', '==', 'CHAT')
        ),
        async (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'added') {
              const docId = change.doc.id;
              const data = change.doc.data();

              if (data.discordSynced || inFlightMessages.has(docId) || (data.remetente && String(data.remetente).startsWith('[Discord]'))) {
                continue;
              }

              inFlightMessages.add(docId);

              try {
                if (!client.isReady()) {
                  inFlightMessages.delete(docId);
                  continue;
                }

                const channel = await client.channels.fetch(defaultChanId).catch(() => null);
                if (channel && channel.isTextBased() && 'send' in channel) {
                  await channel.send(`**[RPG - ${data.remetente || 'Jogador'}]** ${data.conteudo || ''}`);
                  console.log(`[CHAT RPG -> DISCORD] Mensagem enviada para o canal padrão do Discord!`);

                  await updateDoc(doc(dbInstance, 'messages', docId), {
                    discordSynced: true
                  });
                }
              } catch (err: any) {
                console.error("[CHAT RPG -> DISCORD] Erro ao enviar mensagem:", err?.message || err);
              } finally {
                setTimeout(() => {
                  inFlightMessages.delete(docId);
                }, 5000);
              }
            }
          }
        },
        (err) => {
          console.error("[FIRESTORE BRIDGE] Erro no listener de messages:", err);
        }
      );
    }
  }

  // Rota para checar status detalhado do Bot do Discord
  app.get("/api/discord/status", (req, res) => {
    const isReady = !!(discordClient && discordClient.isReady());
    const isDbReady = !!db;
    
    return res.json({
      online: isReady,
      status: botStatusMessage,
      error: botLastError,
      userTag: discordClient?.user?.tag || null,
      userId: discordClient?.user?.id || null,
      guildsCount: discordClient?.guilds?.cache?.size || 0,
      ping: discordClient?.ws?.ping ?? null,
      dbConnected: isDbReady,
      hasToken: !!(process.env.DISCORD_BOT_TOKEN || token),
      hasDefaultChannel: !!defaultChannelId
    });
  });

  // Rota para forçar o início / reconexão do Bot do Discord sob demanda
  app.post("/api/discord/restart", async (req, res) => {
    console.log("[API DISCORD] Requisição de reinício forçado do Bot do Discord recebida...");
    try {
      const result = await initOrRestartDiscordBot();
      if (result.success) {
        return res.json({
          success: true,
          message: "Comando de inicialização enviado ao Discord!",
          status: botStatusMessage,
          online: !!(discordClient && discordClient.isReady()),
          userTag: discordClient?.user?.tag || null
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.message || result.error || "Falha ao iniciar o bot",
          error: result.error
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao reiniciar o bot"
      });
    }
  });

  // Rota para consultar dados do servidor / canais do Discord
  app.get("/api/discord/server-info", async (req, res) => {
    const { guildId, channelId } = req.query;

    if (!discordClient || !discordClient.isReady()) {
      return res.json({ 
        online: false, 
        guildName: null, 
        message: "Discord Bot não está conectado ou token ausente" 
      });
    }

    try {
      let guild: any = null;
      if (guildId && typeof guildId === 'string') {
        guild = await discordClient.guilds.fetch(guildId).catch(() => null);
      }
      
      if (!guild && channelId && typeof channelId === 'string') {
        const chan = await discordClient.channels.fetch(channelId).catch(() => null);
        if (chan && 'guild' in chan) {
          guild = chan.guild;
        }
      }

      if (!guild) {
        guild = discordClient.guilds.cache.first();
      }

      if (guild) {
        return res.json({
          online: true,
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.iconURL() || null,
          memberCount: guild.memberCount
        });
      }

      return res.json({ online: true, guildName: null, message: "Nenhum servidor encontrado no bot" });
    } catch (e: any) {
      return res.json({ online: false, error: e.message });
    }
  });

  // Rota para buscar e validar um Canal específico do Discord por ID (Auto-detect & validação)
  app.get("/api/discord/channel-info", async (req, res) => {
    const { channelId } = req.query;

    if (!channelId || typeof channelId !== 'string') {
      return res.status(400).json({ error: "ID do canal não fornecido" });
    }

    if (!discordClient || !discordClient.isReady()) {
      return res.json({ 
        online: false, 
        found: false, 
        message: "O bot do Discord não está conectado no servidor Node.js. Verifique o DISCORD_BOT_TOKEN." 
      });
    }

    try {
      const cleanId = channelId.trim();
      const channel: any = await discordClient.channels.fetch(cleanId).catch(() => null);
      
      if (!channel) {
        return res.json({ 
          online: true, 
          found: false, 
          message: "Canal não encontrado no Discord ou o bot não tem permissão para acessá-lo." 
        });
      }

      // Detecção de tipo e categoria
      const isVoice = channel.type === 2 || channel.type === 13; // GuildVoice / GuildStageVoice
      const categoryName = channel.parent?.name || (isVoice ? 'VOZ' : 'GERAL');

      return res.json({
        online: true,
        found: true,
        channelId: channel.id,
        name: channel.name || '',
        type: isVoice ? 'voice' : 'text',
        category: categoryName.toUpperCase(),
        topic: channel.topic || '',
        guildId: channel.guild?.id || null,
        guildName: channel.guild?.name || null
      });
    } catch (err: any) {
      console.error("Erro ao inspecionar canal do Discord:", err);
      return res.json({ online: false, found: false, error: err.message });
    }
  });

  // Rota para o NOTEBOOK enviar mensagem para um canal específico do Discord
  app.post("/api/discord/notebook/send", async (req, res) => {
    const { channelId, remetente, conteudo, attachment, attachments } = req.body;
    const targetChannelId = channelId || defaultChannelId;

    if (!targetChannelId) {
      return res.status(400).json({ error: "ID do canal não fornecido" });
    }

    if (!discordClient || !discordClient.isReady()) {
      return res.status(200).json({ 
        success: false, 
        botOffline: true, 
        message: "Bot do Discord offline ou não conectado" 
      });
    }

    try {
      const channel = await discordClient.channels.fetch(targetChannelId).catch(() => null);
      if (channel && channel.isTextBased() && 'send' in channel) {
        const sendOptions: any = {};
        
        let formattedText = `**[${remetente}]**\n${conteudo || ''}`;
        sendOptions.content = formattedText;

        // Lista de anexos unificada (suporta attachment único e array attachments)
        const allAtts: string[] = [];
        if (Array.isArray(attachments)) {
          allAtts.push(...attachments.filter(Boolean));
        } else if (attachment && typeof attachment === 'string') {
          allAtts.push(attachment);
        }

        const filesToSend: AttachmentBuilder[] = [];
        let fileIdx = 1;
        for (const att of allAtts) {
          if (typeof att === 'string' && att.startsWith('data:image/')) {
            const base64Data = att.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const rawExt = att.substring(att.indexOf('/') + 1, att.indexOf(';')) || 'png';
            const cleanExt = rawExt.replace('+xml', '').replace('jpeg', 'jpg');
            const file = new AttachmentBuilder(buffer, { name: `galeria_${Date.now()}_${fileIdx}.${cleanExt}` });
            filesToSend.push(file);
            fileIdx++;
          } else if (typeof att === 'string' && (att.startsWith('http://') || att.startsWith('https://'))) {
            const file = new AttachmentBuilder(att, { name: `galeria_${Date.now()}_${fileIdx}.png` });
            filesToSend.push(file);
            fileIdx++;
          }
        }

        if (filesToSend.length > 0) {
          // Limite oficial da API do Discord de até 10 anexos por mensagem
          sendOptions.files = filesToSend.slice(0, 10);
        }

        const sentMsg = await channel.send(sendOptions);
        console.log(`[DISCORD] Mensagem enviada para o canal #${channel.name || targetChannelId} no Discord! ID: ${sentMsg.id}`);

        return res.json({ success: true, discordMessageId: sentMsg.id });
      } else {
        return res.status(400).json({ error: "Canal do Discord não encontrado ou o bot não tem permissão para enviar mensagens nele." });
      }
    } catch (err: any) {
      console.error("Erro ao enviar mensagem pro Discord Notebook:", err);
      return res.status(500).json({ error: err?.message || "Falha ao despachar mensagem para o Discord" });
    }
  });

  // Rota para o NOTEBOOK editar mensagem no canal específico do Discord
  app.post("/api/discord/notebook/edit", async (req, res) => {
    const { channelId, messageId, discordMessageId, conteudo, remetente } = req.body;
    const targetChannelId = channelId || defaultChannelId;

    if (!targetChannelId) {
      return res.status(400).json({ error: "ID do canal não fornecido" });
    }

    if (!discordClient || !discordClient.isReady()) {
      return res.json({ 
        success: false, 
        botOffline: true, 
        message: "Bot do Discord offline ou não conectado" 
      });
    }

    try {
      const channel = await discordClient.channels.fetch(targetChannelId).catch(() => null);
      if (channel && channel.isTextBased() && 'messages' in channel) {
        let msgToEdit: any = null;
        
        // 1. Tenta buscar pelo discordMessageId direto se fornecido e válido
        const searchId = discordMessageId || messageId;
        if (searchId && /^\d{17,20}$/.test(searchId)) {
          msgToEdit = await channel.messages.fetch(searchId).catch(() => null);
        }

        // 2. Se não encontrou ou ID não é snowflake, tenta buscar no Firestore se temos o discordMessageId gravado
        let originalContent = '';
        if (!msgToEdit && messageId && db) {
          try {
            const docSnap = await getDoc(doc(db, 'discord_notebook_messages', messageId));
            if (docSnap.exists()) {
              const data = docSnap.data();
              originalContent = data.content || '';
              const dId = data.discordMessageId;
              if (dId && /^\d{17,20}$/.test(dId)) {
                msgToEdit = await channel.messages.fetch(dId).catch(() => null);
              }
            }
          } catch (e) {}
        }

        // 3. Fallback inteligente: se ainda não achou a mensagem do bot (por exemplo, enviada antes de salvar o ID), busca nas últimas 50 mensagens do canal
        if (!msgToEdit) {
          try {
            const recentMessages = await channel.messages.fetch({ limit: 50 });
            const botMessages = recentMessages.filter(m => m.author.id === discordClient.user?.id);
            
            // Tenta casar pelo remetente ou prefixo
            if (remetente) {
              const matched = botMessages.find(m => m.content.startsWith(`**[${remetente}]**`));
              if (matched) {
                msgToEdit = matched;
                // Atualiza o documento no Firestore com o ID descoberto
                if (messageId && db) {
                  updateDoc(doc(db, 'discord_notebook_messages', messageId), {
                    discordMessageId: matched.id
                  }).catch(() => {});
                }
              }
            }
          } catch (fetchErr) {
            console.warn("[DISCORD] Erro no fallback de busca de mensagens:", fetchErr);
          }
        }

        if (msgToEdit) {
          // Verifica se a mensagem foi postada pelo bot (o bot só pode editar mensagens enviadas por ele mesmo)
          if (msgToEdit.author.id === discordClient.user?.id) {
            const authorPrefixMatch = msgToEdit.content.match(/^\*\*\[(.*?)\]\*\*\n/);
            const prefix = authorPrefixMatch ? authorPrefixMatch[0] : (remetente ? `**[${remetente}]**\n` : '');
            await msgToEdit.edit({ content: `${prefix}${conteudo || ''}` });
            console.log(`[DISCORD] Mensagem ${msgToEdit.id} editada com sucesso no canal #${channel.name || targetChannelId}!`);
            return res.json({ success: true, edited: true });
          } else {
            console.log(`[DISCORD] Mensagem ${msgToEdit.id} não foi enviada pelo bot, portanto a API do Discord não permite edição direta.`);
            return res.json({ success: true, note: "Mensagem pertencente a usuário do Discord, mantida sincronizada no portal." });
          }
        } else {
          console.warn(`[DISCORD] Mensagem correspondente não encontrada para edição no canal ${targetChannelId}`);
          return res.json({ success: false, message: "Mensagem não encontrada no canal do Discord para edição." });
        }
      } else {
        return res.status(400).json({ error: "Canal do Discord não encontrado ou o bot não tem permissão para acessá-lo." });
      }
    } catch (err: any) {
      console.error("Erro ao editar mensagem no Discord Notebook:", err);
      return res.status(500).json({ error: err?.message || "Falha ao editar mensagem no Discord" });
    }
  });

  // Rota para importar e processar PDF de Ficha Sankötei via Gemini API
  app.post("/api/characters/import-pdf", async (req, res) => {
    try {
      const { pdfBase64, textContent, mimeType = "application/pdf" } = req.body;

      if (!pdfBase64 && !textContent) {
        return res.status(400).json({ error: "Nenhum arquivo PDF ou texto fornecido para processamento." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY não configurada no servidor. Configure a chave nos Secrets para habilitar o processamento por IA." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `
Você é um especialista no sistema de RPG Sankötei / Telumak RPG.
Analise detalhadamente o documento PDF da ficha de personagem Sankötei fornecido e extraia todos os dados com extrema fidelidade.

ESTRUTURA DE DADOS ESPERADA (retorne EXCLUSIVAMENTE em formato JSON):
{
  "nome": "Nome do personagem (ex: The Hen)",
  "cla": "Clã do personagem entre parênteses se houver (ex: Nuero)",
  "ocupacao": "Ocupação (ex: Deus Rei)",
  "posicao_social": "Posição Social (ex: Deus Rei)",
  "cidadania": "Cidadania e Naturalidade (ex: Rëno)",
  "seguimento": "Seguimento (ex: Conquistador)",
  "nivelamento_alma": "Texto completo de Nivelamento e Alma (ex: 9 (116). Alma: Reihao (25) 2x)",
  "nivel": 9,
  "ryo_dourado": 20,
  "ryo_prateado": 0,
  "ryo_bronze": 0,
  "hp_max": 50,
  "hp_atual": 48,
  "hp_consumidos": 2,
  "ether_max": 12,
  "ether_atual": 11,
  "ether_consumidos": 1,
  "destino_max": 23,
  "destino_atual": 22,
  "destino_consumidos": 1,
  "fortitude_max": "29+4 | 33 equipados",
  "movimento_max": "03 | 15 metros",
  "alcance_max": "03 (6) | 15 (30) metros",
  "tecnicas_max": "02 | 00 equipada",
  "fisico": 78,
  "destreza": 4,
  "cognicao": 4,
  "carisma": 30,
  "primordio": 75,
  "primordio_detalhe": "(45+20+5+5)",
  "ferramenta_fisico": 0,
  "ferramenta_fisico_max": 2,
  "ferramenta_fisico_atual": 2,
  "ferramenta_fisico_sec_max": 3,
  "ferramenta_fisico_sec_atual": 3,
  "ferramenta_destreza": 0,
  "ferramenta_destreza_max": 0,
  "ferramenta_destreza_atual": 0,
  "ferramenta_cognicao": 0,
  "ferramenta_cognicao_max": 0,
  "ferramenta_cognicao_atual": 0,
  "ferramenta_carisma": 0,
  "ferramenta_carisma_max": 1,
  "ferramenta_carisma_atual": 1,
  "html_ataques": "HTML formatado e estilizado contendo a seção COMBATE, ataques, dano, redutores e modificadores da ficha",
  "html_dons": "HTML formatado e estilizado contendo DONS E PODERES, DOMÍNIOS | VIRTUDES e FRAQUEZAS",
  "html_equipamentos": "HTML formatado e estilizado contendo UTILITÁRIOS, EQUIPAMENTOS EM USO e EQUIPAMENTOS GUARDADOS NO BAÚ",
  "html_defesa": "HTML formatado e estilizado contendo REDUTORES, FRAGILIDADE MORTAL e ORGULHO DO SOBREVIVENTE"
}

Observações importantes:
- Os atributos principais são: Força/Físico (fisico), Destreza (destreza), Cognição (cognicao), Carisma (carisma), Primórdio (primordio).
- Saúde: se o PDF indicar '46+4 / 02 consumidos', o hp_max é 50 (46+4), hp_consumidos é 2, e hp_atual é 48 (50 - 2).
- Energia (Éter): se indicar '12 / 01 consumidos', ether_max é 12, ether_consumidos é 1, ether_atual é 11.
- Destino (Henaen): se indicar '21+2 / 01 consumidos', destino_max é 23, destino_consumidos é 1, destino_atual é 22.
- Ferramentas: Físico com '2/2 3/3' significa ferramenta_fisico_max=2, ferramenta_fisico_atual=2, ferramenta_fisico_sec_max=3, ferramenta_fisico_sec_atual=3.
- Formate os blocos html_ataques, html_dons, html_equipamentos e html_defesa com tags HTML limpas (divs, headings, listas, parágrafos, strong, spans coloridos para status como BLEED, BURN, DANO, REDUTOR) para exibição direta no app.
`;

      const contentsParts: any[] = [];

      if (pdfBase64) {
        const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');
        contentsParts.push({
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: cleanBase64,
          }
        });
      }

      if (textContent) {
        contentsParts.push({
          text: `Texto da ficha extraído:\n${textContent}`
        });
      }

      contentsParts.push({
        text: promptText
      });

      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: contentsParts,
          config: {
            responseMimeType: "application/json",
          }
        });
      } catch (geminiErr: any) {
        console.warn("Tentando fallback para gemini-3.7-flash devido a:", geminiErr?.message);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contentsParts,
          config: {
            responseMimeType: "application/json",
          }
        });
      }

      const rawJson = response.text || "{}";
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(rawJson);
      } catch (jsonErr) {
        console.error("Erro ao fazer parse do JSON retornado pelo Gemini:", jsonErr, rawJson);
        return res.status(500).json({ error: "Falha ao estruturar os dados extraídos do PDF." });
      }

      return res.json({
        success: true,
        data: parsedData,
        message: `Ficha de "${parsedData.nome || 'Personagem'}" extraída com sucesso!`
      });

    } catch (err: any) {
      console.error("Erro ao importar ficha por PDF:", err);
      return res.status(500).json({ error: err?.message || "Erro no processamento do PDF da ficha." });
    }
  });

  // Rota genérica de envio para o Game Chat
  app.post("/api/discord/send", async (req, res) => {
    const { remetente, conteudo, channelId } = req.body;
    const targetChannelId = channelId || defaultChannelId;
    
    if (!discordClient || !discordClient.isReady() || !targetChannelId) {
      return res.status(500).json({ error: "Discord Bot não está pronto ou ID do canal não configurado" });
    }

    try {
      const channel = await discordClient.channels.fetch(targetChannelId);
      if (channel && channel.isTextBased() && 'send' in channel) {
        await channel.send(`**[RPG - ${remetente}]** ${conteudo}`);
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: "Canal do Discord inválido ou não suporta texto" });
      }
    } catch (err: any) {
      console.error("Erro ao enviar mensagem pro Discord", err);
      return res.status(500).json({ error: err?.message || "Falha ao enviar" });
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
