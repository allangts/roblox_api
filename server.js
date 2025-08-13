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

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configurações ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

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
          model_id: "eleven_monolingual_v1",
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
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
};

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("Cliente WebSocket conectado");
  connectedClients.add(ws);

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
  const startedAt = Date.now();
  try {
    // Autenticação simples
    const token = req.header("X-Auth-Token");
    if (!token || token !== process.env.SHARED_TOKEN) {
      console.warn(`[npc-chat][req:${reqId}] unauthorized from ${req.ip}`);
      return res.status(401).json({ error: "unauthorized" });
    }

    const p = Payload.parse(req.body);

    console.log(`[npc-chat][req:${reqId}] in`, {
      ip: req.ip,
      npc: p.npc_key,
      userId: p.user_id,
      user: p.user_name,
      text: p.user_text,
    });

    // Opcional: reforçar formato curto no system
    const systemPrefix = `Responda em frases curtas e claras, cada balão ≤ ${MAX_BALAO} caracteres. Evite jargão.`;
    const messages = [
      { role: "system", content: systemPrefix + "\n\n" + p.system_message },
    ];

    for (const m of p.messages) messages.push(m);

    // Chamada ao modelo (pode usar gpt-4o ou o que preferir)
    const rsp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: Math.min(p.max_tokens ?? 128, 256),
      temperature: 0.7,
    });

    const reply = rsp.choices?.[0]?.message?.content?.trim() || "...";

    // Opcional: sanitização simples
    const clean = reply.replace(/\s+/g, " ");

    // 1. PRIMEIRO: Gerar áudio com ElevenLabs
    let audioBuffer = null;
    try {
      console.log(`[npc-chat][req:${reqId}] generating audio for: "${clean}"`);
      audioBuffer = await generateAudio(clean);
      console.log(`[npc-chat][req:${reqId}] audio generated successfully`);
    } catch (audioError) {
      console.error(
        `[npc-chat][req:${reqId}] audio generation failed:`,
        audioError
      );
      // Continue mesmo se o áudio falhar
    }

    // 2. SEGUNDO: Enviar para clientes WebSocket (se houver áudio)
    if (audioBuffer && connectedClients.size > 0) {
      const audioData = {
        type: "audio_message",
        id: reqId,
        npc_name: p.npc_name,
        npc_key: p.npc_key,
        reply: clean,
        timestamp: new Date().toISOString(),
        audio_base64: audioBuffer.toString("base64"),
      };

      broadcastToClients(audioData);
      console.log(
        `[npc-chat][req:${reqId}] audio sent to ${connectedClients.size} clients`
      );
    }

    // 3. TERCEIRO: Enviar resposta para o Roblox
    const elapsedMs = Date.now() - startedAt;
    console.log(`[npc-chat][req:${reqId}] out ${elapsedMs}ms`, {
      replyPreview: clean.slice(0, 200),
      length: clean.length,
      audioGenerated: !!audioBuffer,
      clientsNotified: connectedClients.size,
    });

    return res.json({ reply: clean });
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[npc-chat][req:${reqId}] error ${elapsedMs}ms`, err);
    return res.status(400).json({ error: "bad_request" });
  }
});

// Endpoint para verificar status dos clientes WebSocket
app.get("/audio-status", (req, res) => {
  res.json({
    connected_clients: connectedClients.size,
    status: "active",
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () =>
  console.log(`NPC backend with WebSocket on :${port}`)
);
