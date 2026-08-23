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
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_discord = require("discord.js");
var import_app = require("firebase/app");
var import_auth = require("firebase/auth");
var import_firestore = require("firebase/firestore");
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
      measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigLocal.measurementId
    };
  } catch (err) {
    console.error("Falha ao ler firebase-applet-config.json no backend:", err);
    return null;
  }
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
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
        if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
          await (0, import_auth.createUserWithEmailAndPassword)(auth, botEmail, botPassword);
          console.log("Usu\xE1rio do bot criado e logado no Firebase Auth");
        } else {
          console.error("Erro ao autenticar o bot no Firebase", e);
        }
      }
      db = (0, import_firestore.getFirestore)(firebaseApp);
    } catch (e) {
      console.error("Erro ao inicializar Firebase no Backend", e);
    }
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  const defaultChannelId = process.env.DISCORD_CHANNEL_ID;
  let discordClient = null;
  if (token) {
    discordClient = new import_discord.Client({
      intents: [
        import_discord.GatewayIntentBits.Guilds,
        import_discord.GatewayIntentBits.GuildMessages,
        import_discord.GatewayIntentBits.MessageContent
      ]
    });
    discordClient.on("ready", () => {
      console.log(`Discord Bot logado como ${discordClient?.user?.tag}`);
    });
    discordClient.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      if (db) {
        try {
          const attachments = message.attachments.map((att) => att.url);
          const notebookDoc = {
            channelId: message.channelId,
            authorName: message.member?.displayName || message.author.username,
            authorAvatar: message.author.displayAvatarURL(),
            content: message.content || "",
            attachments: attachments.length > 0 ? attachments : void 0,
            isFromDiscord: true,
            createdAt: (0, import_firestore.serverTimestamp)()
          };
          await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "discord_notebook_messages"), notebookDoc);
          if (defaultChannelId && message.channelId === defaultChannelId) {
            const chatMsg = {
              remetente: `[Discord] ${message.author.username}`,
              remetente_email: "discord-bot@system.local",
              destinatario: "TODOS",
              tipo: "CHAT",
              conteudo: message.content,
              createdAt: (0, import_firestore.serverTimestamp)()
            };
            await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "messages"), chatMsg);
          }
          console.log(`Mensagem do Discord no canal ${message.channelId} sincronizada com sucesso!`);
        } catch (err) {
          console.error("Erro ao salvar mensagem do Discord no Firestore:", err);
        }
      }
    });
    discordClient.login(token).catch((err) => {
      console.error("Erro ao logar o bot no Discord:", err);
    });
  } else {
    console.warn("DISCORD_BOT_TOKEN n\xE3o configurado no .env");
  }
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
    const { channelId, remetente, conteudo, attachment } = req.body;
    const targetChannelId = channelId || defaultChannelId;
    if (!discordClient || !discordClient.isReady()) {
      if (db && targetChannelId) {
        await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "discord_notebook_messages"), {
          channelId: targetChannelId,
          authorName: remetente,
          content: conteudo || "",
          attachments: attachment ? [attachment] : void 0,
          isFromDiscord: false,
          createdAt: (0, import_firestore.serverTimestamp)()
        });
      }
      return res.status(200).json({ success: true, offlineSaved: true });
    }
    try {
      const channel = await discordClient.channels.fetch(targetChannelId);
      if (channel && channel.isTextBased() && "send" in channel) {
        const sendOptions = {};
        let formattedText = `**[${remetente}]**
${conteudo || ""}`;
        sendOptions.content = formattedText;
        if (attachment && attachment.startsWith("data:image/")) {
          const base64Data = attachment.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = attachment.substring(attachment.indexOf("/") + 1, attachment.indexOf(";"));
          const file = new import_discord.AttachmentBuilder(buffer, { name: `upload_${Date.now()}.${ext || "png"}` });
          sendOptions.files = [file];
        }
        const sentMsg = await channel.send(sendOptions);
        if (db) {
          const discordAttachments = sentMsg.attachments.map((a) => a.url);
          await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "discord_notebook_messages"), {
            channelId: targetChannelId,
            authorName: remetente,
            content: conteudo || "",
            attachments: discordAttachments.length > 0 ? discordAttachments : attachment ? [attachment] : void 0,
            isFromDiscord: false,
            createdAt: (0, import_firestore.serverTimestamp)()
          });
        }
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: "Canal do Discord inv\xE1lido ou n\xE3o suporta texto" });
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem pro Discord Notebook:", err);
      if (db && targetChannelId) {
        await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "discord_notebook_messages"), {
          channelId: targetChannelId,
          authorName: remetente,
          content: conteudo || "",
          attachments: attachment ? [attachment] : void 0,
          isFromDiscord: false,
          createdAt: (0, import_firestore.serverTimestamp)()
        });
      }
      return res.status(200).json({ success: true, warning: err.message });
    }
  });
  app.post("/api/discord/send", async (req, res) => {
    const { remetente, conteudo, channelId } = req.body;
    const targetChannelId = channelId || defaultChannelId;
    if (!discordClient || !discordClient.isReady() || !targetChannelId) {
      return res.status(500).json({ error: "Discord Bot n\xE3o est\xE1 pronto ou ID do canal n\xE3o configurado" });
    }
    try {
      const channel = await discordClient.channels.fetch(targetChannelId);
      if (channel && channel.isTextBased() && "send" in channel) {
        await channel.send(`**[RPG - ${remetente}]** ${conteudo}`);
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
      server: { middlewareMode: true },
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
