// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import fetch from "node-fetch";

// Debug: Verificar variáveis de ambiente
console.log("🔧 Verificando variáveis de ambiente:");
console.log(
  "📡 PORT:",
  process.env.PORT || "não definido (usando padrão 3000)"
);
console.log(
  "🤖 OPENAI_API_KEY:",
  process.env.OPENAI_API_KEY ? "✅ Configurada" : "❌ Não configurada"
);
console.log(
  "🎵 ELEVEN_LABS_API_KEY:",
  process.env.ELEVEN_LABS_API_KEY ? "✅ Configurada" : "❌ Não configurada"
);
console.log(
  "📱 WHATSAPP_API_URL:",
  process.env.WHATSAPP_API_URL || "http://localhost:3002"
);

const app = express();
const server = createServer(app);

// Configurar WebSocket para path específico
const wss = new WebSocketServer({
  server,
  path: "/audio-stream",
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configurações ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

// Configuração WhatsApp
const WHATSAPP_API_URL =
  process.env.WHATSAPP_API_URL || "http://localhost:3002";

// Clientes WebSocket conectados
const connectedClients = new Set();

// Validação básica do payload
const Payload = z.object({
  npc_key: z.string(),
  npc_name: z.string(),
  system_message: z.string(),
  user_id: z.number(),
  user_name: z.string(),
  user_display: z.string(),
  user_text: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  max_tokens: z.number().optional(),
});

const MAX_BALAO = 240;

// Função para gerar áudio com ElevenLabs
const generateAudio = async (text) => {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: process.env.ELEVEN_LABS_MODEL_ID || "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error("Erro ao gerar áudio:", error);
    throw error;
  }
};

// Função para enviar mensagem para todos os clientes WebSocket
const broadcastToClients = (data) => {
  const message = JSON.stringify(data);
  let sentCount = 0;

  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
      sentCount++;
    }
  });

  console.log(`📡 Mensagem enviada para ${sentCount} clientes`);
};

// WebSocket connection handler - configurado para path específico
wss.on("connection", (ws, req) => {
  console.log(`Cliente WebSocket conectado no path: ${req.url}`);
  connectedClients.add(ws);

  // Enviar mensagem de boas-vindas apenas para este cliente
  ws.send(
    JSON.stringify({
      type: "connection_success",
      message: "Conectado ao Audio Player do Metaverso",
      timestamp: new Date().toISOString(),
      client_id: Math.random().toString(36).substr(2, 9),
    })
  );

  ws.on("close", () => {
    console.log("Cliente WebSocket desconectado");
    connectedClients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("Erro WebSocket:", error);
    connectedClients.delete(ws);
  });
});

