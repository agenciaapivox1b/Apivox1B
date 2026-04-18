# WhatsApp QR Service

Serviço Node.js dedicado para conexão WhatsApp via QR Code usando Baileys.

## 🎯 Propósito

Este serviço fornece conexão WhatsApp via QR Code para o sistema APIVOX, funcionando como um **provider separado** da Meta API oficial.

**Características:**
- ✅ Sessão persistente (Redis)
- ✅ Multi-tenant (cada cliente tem sua sessão)
- ✅ Reconexão automática
- ✅ WebSocket para notificações em tempo real
- ✅ Integração completa com Supabase

## 🏗️ Arquitetura

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   FRONTEND      │◄────▶│   SUPABASE       │◄────▶│  WHATSAPP QR      │
│   (React)       │  WS  │   (Banco/Auth)   │  REST│  SERVICE (Node)     │
└─────────────────┘      └──────────────────┘      └─────────────────────┘
```

## 📋 Pré-requisitos

- Node.js 18+
- Redis (Railway/Upstash ou local)
- Supabase project

## 🚀 Instalação Local

### 1. Clonar e instalar

```bash
cd whatsapp-qr-service
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 3. Iniciar Redis (local)

```bash
# Usando Docker
docker run -d -p 6379:6379 --name redis redis:alpine

# Ou instalar Redis localmente
```

### 4. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 🌐 Deploy no Railway (Recomendado)

### Passo 1: Criar projeto no Railway

```bash
# Instalar Railway CLI (se ainda não tiver)
npm install -g @railway/cli

# Login
railway login

# Inicializar projeto
railway init
```

### Passo 2: Configurar variáveis de ambiente no Railway

No Dashboard do Railway, adicione as variáveis:

```
NODE_ENV=production
PORT=3000
API_KEY=sua-chave-secreta-muito-forte
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key
REDIS_URL=${{Redis.REDIS_URL}}  # Se usar Redis do Railway
```

### Passo 3: Adicionar Redis no Railway

1. No Dashboard, clique em "New"
2. Selecione "Redis"
3. O Railway automaticamente cria a variável `REDIS_URL`

### Passo 4: Deploy

```bash
railway up
```

Ou configure deploy automático via GitHub:
1. Connecte seu repositório no Railway
2. Configure o deploy automático

## 🔌 API Endpoints

### Health Check
```bash
GET /health
```

### Criar Sessão
```bash
POST /api/sessions
Headers: X-API-Key: sua-api-key
Body: {
  "tenantId": "uuid-do-tenant",
  "phoneNumber": "+55 11 99999-9999"  # opcional
}

Response: {
  "success": true,
  "sessionId": "qr_tenantId_abc123",
  "status": "awaiting_qr",
  "qrExpiresIn": 60
}
```

### Obter QR Code
```bash
GET /api/qr/:tenantId
Headers: X-API-Key: sua-api-key

Response: {
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "expiresAt": "2026-01-08T20:45:00Z",
  "expiresIn": 45
}
```

### Status da Sessão
```bash
GET /api/status/:tenantId
Headers: X-API-Key: sua-api-key

Response: {
  "success": true,
  "status": "connected",
  "sessionId": "qr_tenantId_abc123",
  "connectedPhone": "+55 11 99999-9999",
  "connectedAt": "2026-01-08T20:30:00Z",
  "hasQR": false,
  "messagesSent": 42,
  "messagesReceived": 128
}
```

### Enviar Mensagem
```bash
POST /api/messages/send
Headers: 
  X-API-Key: sua-api-key
  Content-Type: application/json

Body: {
  "tenantId": "uuid-do-tenant",
  "to": "5511998887777",
  "message": "Olá! Como posso ajudar?"
}

Response: {
  "success": true,
  "messageId": "BAE5F577E...",
  "timestamp": "2026-01-08T20:30:00Z"
}
```

### Desconectar
```bash
DELETE /api/sessions/:tenantId
Headers: X-API-Key: sua-api-key

Response: {
  "success": true,
  "message": "Sessão desconectada com sucesso"
}
```

## 🔗 WebSocket (Real-time)

Conecte ao WebSocket para receber updates em tempo real:

```javascript
const ws = new WebSocket('wss://seu-servico.railway.app/ws?tenantId=uuid-do-tenant');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'qr':
      console.log('Novo QR:', data.payload.qrCode);
      break;
    case 'connected':
      console.log('Conectado:', data.payload.phone);
      break;
    case 'disconnected':
      console.log('Desconectado:', data.payload.reason);
      break;
    case 'message':
      console.log('Nova mensagem:', data.payload);
      break;
  }
};
```

## 🔐 Segurança

### API Key
Todas as rotas da API (exceto `/health`) requerem o header `X-API-Key`.

### Rate Limiting
Por padrão: 100 requisições por minuto por IP.

### Tenant Isolation
Cada tenant só acessa suas próprias sessões e mensagens.

## 🗄️ Persistência

### Redis (Obrigatório)
- Auth state da sessão
- QR Code temporário
- Status de conexão

### Supabase
- Dados da sessão (`whatsapp_qr_sessions`)
- Contatos
- Conversas
- Mensagens

### Arquivos Locais
- `./sessions/{tenantId}/` - Credenciais Baileys (backup)

## 🔧 Troubleshooting

### Sessão não persiste
Verifique se o Redis está configurado corretamente:
```bash
redis-cli ping  # Deve retornar PONG
```

### QR Code não aparece
- Verifique se a sessão foi criada: `POST /api/sessions`
- Aguarde 5-10 segundos após criar sessão
- QR expira em 60 segundos, gere novamente se necessário

### Conexão cai frequentemente
- Verifique logs: `railway logs`
- Pode ser instabilidade na conexão do WhatsApp Web
- O serviço tenta reconectar automaticamente (5 tentativas)

## 📊 Monitoramento

### Logs
```bash
# Railway
railway logs

# Local
npm run dev  # Ver logs no terminal
```

### Health Check
```bash
curl https://seu-servico.railway.app/health
```

### Métricas
Acesse `/api/status` para ver estatísticas do serviço.

## 🔄 Atualização

### Atualizar no Railway
```bash
# Fazer alterações no código
git add .
git commit -m "Update: ..."
git push origin main

# Deploy automático será acionado
```

## 📚 Recursos

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [Railway Documentation](https://docs.railway.app/)
- [Redis Documentation](https://redis.io/documentation)

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs do serviço
2. Confirme as variáveis de ambiente
3. Teste a conexão Redis
4. Verifique se a API Key está correta no frontend

---

**Desenvolvido para APIVOX** 🚀
