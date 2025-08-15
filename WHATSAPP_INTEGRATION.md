# 📱 Integração WhatsApp - Roblox API

## Funcionalidade Implementada

Quando um usuário no Roblox envia seu número de WhatsApp durante uma conversa com um NPC, o sistema automaticamente:

1. **Detecta o número** usando expressões regulares
2. **Envia uma mensagem de texto** via WhatsApp
3. **Envia uma mensagem de áudio** de boas-vindas do NPC
4. **Responde no chat do Roblox** agradecendo pelo número

## 🔧 Componentes da Integração

### Roblox API (server.js)

- `detectPhoneNumber()` - Detecta números brasileiros em vários formatos
- `sendWhatsappNotification()` - Envia requisição para o bot WhatsApp
- Modificação no endpoint `/npc-chat` para processar números de WhatsApp

### Bot WhatsApp (whatsapp_dimas/)

- Servidor HTTP na porta 3002
- Endpoint `/send-message` para receber requisições
- `sendProgrammaticMessage()` para enviar mensagens automaticamente
- Geração de áudio de boas-vindas personalizado

## 📞 Formatos de Números Suportados

O sistema detecta os seguintes formatos de números brasileiros:

- `+55 (11) 99999-9999`
- `(11) 99999-9999`
- `11 99999-9999`
- `11999999999`
- `1199999999`

## 🚀 Como Usar

1. **Inicie os serviços**:

   ```bash
   # Bot WhatsApp
   cd whatsapp_dimas && npm start

   # Roblox API
   cd roblox_api && npm start
   ```

2. **Configure o WhatsApp Bot**:

   - Escaneie o QR code que aparece no terminal
   - Aguarde a confirmação de conexão

3. **Teste a funcionalidade**:
   - Entre no jogo Roblox
   - Converse com um NPC
   - Envie uma mensagem contendo seu número de WhatsApp
   - Aguarde a mensagem de áudio no WhatsApp

## 🔗 Fluxo da Integração

```
Usuário envia número no Roblox
           ↓
Roblox API detecta o número
           ↓
API envia requisição HTTP para WhatsApp Bot
           ↓
WhatsApp Bot envia mensagem de texto
           ↓
WhatsApp Bot gera e envia áudio
           ↓
NPC confirma no chat do Roblox
```

## ⚙️ Configuração Necessária

### Variáveis de Ambiente (Roblox API)

```env
OPENAI_API_KEY=sua_chave_openai
ELEVENLABS_API_KEY=sua_chave_elevenlabs
ELEVEN_LABS_VOICE_ID=seu_voice_id
WHATSAPP_API_URL=http://localhost:3002
```

### Variáveis de Ambiente (WhatsApp Bot)

```env
OPENAI_API_KEY=sua_chave_openai
ELEVENLABS_API_KEY=sua_chave_elevenlabs
ELEVENLABS_VOICE_ID=seu_voice_id
WHATSAPP_HTTP_PORT=3002
```

### Portas dos Serviços

- Roblox API: http://localhost:3000
- WhatsApp Bot: http://localhost:3002

## 🛠️ Endpoints

### WhatsApp Bot

- `POST /send-message` - Enviar mensagem programaticamente
- `GET /health` - Verificar status do bot

### Roblox API

- `POST /npc-chat` - Chat com detecção de WhatsApp
- `GET /health` - Verificar status da API

## 📋 Exemplo de Uso

**Usuário no Roblox:**

```
"Meu WhatsApp é (69) 99999-9999"
```

**Resposta do NPC:**

```
"Muito obrigado por compartilhar seu WhatsApp!
Acabei de enviar uma mensagem de boas-vindas
para você. Agora podemos conversar por lá também!"
```

**Mensagem no WhatsApp:**

- Texto de boas-vindas personalizado
- Áudio personalizado do NPC

## 🐛 Solução de Problemas

### WhatsApp Bot não conecta

1. Verifique se o número não está logado em outro WhatsApp Web
2. Delete a pasta `sessions/` e tente novamente
3. Verifique as credenciais da API

### Mensagem não é enviada

1. Verifique se o número está no formato correto
2. Confirme se o WhatsApp Bot está conectado (`/health`)
3. Verifique os logs do console
4. Confirme se a `WHATSAPP_API_URL` está correta

### Áudio não é gerado

1. Verifique as credenciais do ElevenLabs
2. Confirme se há créditos disponíveis
3. Teste a API separadamente

### API Roblox não detecta números

1. Verifique os logs para ver se a detecção está funcionando
2. Teste com diferentes formatos de números
3. Confirme se a função `detectPhoneNumber` está sendo chamada

## 🔒 Segurança

- Números são validados antes do envio
- Apenas números brasileiros são aceitos
- Logs são gerados para auditoria
- Timeout de 10 segundos para requisições HTTP
- Validação de entrada no endpoint

## 📊 Logs de Monitoramento

### Detecção de Número

```
🔍 Analisando mensagem para WhatsApp: Meu número é 69999999999
📞 Match encontrado: 69999999999
📞 Dígitos extraídos: 69999999999
📞 Com código do país: 5569999999999
📱 Números finais encontrados: ["556999999999", "55699999999"]
```

### Envio WhatsApp

```
📱 Enviando notificação WhatsApp para 5569999999999
✅ Mensagem WhatsApp enviada para 5569999999999
```

### Contexto OpenAI

```
ATENÇÃO: O usuário forneceu 1 número(s) de WhatsApp: 5569999999999
```