// Função para detectar números de WhatsApp na mensagem
function detectPhoneNumber(message) {
  console.log(`🔍 Analisando mensagem para WhatsApp: ${message}`);

  // Padrões para números de telefone brasileiros
  const patterns = [
    /\+55\s*\(?(\d{2})\)?\s*9?\s*\d{4}[-\s]?\d{4}/g, // +55 (11) 99999-9999
    /\((\d{2})\)\s*9?\s*\d{4}[-\s]?\d{4}/g, // (11) 99999-9999
    /(\d{2})\s*9?\s*\d{4}[-\s]?\d{4}/g, // 11 99999-9999
    /(\d{11})/g, // 11999999999
    /(\d{10})/g, // 1199999999
  ];

  const foundNumbers = [];

  patterns.forEach((pattern, index) => {
    console.log(`🔍 Testando padrão ${index + 1}: ${pattern}`);
    const matches = [...message.matchAll(pattern)];

    matches.forEach((match) => {
      console.log(`📞 Match encontrado: ${match[0]}`);
      // Extrair apenas os dígitos
      let phone = match[0].replace(/\D/g, "");
      console.log(`📞 Dígitos extraídos: ${phone}`);

      // Validar se é um número brasileiro válido
      if (phone.length >= 10) {
        // Adicionar código do país se não tiver
        if (!phone.startsWith("55")) {
          phone = "55" + phone;
          console.log(`📞 Com código do país: ${phone}`);
        }

        // Gerar variações do número (com e sem o 9)
        const variations = [];

        if (phone.length === 12) {
          // Sem o 9 do celular (55 + DDD + 8 dígitos)
          console.log(`📞 Número sem 9 detectado: ${phone}`);
          // Adicionar o 9 do celular se o DDD for válido
          const ddd = phone.slice(2, 4);
          console.log(`📞 DDD: ${ddd}`);

          const validDDDs = [
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "21",
            "22",
            "24",
            "27",
            "28",
            "31",
            "32",
            "33",
            "34",
            "35",
            "37",
            "38",
            "41",
            "42",
            "43",
            "44",
            "45",
            "46",
            "47",
            "48",
            "49",
            "51",
            "53",
            "54",
            "55",
            "61",
            "62",
            "63",
            "64",
            "65",
            "66",
            "67",
            "68",
            "69",
            "71",
            "73",
            "74",
            "75",
            "77",
            "79",
            "81",
            "82",
            "83",
            "84",
            "85",
            "86",
            "87",
            "88",
            "89",
            "91",
            "92",
            "93",
            "94",
            "95",
            "96",
            "97",
            "98",
            "99",
          ];

          if (validDDDs.includes(ddd)) {
            // Adicionar variação com 9
            const withNine = phone.slice(0, 4) + "9" + phone.slice(4);
            variations.push(withNine);
            console.log(`📞 Variação com 9: ${withNine}`);

            // Adicionar variação sem 9 (original)
            variations.push(phone);
            console.log(`📞 Variação sem 9: ${phone}`);
          }
        } else if (phone.length === 13) {
          // Com o 9 do celular (55 + DDD + 9 + 8 dígitos)
          console.log(`📞 Número com 9 detectado: ${phone}`);
          // Adicionar variação com 9 (original)
          variations.push(phone);
          console.log(`📞 Variação com 9: ${phone}`);
          // Adicionar variação sem 9
          const withoutNine = phone.slice(0, 4) + phone.slice(5);
          variations.push(withoutNine);
          console.log(`📞 Variação sem 9: ${withoutNine}`);
        }

        // Adicionar variações únicas
        variations.forEach((variation) => {
          if (!foundNumbers.includes(variation)) {
            foundNumbers.push(variation);
            console.log(`✅ Número adicionado: ${variation}`);
          }
        });
      }
    });
  });

  console.log(`📱 Números finais encontrados: ${foundNumbers}`);
  return foundNumbers;
}

// Função para enviar notificação via WhatsApp
async function sendWhatsappNotification(phoneNumber, npcName) {
  try {
    console.log(`📱 Enviando notificação WhatsApp para ${phoneNumber}`);

    // Mensagem de boas-vindas
    const messageText = `Olá! Sou ${npcName} do Museu Vivo TJRO.

É um prazer saber que você tem interesse em continuar nossa conversa! 

Agora você pode me enviar mensagens aqui no WhatsApp a qualquer momento. Responderei com áudio, compartilhando minhas experiências e conhecimentos sobre a história do Tribunal de Justiça de Rondônia.

Seja muito bem-vindo(a) ao nosso canal direto de comunicação!

🏛️ Museu Vivo TJRO`;

    const payload = {
      phone: phoneNumber,
      message: messageText,
      founder_name: npcName,
      founder_title: "Desembargador",
    };

    // Enviar requisição para o bot do WhatsApp
    const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 segundos timeout
    });

    if (response.ok) {
      console.log(`✅ Mensagem WhatsApp enviada para ${phoneNumber}`);
      return true;
    } else {
      console.log(`❌ Erro ao enviar WhatsApp: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro ao enviar notificação WhatsApp: ${error.message}`);
    return false;
  }
}

