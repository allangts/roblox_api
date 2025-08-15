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

app.post("/npc-chat", async (req, res) => {
  const reqId = randomUUID().slice(0, 8);
  console.log(`[${reqId}] Recebendo requisição NPC chat`);

  try {
    const body = Payload.parse(req.body);
    const { npc_key, npc_name, user_text, messages, max_tokens = 150 } = body;

    console.log(`[${reqId}] NPC: ${npc_name}, User: ${user_text}`);

    // Gerar resposta com OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
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
