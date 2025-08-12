// server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import OpenAI from 'openai'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Validação básica do payload
const Payload = z.object({
  npc_key: z.string(),
  npc_name: z.string(),
  system_message: z.string(),
  user_id: z.number(),
  user_name: z.string(),
  user_display: z.string(),
  user_text: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system','user','assistant']),
    content: z.string()
  })),
  max_tokens: z.number().optional()
})

const MAX_BALAO = 240

app.post('/npc-chat', async (req, res) => {
  try {
    // Autenticação simples
    const token = req.header('X-Auth-Token')
    if (!token || token !== process.env.SHARED_TOKEN)
      return res.status(401).json({ error: 'unauthorized' })

    const p = Payload.parse(req.body)

    // Opcional: reforçar formato curto no system
    const systemPrefix = `Responda em frases curtas e claras, cada balão ≤ ${MAX_BALAO} caracteres. Evite jargão.`
    const messages = [
      { role: 'system', content: systemPrefix .. '\n\n' .. p.system_message } // (JS usa +, ajustado abaixo)
    ]

    // Em JS, concatena com +
    messages[0].content = systemPrefix + '\n\n' + p.system_message

    for (const m of p.messages) messages.push(m)

    // Chamada ao modelo (pode usar gpt-4o ou o que preferir)
    const rsp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: Math.min(p.max_tokens ?? 128, 256),
      temperature: 0.7
    })

    const reply = rsp.choices?.[0]?.message?.content?.trim() || '...'

    // Opcional: sanitização simples
    const clean = reply.replace(/\s+/g, ' ')

    return res.json({ reply: clean })
  } catch (err) {
    console.error(err)
    return res.status(400).json({ error: 'bad_request' })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`NPC backend on :${port}`))