app.post("/npc-chat", async (req, res) => {
  const reqId = randomUUID().slice(0, 8);
  console.log(`[${reqId}] Recebendo requisição NPC chat`);

  try {
    const body = Payload.parse(req.body);
    const { npc_key, npc_name, user_text, messages, max_tokens = 150 } = body;

    console.log(`[${reqId}] NPC: ${npc_name}, User: ${user_text}`);

    // Detectar números de WhatsApp na mensagem do usuário
    const phoneNumbers = detectPhoneNumber(user_text);
    let whatsappSent = false;

    if (phoneNumbers.length > 0) {
      console.log(
        `[${reqId}] 📱 Números de WhatsApp detectados: ${phoneNumbers}`
      );
      for (const number of phoneNumbers) {
        whatsappSent = await sendWhatsappNotification(number, npc_name);
        if (whatsappSent) {
          console.log(`[${reqId}] ✅ WhatsApp enviado para ${number}`);
        } else {
          console.log(`[${reqId}] ❌ Falha ao enviar WhatsApp para ${number}`);
        }
      }
    }

    // Preparar mensagens com contexto especial se WhatsApp foi detectado
    let contextualMessages = [...messages];

    if (phoneNumbers.length > 0) {
      const whatsappContext = `
ATENÇÃO: O usuário forneceu ${
        phoneNumbers.length
      } número(s) de WhatsApp: ${phoneNumbers.join(", ")}. 
Responda agradecendo pelos números e informando que você enviará 
mensagens de boas-vindas no WhatsApp deles. Seja cordial e 
explique que agora vocês podem conversar por lá também.
      `;
      contextualMessages.push({ role: "system", content: whatsappContext });
    }

    // Gerar resposta com OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: contextualMessages,
      max_tokens: Math.min(max_tokens, MAX_BALAO),
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "Desculpe, não consegui responder.";
    console.log(`[${reqId}] Resposta gerada: ${reply.substring(0, 50)}...`);

    // Verificar se há clientes WebSocket conectados
    if (connectedClients.size > 0) {
      console.log(
        `[${reqId}] ${connectedClients.size} clientes WebSocket conectados - gerando áudio`
      );

      try {
        // Gerar áudio com ElevenLabs
        const audioBuffer = await generateAudio(reply);
        const audioBase64 = audioBuffer.toString("base64");

        // Enviar dados para clientes WebSocket
        const wsData = {
          type: "npc_response",
          id: reqId,
          npc_name,
          npc_key,
          reply,
          timestamp: new Date().toISOString(),
          audio_base64: audioBase64,
        };

        broadcastToClients(wsData);
        console.log(
          `[${reqId}] Áudio enviado para ${connectedClients.size} clientes - Tipo: ${wsData.type}, Audio bytes: ${audioBase64.length}`
        );
      } catch (audioError) {
        console.error(`[${reqId}] Erro ao gerar áudio:`, audioError);
        // Enviar apenas texto se áudio falhar
        const wsData = {
          type: "npc_response",
          id: reqId,
          npc_name,
          npc_key,
          reply,
          timestamp: new Date().toISOString(),
        };
        broadcastToClients(wsData);
      }
    } else {
      console.log(`[${reqId}] Nenhum cliente WebSocket - pulando áudio`);
    }

    // Retornar resposta para Roblox
    res.json({ reply });
  } catch (error) {
    console.error(`[${reqId}] Erro no chat:`, error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "roblox-npc-api",
    websocket_clients: connectedClients.size,
    timestamp: new Date().toISOString(),
  });
});

// Audio status endpoint
app.get("/audio-status", (req, res) => {
  res.json({
    websocket_clients: connectedClients.size,
    elevenlabs_configured: !!ELEVENLABS_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint para verificar variáveis de ambiente
app.get("/debug/env", (req, res) => {
  res.json({
    port: process.env.PORT || "não definido",
    openai_configured: !!process.env.OPENAI_API_KEY,
    elevenlabs_configured: !!process.env.ELEVEN_LABS_API_KEY,
    openai_key_length: process.env.OPENAI_API_KEY
      ? process.env.OPENAI_API_KEY.length
      : 0,
    elevenlabs_key_length: process.env.ELEVEN_LABS_API_KEY
      ? process.env.ELEVEN_LABS_API_KEY.length
      : 0,
    openai_key_prefix: process.env.OPENAI_API_KEY
      ? process.env.OPENAI_API_KEY.substring(0, 10) + "..."
      : "não configurado",
    elevenlabs_key_prefix: process.env.ELEVEN_LABS_API_KEY
      ? process.env.ELEVEN_LABS_API_KEY.substring(0, 10) + "..."
      : "não configurado",
    voice_id: process.env.ELEVEN_LABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
    model_id: process.env.ELEVEN_LABS_MODEL_ID || "eleven_monolingual_v1",
    timestamp: new Date().toISOString(),
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 NPC backend with WebSocket on port :${port}`);
  console.log(
    `📡 WebSocket endpoint: wss://robloxapi.essentialcode.com.br/audio-stream`
  );
  console.log(`🔍 Health check: https://robloxapi.essentialcode.com.br/health`);
  console.log(
    `🎵 Audio status: https://robloxapi.essentialcode.com.br/audio-status`
  );
});
