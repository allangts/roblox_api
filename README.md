# Roblox NPC API

API para chat com NPCs usando OpenAI GPT-4.

## 🚀 Deploy em Produção

### Pré-requisitos

- Servidor Ubuntu/Debian
- Domínio configurado
- Acesso SSH ao servidor

### Passo a Passo Completo

#### 1. Preparar o Servidor

```bash
# Conectar ao servidor via SSH
ssh usuario@seu-servidor.com

# Clonar o repositório
git clone https://github.com/seu-usuario/roblox_api.git
cd roblox_api

# Executar script de configuração
chmod +x setup-server.sh
./setup-server.sh
```

#### 2. Configurar Domínio

1. Acesse seu provedor de DNS
2. Crie um registro A para `api.seudominio.com` apontando para o IP do seu servidor
3. Aguarde a propagação (pode levar até 24h)

#### 3. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano .env
```

Adicione as seguintes variáveis:

```env
OPENAI_API_KEY=sua_chave_openai_aqui
SHARED_TOKEN=seu_token_secreto_aqui
NODE_ENV=production
PORT=3000
```

#### 4. Configurar SSL/HTTPS

```bash
# Gerar certificado SSL
sudo certbot --nginx -d api.seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 5. Fazer Deploy

```bash
# Executar deploy
chmod +x deploy.sh
./deploy.sh
```

### 📁 Estrutura de Arquivos

```
roblox_api/
├── server.js              # Servidor principal
├── package.json           # Dependências
├── .env                   # Variáveis de ambiente
├── nginx.conf            # Configuração do Nginx
├── ecosystem.config.js   # Configuração do PM2
├── deploy.sh             # Script de deploy
├── setup-server.sh       # Script de configuração
└── logs/                 # Logs da aplicação
```

### 🔧 Comandos Úteis

```bash
# Verificar status da aplicação
pm2 status

# Ver logs
pm2 logs roblox-npc-api

# Reiniciar aplicação
pm2 restart roblox-npc-api

# Parar aplicação
pm2 stop roblox-npc-api

# Verificar status do Nginx
sudo systemctl status nginx

# Testar configuração do Nginx
sudo nginx -t
```

### 🌐 Endpoints

- **POST** `https://api.seudominio.com/npc-chat`
  - Headers: `X-Auth-Token: seu_token`
  - Body: JSON com dados do NPC e mensagem

### 🔒 Segurança

- ✅ HTTPS/SSL configurado
- ✅ Firewall ativo
- ✅ Headers de segurança
- ✅ Autenticação por token
- ✅ Rate limiting (configurar se necessário)

### 📊 Monitoramento

- PM2 para gerenciamento de processos
- Logs em `/var/log/nginx/` e `./logs/`
- Renovação automática de SSL

### 🆘 Troubleshooting

**Erro 502 Bad Gateway:**

```bash
# Verificar se a aplicação está rodando
pm2 status

# Verificar logs
pm2 logs roblox-npc-api
```

**Erro SSL:**

```bash
# Renovar certificado manualmente
sudo certbot renew

# Verificar configuração
sudo nginx -t
```

**Aplicação não inicia:**

```bash
# Verificar variáveis de ambiente
cat .env

# Verificar logs
pm2 logs roblox-npc-api
```

### 📞 Suporte

Para problemas ou dúvidas, verifique:

1. Logs da aplicação
2. Logs do Nginx
3. Status dos serviços
4. Configuração de DNS
