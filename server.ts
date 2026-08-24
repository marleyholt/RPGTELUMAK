import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Client, GatewayIntentBits, AttachmentBuilder } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
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
  const PORT = 3000;

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
  
  if (token) {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    discordClient.on('ready', () => {
      console.log(`[DISCORD BOT] Logado e pronto como ${discordClient?.user?.tag}`);
    });

    // Escutando mensagens do Discord de QUALQUER canal ao qual o bot tem acesso
    discordClient.on('messageCreate', async (message) => {
      // Ignorar mensagens do próprio bot
      if (message.author.bot) return;

      console.log(`[DISCORD -> BACKEND] Mensagem recebida no canal ${message.channelId} de ${message.author.username}: "${message.content}"`);

      if (db) {
        try {
          const attachments = message.attachments ? Array.from(message.attachments.values()).map(att => att.url) : [];
          
          // 1. Salva na coleção do NOTEBOOK do Discord
          const notebookDoc: any = {
            channelId: message.channelId,
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

          const docRef = await addDoc(collection(db, 'discord_notebook_messages'), notebookDoc);
          console.log(`[DISCORD -> FIRESTORE] Mensagem gravada com sucesso! Doc ID: ${docRef.id} no canal ${message.channelId}`);

          // 2. Se for o canal principal/padrão, salva também no chat rápido de jogo
          if (defaultChannelId && message.channelId === defaultChannelId) {
            const chatMsg = {
              remetente: `[Discord] ${message.author.username}`,
              remetente_email: 'discord-bot@system.local',
              destinatario: 'TODOS',
              tipo: 'CHAT',
              conteudo: message.content || '',
              createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'messages'), chatMsg);
          }
        } catch (err: any) {
          console.error("[DISCORD -> FIRESTORE] Erro ao salvar mensagem do Discord no Firestore:", err?.message || err);
        }
      } else {
        console.warn("[DISCORD -> FIRESTORE] db do Firestore não está inicializado no backend.");
      }
    });

    discordClient.login(token).catch(err => {
      console.error("[DISCORD BOT] Erro ao logar o bot no Discord:", err);
    });
  } else {
    console.warn("DISCORD_BOT_TOKEN não configurado no .env");
  }

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
    const { channelId, remetente, conteudo, attachment } = req.body;
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

        // Se houver imagem base64 anexada, converte em arquivo do Discord
        if (attachment && typeof attachment === 'string' && attachment.startsWith('data:image/')) {
          const base64Data = attachment.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = attachment.substring(attachment.indexOf('/') + 1, attachment.indexOf(';'));
          const file = new AttachmentBuilder(buffer, { name: `upload_${Date.now()}.${ext || 'png'}` });
          sendOptions.files = [file];
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
          model: "gemini-2.5-flash",
          contents: contentsParts,
          config: {
            responseMimeType: "application/json",
          }
        });
      } catch (geminiErr: any) {
        console.warn("Tentando fallback para gemini-3.7-flash devido a:", geminiErr?.message);
        response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
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
