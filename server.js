// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Em JS, concatena com +
    // messages[0].content = systemPrefix + '\n\n' + p.system_message

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

    const elapsedMs = Date.now() - startedAt;
    console.log(`[npc-chat][req:${reqId}] out ${elapsedMs}ms`, {
      replyPreview: clean.slice(0, 200),
      length: clean.length,
    });

    return res.json({ reply: clean });
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[npc-chat][req:${reqId}] error ${elapsedMs}ms`, err);
    return res.status(400).json({ error: "bad_request" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`NPC backend on :${port}`));
