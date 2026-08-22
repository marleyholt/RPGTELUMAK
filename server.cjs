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
  app.use(import_express.default.json());
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
  const channelId = process.env.DISCORD_CHANNEL_ID;
  let discordClient = null;
  if (token && channelId) {
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
      if (message.channelId !== channelId) return;
      if (db) {
        try {
          const newMessage = {
            remetente: `[Discord] ${message.author.username}`,
            remetente_email: "discord-bot@system.local",
            destinatario: "TODOS",
            tipo: "CHAT",
            conteudo: message.content,
            createdAt: (0, import_firestore.serverTimestamp)()
            // Importante usar o timestamp do server
          };
          await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "messages"), newMessage);
          console.log("Mensagem do Discord enviada para o Firestore");
        } catch (err) {
          console.error("Erro ao salvar mensagem do Discord no Firestore:", err);
        }
      }
    });
    discordClient.login(token).catch((err) => {
      console.error("Erro ao logar o bot no Discord:", err);
    });
  } else {
    console.warn("DISCORD_BOT_TOKEN e/ou DISCORD_CHANNEL_ID n\xE3o configurados no .env");
  }
  app.post("/api/discord/send", async (req, res) => {
    const { remetente, conteudo } = req.body;
    if (!discordClient || !discordClient.isReady() || !channelId) {
      return res.status(500).json({ error: "Discord Bot n\xE3o est\xE1 pronto ou n\xE3o configurado" });
    }
    try {
      const channel = await discordClient.channels.fetch(channelId);
      if (channel && channel.isTextBased() && "send" in channel) {
        await channel.send(`**[RPG - ${remetente}]** ${conteudo}`);
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: "Canal do Discord inv\xE1lido ou n\xE3o suporta texto" });
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem pro Discord", err);
      return res.status(500).json({ error: "Falha ao enviar" });
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
