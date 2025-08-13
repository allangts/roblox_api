#!/bin/bash

# Script de Configuração do Servidor
# Uso: ./setup-server.sh

set -e

echo "🔧 Configurando servidor para produção..."

# 1. Atualizar sistema
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 20.x
echo "📥 Instalando Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar Nginx
echo "🌐 Instalando Nginx..."
sudo apt install nginx -y

# 4. Instalar Certbot para SSL
echo "🔒 Instalando Certbot..."
sudo apt install certbot python3-certbot-nginx -y

# 5. Instalar PM2 globalmente
echo "⚡ Instalando PM2..."
sudo npm install -g pm2

# 6. Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 7. Criar usuário para a aplicação (opcional)
echo "👤 Criando usuário para aplicação..."
sudo adduser --disabled-password --gecos "" appuser || true

# 8. Configurar Nginx
echo "⚙️ Configurando Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/roblox-npc-api
sudo ln -sf /etc/nginx/sites-available/roblox-npc-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 9. Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

# 10. Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Configuração do servidor concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure seu domínio para apontar para este servidor"
echo "2. Execute: sudo certbot --nginx -d api.seudominio.com"
echo "3. Execute: ./deploy.sh"
echo ""
echo "🌐 Seu servidor está pronto para receber a aplicação!" 