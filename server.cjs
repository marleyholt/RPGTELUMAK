var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_discord = require("discord.js");
var import_app = require("firebase/app");
var import_auth = require("firebase/auth");
var import_firestore = require("firebase/firestore");
var import_genai = require("@google/genai");
var import_fs = __toESM(require("fs"), 1);
var getFirebaseConfig = () => {
  try {
    const rawConfig = import_fs.default.readFileSync(import_path.default.join(process.cwd(), "firebase-applet-config.json"), "utf-8");
    const firebaseConfigLocal = JSON.parse(rawConfig);
    return {
      apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseConfigLocal.apiKey,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigLocal.authDomain,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigLocal.projectId,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigLocal.storageBucket,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigLocal.messagingSenderId,
      appId: process.env.VITE_FIREBASE_APP_ID || firebaseConfigLocal.appId,
      measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigLocal.measurementId,
      firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigLocal.firestoreDatabaseId
    };
  } catch (err) {
    console.error("Falha ao ler firebase-applet-config.json no backend:", err);
    return null;
  }
};
async function startServer() {
  const app = (0, import_express.default)();
  app.use((0, import_cors.default)());
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.use(import_express.default.static(import_path.default.join(process.cwd(), "public")));
  let db = null;
  const firebaseConfig = getFirebaseConfig();
  if (firebaseConfig && firebaseConfig.apiKey) {
    try {
      const firebaseApp = (0, import_app.initializeApp)(firebaseConfig, "backend-app");
      const auth = (0, import_auth.getAuth)(firebaseApp);
      const botEmail = "discord-bot@system.local";
      const botPassword = "discord-bot-secure-password-123";
      try {
        await (0, import_auth.signInWithEmailAndPassword)(auth, botEmail, botPassword);
        console.log("Bot logado no Firebase Auth");
      } catch (e) {
        if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") {
          try {
            await (0, import_auth.createUserWithEmailAndPassword)(auth, botEmail, botPassword);
            console.log("Usu\xE1rio do bot criado e logado no Firebase Auth");
          } catch (createErr) {
            console.error("Erro ao criar usu\xE1rio do bot no Firebase:", createErr);
          }
        } else {
          console.error("Erro ao autenticar o bot no Firebase", e);
        }
      }
      db = (0, import_firestore.getFirestore)(firebaseApp, firebaseConfig.firestoreDatabaseId || void 0);
      console.log(`[FIREBASE BACKEND] Firestore conectado no banco: ${firebaseConfig.firestoreDatabaseId || "(default)"}`);
    } catch (e) {
      console.error("Erro ao inicializar Firebase no Backend", e);
    }
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  const defaultChannelId = process.env.DISCORD_CHANNEL_ID;
  let discordClient = null;
  let botStatusMessage = "Iniciando...";
  let botLastError = null;
  const processedDiscordMsgIds = /* @__PURE__ */ new Set();
  const recentOutboundMsgs = /* @__PURE__ */ new Map();
  let activeBridgeUnsub1 = null;
  let activeBridgeUnsub2 = null;
  async function initOrRestartDiscordBot() {
    const activeToken = process.env.DISCORD_BOT_TOKEN || token;
    if (!activeToken) {
      botStatusMessage = "Token n\xE3o configurado no .env (DISCORD_BOT_TOKEN ausente)";
      console.warn("[DISCORD BOT] " + botStatusMessage);
      return { success: false, message: botStatusMessage };
    }
    try {
      if (discordClient) {
        console.log("[DISCORD BOT] Destruindo cliente anterior para reinicializa\xE7\xE3o...");
        try {
          await discordClient.destroy();
        } catch (destroyErr) {
          console.warn("[DISCORD BOT] Aviso ao encerrar cliente anterior:", destroyErr);
        }
        discordClient = null;
      }
      discordClient = new import_discord.Client({
        intents: [
          import_discord.GatewayIntentBits.Guilds,
          import_discord.GatewayIntentBits.GuildMessages,
          import_discord.GatewayIntentBits.MessageContent
        ]
      });
      discordClient.on("ready", () => {
        botStatusMessage = `Online e conectado como ${discordClient?.user?.tag}`;
        botLastError = null;
        console.log(`[DISCORD BOT] ${botStatusMessage}`);
        if (db) {
          setupFirestoreToDiscordBridge(db, discordClient, defaultChannelId);
        }
      });
      discordClient.on("error", (err) => {
        botLastError = err?.message || "Erro de conex\xE3o no Discord";
        console.error("[DISCORD BOT CLIENT ERROR]:", err);
      });
      discordClient.on("messageCreate", async (message) => {
        if (message.author.bot) return;
        if (processedDiscordMsgIds.has(message.id)) {
          return;
        }
        processedDiscordMsgIds.add(message.id);
        setTimeout(() => processedDiscordMsgIds.delete(message.id), 6e4);
        console.log(`[DISCORD -> BACKEND] Mensagem recebida no canal ${message.channelId} de ${message.author.username}: "${message.content}"`);
        if (db) {
          try {
            const attachments = message.attachments ? Array.from(message.attachments.values()).map((att) => att.url) : [];
            const docId = `discord_${message.id}`;
            const chanName = "name" in message.channel && typeof message.channel.name === "string" ? message.channel.name : "";
            const notebookDoc = {
              channelId: message.channelId,
              channelName: chanName,
              discordMessageId: message.id,
              authorName: message.member?.displayName || message.author.globalName || message.author.username,
              authorAvatar: message.author.displayAvatarURL() || "https://cdn.discordapp.com/embed/avatars/0.png",
              authorEmail: "discord-bot@system.local",
              content: message.content || "",
              isFromDiscord: true,
              pinned: false,
              createdAt: (0, import_firestore.serverTimestamp)()
            };
            if (attachments.length > 0) {
              notebookDoc.attachments = attachments;
            }
            await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "discord_notebook_messages", docId), notebookDoc, { merge: true });
            console.log(`[DISCORD -> FIRESTORE] Mensagem gravada/atualizada com sucesso! Doc ID: ${docId} no canal ${message.channelId}`);
            if (defaultChannelId && message.channelId === defaultChannelId) {
              const chatMsg = {
                remetente: `[Discord] ${message.author.username}`,
                remetente_email: "discord-bot@system.local",
                destinatario: "TODOS",
                tipo: "CHAT",
                conteudo: message.content || "",
                createdAt: (0, import_firestore.serverTimestamp)()
              };
              await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "messages", `discord_${message.id}`), chatMsg, { merge: true });
            }
          } catch (err) {
            console.error("[DISCORD -> FIRESTORE] Erro ao salvar mensagem do Discord no Firestore:", err?.message || err);
          }
        } else {
          console.warn("[DISCORD -> FIRESTORE] db do Firestore n\xE3o est\xE1 inicializado no backend.");
        }
      });
      discordClient.on("messageUpdate", async (_oldMsg, newMsg) => {
        try {
          if (newMsg.author?.bot) return;
          if (!newMsg.content) return;
          console.log(`[DISCORD -> BACKEND] Mensagem editada no canal ${newMsg.channelId} (ID: ${newMsg.id})`);
          if (db) {
            const q = (0, import_firestore.query)(
              (0, import_firestore.collection)(db, "discord_notebook_messages"),
              (0, import_firestore.where)("discordMessageId", "==", newMsg.id)
            );
            const snap = await (0, import_firestore.getDocs)(q);
            if (!snap.empty) {
              for (const docSnap of snap.docs) {
                await (0, import_firestore.updateDoc)((0, import_firestore.doc)(db, "discord_notebook_messages", docSnap.id), {
                  content: newMsg.content,
                  editedAt: (0, import_firestore.serverTimestamp)()
                });
              }
              console.log(`[DISCORD -> FIRESTORE] Mensagem do Discord sincronizada ap\xF3s edi\xE7\xE3o!`);
            }
          }
        } catch (err) {
          console.warn("[DISCORD -> FIRESTORE] Erro ao sincronizar edi\xE7\xE3o feita no Discord:", err?.message || err);
        }
      });
      await discordClient.login(activeToken);
      botStatusMessage = `Autenticado no Discord. Conectando Gateway...`;
      return { success: true, message: botStatusMessage };
    } catch (err) {
      botLastError = err?.message || "Falha ao autenticar no Discord";
      botStatusMessage = `Erro: ${botLastError}`;
      console.error("[DISCORD BOT] Erro ao inicializar bot no Discord:", err);
      return { success: false, error: botLastError };
    }
  }
  if (token) {
    initOrRestartDiscordBot();
  } else {
    botStatusMessage = "DISCORD_BOT_TOKEN n\xE3o configurado no .env";
    console.warn("[DISCORD BOT] " + botStatusMessage);
  }
  function setupFirestoreToDiscordBridge(dbInstance, client, defaultChanId) {
    if (!dbInstance || !client) return;
    if (activeBridgeUnsub1) {
      try {
        activeBridgeUnsub1();
      } catch {
      }
      activeBridgeUnsub1 = null;
    }
    if (activeBridgeUnsub2) {
      try {
        activeBridgeUnsub2();
      } catch {
      }
      activeBridgeUnsub2 = null;
    }
    console.log("[FIRESTORE BRIDGE] Inicializando ponte bidirecional Firestore <-> Discord...");
    const inFlightMessages = /* @__PURE__ */ new Set();
    activeBridgeUnsub1 = (0, import_firestore.onSnapshot)(
      (0, import_firestore.query)(
        (0, import_firestore.collection)(dbInstance, "discord_notebook_messages"),
        (0, import_firestore.where)("isFromDiscord", "==", false)
      ),
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "added" || change.type === "modified") {
            const docId = change.doc.id;
            const data = change.doc.data();
            if (data.discordMessageId || data.discordSynced || data.syncingToDiscord || inFlightMessages.has(docId)) {
              continue;
            }
            let targetDiscordChannelId = data.discordTargetId;
            if (!targetDiscordChannelId && data.channelId && /^\d{17,20}$/.test(data.channelId)) {
              targetDiscordChannelId = data.channelId;
            }
            if (!targetDiscordChannelId && data.channelId) {
              try {
                const chDoc = await (0, import_firestore.getDoc)((0, import_firestore.doc)(dbInstance, "discord_channels", data.channelId));
                if (chDoc.exists() && chDoc.data()?.discordChannelId) {
                  targetDiscordChannelId = chDoc.data()?.discordChannelId;
                }
              } catch (err) {
                console.warn("[FIRESTORE BRIDGE] Erro ao buscar canal vinculado em discord_channels:", err);
              }
            }
            if (!targetDiscordChannelId) {
              continue;
            }
            const sender = data.authorName || "Jogador";
            const cleanContent = (data.content || "").trim();
            const dedupKey = `${targetDiscordChannelId}_${sender}_${cleanContent}`;
            const now = Date.now();
            if (recentOutboundMsgs.has(dedupKey) && now - (recentOutboundMsgs.get(dedupKey) || 0) < 1e4) {
              console.log(`[FIRESTORE BRIDGE] Mensagem duplicada ignorada para #${targetDiscordChannelId}`);
              (0, import_firestore.updateDoc)((0, import_firestore.doc)(dbInstance, "discord_notebook_messages", docId), {
                discordSynced: true,
                syncingToDiscord: false
              }).catch(() => {
              });
              continue;
            }
            inFlightMessages.add(docId);
            recentOutboundMsgs.set(dedupKey, now);
            try {
              await (0, import_firestore.updateDoc)((0, import_firestore.doc)(dbInstance, "discord_notebook_messages", docId), {
                syncingToDiscord: true
              });
            } catch {
            }
            try {
              if (!client.isReady()) {
                inFlightMessages.delete(docId);
                continue;
              }
              const channel = await client.channels.fetch(targetDiscordChannelId).catch(() => null);
              if (channel && channel.isTextBased() && "send" in channel) {
                const sendOptions = {};
                sendOptions.content = `**[${sender}]**
${data.content || ""}`;
                const allAtts = [];
                if (Array.isArray(data.attachments)) {
                  allAtts.push(...data.attachments.filter(Boolean));
                } else if (data.attachment && typeof data.attachment === "string") {
                  allAtts.push(data.attachment);
                }
                const filesToSend = [];
                let fileIdx = 1;
                for (const att of allAtts) {
                  if (typeof att === "string" && att.startsWith("data:image/")) {
                    const base64Data = att.split(",")[1];
                    const buffer = Buffer.from(base64Data, "base64");
                    const rawExt = att.substring(att.indexOf("/") + 1, att.indexOf(";")) || "png";
                    const cleanExt = rawExt.replace("+xml", "").replace("jpeg", "jpg");
                    filesToSend.push(new import_discord.AttachmentBuilder(buffer, { name: `anexo_${Date.now()}_${fileIdx}.${cleanExt}` }));
                    fileIdx++;
                  } else if (typeof att === "string" && (att.startsWith("http://") || att.startsWith("https://"))) {
                    filesToSend.push(new import_discord.AttachmentBuilder(att, { name: `anexo_${Date.now()}_${fileIdx}.png` }));
                    fileIdx++;
                  }
                }
                if (filesToSend.length > 0) {
                  sendOptions.files = filesToSend.slice(0, 10);
                }
                const sentMsg = await channel.send(sendOptions);
                console.log(`[PORTAL -> FIRESTORE -> DISCORD] Mensagem enviada para #${channel.name || targetDiscordChannelId}! ID Discord: ${sentMsg.id}`);
                await (0, import_firestore.updateDoc)((0, import_firestore.doc)(dbInstance, "discord_notebook_messages", docId), {
                  discordMessageId: sentMsg.id,
                  discordSynced: true,
                  syncingToDiscord: false,
                  discordChannelId: targetDiscordChannelId
                });
              } else {
                console.warn(`[PORTAL -> FIRESTORE -> DISCORD] Canal ${targetDiscordChannelId} n\xE3o encontrado no Discord ou sem permiss\xE3o de envio.`);
              }
            } catch (err) {
              console.error("[PORTAL -> FIRESTORE -> DISCORD] Erro ao enviar mensagem para o Discord:", err?.message || err);
            } finally {
              setTimeout(() => {
                inFlightMessages.delete(docId);
              }, 5e3);
            }
          }
        }
      },
      (err) => {
        console.error("[FIRESTORE BRIDGE] Erro no listener de discord_notebook_messages:", err);
      }
    );
    if (defaultChanId) {
      activeBridgeUnsub2 = (0, import_firestore.onSnapshot)(
        (0, import_firestore.query)(
          (0, import_firestore.collection)(dbInstance, "messages"),
          (0, import_firestore.where)("tipo", "==", "CHAT")
        ),
        async (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === "added") {
              const docId = change.doc.id;
              const data = change.doc.data();
              if (data.discordSynced || inFlightMessages.has(docId) || data.remetente && String(data.remetente).startsWith("[Discord]")) {
                continue;
              }
              const sender = data.remetente || "Jogador";
              const cleanContent = (data.conteudo || "").trim();
              const dedupKey = `rpg_chat_${sender}_${cleanContent}`;
              const now = Date.now();
              if (recentOutboundMsgs.has(dedupKey) && now - (recentOutboundMsgs.get(dedupKey) || 0) < 1e4) {
                (0, import_firestore.updateDoc)((0, import_firestore.doc)(dbInstance, "messages", docId), { discordSynced: true }).catch(() => {
                });
                continue;
              }
              inFlightMessages.add(docId);
              recentOutboundMsgs.set(dedupKey, now);
              try {
                if (!client.isReady()) {
                  inFlightMessages.delete(docId);
                  continue;
                }
                const channel = await client.channels.fetch(defaultChanId).catch(() => null);
                if (channel && channel.isTextBased() && "send" in channel) {
                  await channel.send(`**[RPG - ${sender}]** ${cleanContent}`);
                  console.log(`[CHAT RPG -> DISCORD] Mensagem enviada para o canal padr\xE3o do Discord!`);
                  await (0, import_firestore.updateDoc)((0, import_firestore.doc)(dbInstance, "messages", docId), {
                    discordSynced: true
                  });
                }
              } catch (err) {
                console.error("[CHAT RPG -> DISCORD] Erro ao enviar mensagem:", err?.message || err);
              } finally {
                setTimeout(() => {
                  inFlightMessages.delete(docId);
                }, 5e3);
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
  app.post("/api/discord/restart", async (req, res) => {
    console.log("[API DISCORD] Requisi\xE7\xE3o de rein\xEDcio for\xE7ado do Bot do Discord recebida...");
    try {
      const result = await initOrRestartDiscordBot();
      if (result.success) {
        return res.json({
          success: true,
          message: "Comando de inicializa\xE7\xE3o enviado ao Discord!",
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
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao reiniciar o bot"
      });
    }
  });
  app.get("/api/discord/server-info", async (req, res) => {
    const { guildId, channelId } = req.query;
    if (!discordClient || !discordClient.isReady()) {
      return res.json({
        online: false,
        guildName: null,
        message: "Discord Bot n\xE3o est\xE1 conectado ou token ausente"
      });
    }
    try {
      let guild = null;
      if (guildId && typeof guildId === "string") {
        guild = await discordClient.guilds.fetch(guildId).catch(() => null);
      }
      if (!guild && channelId && typeof channelId === "string") {
        const chan = await discordClient.channels.fetch(channelId).catch(() => null);
        if (chan && "guild" in chan) {
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
    } catch (e) {
      return res.json({ online: false, error: e.message });
    }
  });
  app.get("/api/discord/channel-info", async (req, res) => {
    const { channelId } = req.query;
    if (!channelId || typeof channelId !== "string") {
      return res.status(400).json({ error: "ID do canal n\xE3o fornecido" });
    }
    if (!discordClient || !discordClient.isReady()) {
      return res.json({
        online: false,
        found: false,
        message: "O bot do Discord n\xE3o est\xE1 conectado no servidor Node.js. Verifique o DISCORD_BOT_TOKEN."
      });
    }
    try {
      const cleanId = channelId.trim();
      const channel = await discordClient.channels.fetch(cleanId).catch(() => null);
      if (!channel) {
        return res.json({
          online: true,
          found: false,
          message: "Canal n\xE3o encontrado no Discord ou o bot n\xE3o tem permiss\xE3o para acess\xE1-lo."
        });
      }
      const isVoice = channel.type === 2 || channel.type === 13;
      const categoryName = channel.parent?.name || (isVoice ? "VOZ" : "GERAL");
      return res.json({
        online: true,
        found: true,
        channelId: channel.id,
        name: channel.name || "",
        type: isVoice ? "voice" : "text",
        category: categoryName.toUpperCase(),
        topic: channel.topic || "",
        guildId: channel.guild?.id || null,
        guildName: channel.guild?.name || null
      });
    } catch (err) {
      console.error("Erro ao inspecionar canal do Discord:", err);
      return res.json({ online: false, found: false, error: err.message });
    }
  });
  app.post("/api/discord/notebook/send", async (req, res) => {
    const { channelId, remetente, conteudo, attachment, attachments, docId } = req.body;
    const targetChannelId = channelId || defaultChannelId;
    if (!targetChannelId) {
      return res.status(400).json({ error: "ID do canal n\xE3o fornecido" });
    }
    const cleanSender = remetente || "Jogador";
    const cleanContent = (conteudo || "").trim();
    const dedupKey = `${targetChannelId}_${cleanSender}_${cleanContent}`;
    const now = Date.now();
    if (recentOutboundMsgs.has(dedupKey) && now - (recentOutboundMsgs.get(dedupKey) || 0) < 1e4) {
      console.log(`[DISCORD REST] Mensagem id\xEAntica enviada h\xE1 menos de 10s para #${targetChannelId}, deduplicando.`);
      return res.json({ success: true, duplicated: true });
    }
    recentOutboundMsgs.set(dedupKey, now);
    if (!discordClient || !discordClient.isReady()) {
      return res.status(200).json({
        success: false,
        botOffline: true,
        message: "Bot do Discord offline ou n\xE3o conectado"
      });
    }
    try {
      const channel = await discordClient.channels.fetch(targetChannelId).catch(() => null);
      if (channel && channel.isTextBased() && "send" in channel) {
        const sendOptions = {};
        let formattedText = `**[${cleanSender}]**
${cleanContent}`;
        sendOptions.content = formattedText;
        const allAtts = [];
        if (Array.isArray(attachments)) {
          allAtts.push(...attachments.filter(Boolean));
        } else if (attachment && typeof attachment === "string") {
          allAtts.push(attachment);
        }
        const filesToSend = [];
        let fileIdx = 1;
        for (const att of allAtts) {
          if (typeof att === "string" && att.startsWith("data:image/")) {
            const base64Data = att.split(",")[1];
            const buffer = Buffer.from(base64Data, "base64");
            const rawExt = att.substring(att.indexOf("/") + 1, att.indexOf(";")) || "png";
            const cleanExt = rawExt.replace("+xml", "").replace("jpeg", "jpg");
            const file = new import_discord.AttachmentBuilder(buffer, { name: `galeria_${Date.now()}_${fileIdx}.${cleanExt}` });
            filesToSend.push(file);
            fileIdx++;
          } else if (typeof att === "string" && (att.startsWith("http://") || att.startsWith("https://"))) {
            const file = new import_discord.AttachmentBuilder(att, { name: `galeria_${Date.now()}_${fileIdx}.png` });
            filesToSend.push(file);
            fileIdx++;
          }
        }
        if (filesToSend.length > 0) {
          sendOptions.files = filesToSend.slice(0, 10);
        }
        const sentMsg = await channel.send(sendOptions);
        console.log(`[DISCORD] Mensagem enviada para o canal #${channel.name || targetChannelId} no Discord! ID: ${sentMsg.id}`);
        if (db && docId) {
          (0, import_firestore.updateDoc)((0, import_firestore.doc)(db, "discord_notebook_messages", docId), {
            discordMessageId: sentMsg.id,
            discordSynced: true,
            syncingToDiscord: false
          }).catch(() => {
          });
        }
        return res.json({ success: true, discordMessageId: sentMsg.id });
      } else {
        return res.status(400).json({ error: "Canal do Discord n\xE3o encontrado ou o bot n\xE3o tem permiss\xE3o para enviar mensagens nele." });
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem pro Discord Notebook:", err);
      return res.status(500).json({ error: err?.message || "Falha ao despachar mensagem para o Discord" });
    }
  });
  app.post("/api/discord/notebook/edit", async (req, res) => {
    const { channelId, messageId, discordMessageId, conteudo, remetente } = req.body;
    const targetChannelId = channelId || defaultChannelId;
    if (!targetChannelId) {
      return res.status(400).json({ error: "ID do canal n\xE3o fornecido" });
    }
    if (!discordClient || !discordClient.isReady()) {
      return res.json({
        success: false,
        botOffline: true,
        message: "Bot do Discord offline ou n\xE3o conectado"
      });
    }
    try {
      const channel = await discordClient.channels.fetch(targetChannelId).catch(() => null);
      if (channel && channel.isTextBased() && "messages" in channel) {
        let msgToEdit = null;
        const searchId = discordMessageId || messageId;
        if (searchId && /^\d{17,20}$/.test(searchId)) {
          msgToEdit = await channel.messages.fetch(searchId).catch(() => null);
        }
        let originalContent = "";
        if (!msgToEdit && messageId && db) {
          try {
            const docSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "discord_notebook_messages", messageId));
            if (docSnap.exists()) {
              const data = docSnap.data();
              originalContent = data.content || "";
              const dId = data.discordMessageId;
              if (dId && /^\d{17,20}$/.test(dId)) {
                msgToEdit = await channel.messages.fetch(dId).catch(() => null);
              }
            }
          } catch (e) {
          }
        }
        if (!msgToEdit) {
          try {
            const recentMessages = await channel.messages.fetch({ limit: 50 });
            const botMessages = recentMessages.filter((m) => m.author.id === discordClient.user?.id);
            if (remetente) {
              const matched = botMessages.find((m) => m.content.startsWith(`**[${remetente}]**`));
              if (matched) {
                msgToEdit = matched;
                if (messageId && db) {
                  (0, import_firestore.updateDoc)((0, import_firestore.doc)(db, "discord_notebook_messages", messageId), {
                    discordMessageId: matched.id
                  }).catch(() => {
                  });
                }
              }
            }
          } catch (fetchErr) {
            console.warn("[DISCORD] Erro no fallback de busca de mensagens:", fetchErr);
          }
        }
        if (msgToEdit) {
          if (msgToEdit.author.id === discordClient.user?.id) {
            const authorPrefixMatch = msgToEdit.content.match(/^\*\*\[(.*?)\]\*\*\n/);
            const prefix = authorPrefixMatch ? authorPrefixMatch[0] : remetente ? `**[${remetente}]**
` : "";
            await msgToEdit.edit({ content: `${prefix}${conteudo || ""}` });
            console.log(`[DISCORD] Mensagem ${msgToEdit.id} editada com sucesso no canal #${channel.name || targetChannelId}!`);
            return res.json({ success: true, edited: true });
          } else {
            console.log(`[DISCORD] Mensagem ${msgToEdit.id} n\xE3o foi enviada pelo bot, portanto a API do Discord n\xE3o permite edi\xE7\xE3o direta.`);
            return res.json({ success: true, note: "Mensagem pertencente a usu\xE1rio do Discord, mantida sincronizada no portal." });
          }
        } else {
          console.warn(`[DISCORD] Mensagem correspondente n\xE3o encontrada para edi\xE7\xE3o no canal ${targetChannelId}`);
          return res.json({ success: false, message: "Mensagem n\xE3o encontrada no canal do Discord para edi\xE7\xE3o." });
        }
      } else {
        return res.status(400).json({ error: "Canal do Discord n\xE3o encontrado ou o bot n\xE3o tem permiss\xE3o para acess\xE1-lo." });
      }
    } catch (err) {
      console.error("Erro ao editar mensagem no Discord Notebook:", err);
      return res.status(500).json({ error: err?.message || "Falha ao editar mensagem no Discord" });
    }
  });
  app.post("/api/characters/import-pdf", async (req, res) => {
    try {
      const { pdfBase64, textContent, mimeType = "application/pdf" } = req.body;
      if (!pdfBase64 && !textContent) {
        return res.status(400).json({ error: "Nenhum arquivo PDF ou texto fornecido para processamento." });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY n\xE3o configurada no servidor. Configure a chave nos Secrets para habilitar o processamento por IA."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const promptText = `
Voc\xEA \xE9 um especialista no sistema de RPG Sank\xF6tei / Telumak RPG.
Analise detalhadamente o documento PDF da ficha de personagem Sank\xF6tei fornecido e extraia todos os dados com extrema fidelidade.

ESTRUTURA DE DADOS ESPERADA (retorne EXCLUSIVAMENTE em formato JSON):
{
  "nome": "Nome do personagem (ex: The Hen)",
  "cla": "Cl\xE3 do personagem entre par\xEAnteses se houver (ex: Nuero)",
  "ocupacao": "Ocupa\xE7\xE3o (ex: Deus Rei)",
  "posicao_social": "Posi\xE7\xE3o Social (ex: Deus Rei)",
  "cidadania": "Cidadania e Naturalidade (ex: R\xEBno)",
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
  "html_ataques": "HTML formatado e estilizado contendo a se\xE7\xE3o COMBATE, ataques, dano, redutores e modificadores da ficha",
  "html_dons": "HTML formatado e estilizado contendo DONS E PODERES, DOM\xCDNIOS | VIRTUDES e FRAQUEZAS",
  "html_equipamentos": "HTML formatado e estilizado contendo UTILIT\xC1RIOS, EQUIPAMENTOS EM USO e EQUIPAMENTOS GUARDADOS NO BA\xDA",
  "html_defesa": "HTML formatado e estilizado contendo REDUTORES, FRAGILIDADE MORTAL e ORGULHO DO SOBREVIVENTE"
}

Observa\xE7\xF5es importantes:
- Os atributos principais s\xE3o: For\xE7a/F\xEDsico (fisico), Destreza (destreza), Cogni\xE7\xE3o (cognicao), Carisma (carisma), Prim\xF3rdio (primordio).
- Sa\xFAde: se o PDF indicar '46+4 / 02 consumidos', o hp_max \xE9 50 (46+4), hp_consumidos \xE9 2, e hp_atual \xE9 48 (50 - 2).
- Energia (\xC9ter): se indicar '12 / 01 consumidos', ether_max \xE9 12, ether_consumidos \xE9 1, ether_atual \xE9 11.
- Destino (Henaen): se indicar '21+2 / 01 consumidos', destino_max \xE9 23, destino_consumidos \xE9 1, destino_atual \xE9 22.
- Ferramentas: F\xEDsico com '2/2 3/3' significa ferramenta_fisico_max=2, ferramenta_fisico_atual=2, ferramenta_fisico_sec_max=3, ferramenta_fisico_sec_atual=3.
- Formate os blocos html_ataques, html_dons, html_equipamentos e html_defesa com tags HTML limpas (divs, headings, listas, par\xE1grafos, strong, spans coloridos para status como BLEED, BURN, DANO, REDUTOR) para exibi\xE7\xE3o direta no app.
`;
      const contentsParts = [];
      if (pdfBase64) {
        const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "");
        contentsParts.push({
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: cleanBase64
          }
        });
      }
      if (textContent) {
        contentsParts.push({
          text: `Texto da ficha extra\xEDdo:
${textContent}`
        });
      }
      contentsParts.push({
        text: promptText
      });
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: contentsParts,
          config: {
            responseMimeType: "application/json"
          }
        });
      } catch (geminiErr) {
        console.warn("Tentando fallback para gemini-3.7-flash devido a:", geminiErr?.message);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contentsParts,
          config: {
            responseMimeType: "application/json"
          }
        });
      }
      const rawJson = response.text || "{}";
      let parsedData = {};
      try {
        parsedData = JSON.parse(rawJson);
      } catch (jsonErr) {
        console.error("Erro ao fazer parse do JSON retornado pelo Gemini:", jsonErr, rawJson);
        return res.status(500).json({ error: "Falha ao estruturar os dados extra\xEDdos do PDF." });
      }
      return res.json({
        success: true,
        data: parsedData,
        message: `Ficha de "${parsedData.nome || "Personagem"}" extra\xEDda com sucesso!`
      });
    } catch (err) {
      console.error("Erro ao importar ficha por PDF:", err);
      return res.status(500).json({ error: err?.message || "Erro no processamento do PDF da ficha." });
    }
  });
  app.post("/api/discord/send", async (req, res) => {
    const { remetente, conteudo, channelId } = req.body;
    const targetChannelId = channelId || defaultChannelId;
    if (!discordClient || !discordClient.isReady() || !targetChannelId) {
      return res.status(500).json({ error: "Discord Bot n\xE3o est\xE1 pronto ou ID do canal n\xE3o configurado" });
    }
    const sender = remetente || "Jogador";
    const cleanContent = (conteudo || "").trim();
    const dedupKey = `rpg_chat_${sender}_${cleanContent}`;
    const now = Date.now();
    if (recentOutboundMsgs.has(dedupKey) && now - (recentOutboundMsgs.get(dedupKey) || 0) < 1e4) {
      return res.json({ success: true, duplicated: true });
    }
    recentOutboundMsgs.set(dedupKey, now);
    try {
      const channel = await discordClient.channels.fetch(targetChannelId);
      if (channel && channel.isTextBased() && "send" in channel) {
        await channel.send(`**[RPG - ${sender}]** ${cleanContent}`);
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: "Canal do Discord inv\xE1lido ou n\xE3o suporta texto" });
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem pro Discord", err);
      return res.status(500).json({ error: err?.message || "Falha ao enviar" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
