#!/bin/bash

# Script de Deploy para Produção
# Uso: ./deploy.sh

set -e  # Para o script se houver erro

echo "🚀 Iniciando deploy da Roblox NPC API..."

# 1. Atualizar código do repositório
echo "📥 Atualizando código..."
git pull origin main

# 2. Instalar dependências
echo "📦 Instalando dependências..."
npm ci --production

# 3. Criar diretório de logs se não existir
echo "📁 Criando diretório de logs..."
mkdir -p logs

# 4. Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 não encontrado. Instalando..."
    npm install -g pm2
fi

# 5. Parar aplicação se estiver rodando
echo "⏹️ Parando aplicação atual..."
pm2 stop roblox-npc-api || true
pm2 delete roblox-npc-api || true

# 6. Iniciar aplicação em produção
echo "▶️ Iniciando aplicação em produção..."
pm2 start ecosystem.config.cjs --env production

# 7. Salvar configuração do PM2
echo "💾 Salvando configuração do PM2..."
pm2 save

# 8. Configurar PM2 para iniciar com o sistema
echo "🔧 Configurando PM2 para iniciar com o sistema..."
pm2 startup

# 9. Verificar status
echo "📊 Status da aplicação:"
pm2 status

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Aplicação rodando em: https://robloxapi.essentialcode.com.br"
echo "📝 Logs disponíveis em: pm2 logs roblox-npc-api" 