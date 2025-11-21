# 🚀 WhatsSelf - Guia de Início Rápido

## ⚡ Início em 5 Minutos

### 1. Iniciar Backend (Terminal 1)

```bash
cd apps/backend
npm run dev
```

**Aguarde ver**:
```
🚀 API rodando na porta 3001
📡 WebSocket disponível em ws://localhost:3001/socket.io
👥 Admin padrão: admin@whatself.com
```

### 2. Iniciar Frontend (Terminal 2)

```bash
cd WhatsSelf
npm run dev
```

**Aguarde ver**:
```
➜  Local:   http://localhost:5173/
```

### 3. Acessar Sistema

1. Abra: **http://localhost:5173**
2. Login:
   - Email: `admin@whatself.com`
   - Senha: `Admin`
3. Clique em "Entrar"

### 4. Conectar WhatsApp

1. No Dashboard, clique em "Ver QR Code"
2. Abra WhatsApp no celular
3. Vá em **Aparelhos conectados** → **Conectar aparelho**
4. Escaneie o QR Code
5. Aguarde "WhatsApp Conectado" aparecer

**Pronto! Sistema operacional! 🎉**

### Pré-requisito: navegador para o WhatsApp

O WhatsApp roda via Chromium/Chrome em modo headless. Em ambientes Linux/WSL instale um navegador compatível **antes** de iniciar o backend:

```bash
sudo apt update
sudo apt install -y chromium-browser || sudo apt install -y chromium
```

Se preferir outro caminho, aponte `PUPPETEER_EXECUTABLE_PATH` no `.env` para o binário desejado. Para desabilitar temporariamente o WhatsApp (por exemplo, apenas testar a API), defina `SKIP_WHATSAPP=true`.

### Rodando direto no Windows (sem WSL)

1. Instale **Node.js 20 LTS** (msi) e **Google Chrome** (ou Edge/Chromium).
2. Abra PowerShell:
   ```powershell
   cd C:\path\para\WhatsSelf
   copy .env.example .env
   notepad .env   # ajuste PUPPETEER_EXECUTABLE_PATH para o caminho do Chrome
   npm install
   npm --prefix apps/backend install
   npx prisma generate
   npx prisma db push
   ```
3. Em dois terminais PowerShell:
   ```powershell
   npm run dev:backend
   npm run dev:frontend
   ```
4. Acesse `http://localhost:5173`, faça login e conecte o WhatsApp normalmente.

---

## 📋 Checklist Pós-Instalação

### Obrigatório

- [ ] Trocar senha do admin
  - Vá em Settings → Change Password
  - Nova senha: (algo seguro)

- [ ] Trocar `JWT_SECRET`
  - Edite `.env`
  - Altere `JWT_SECRET` para algo aleatório
  - Reinicie backend

### Recomendado

- [ ] Configurar horário comercial
  - Dashboard → Business Hours
  - Defina horário de atendimento

- [ ] Criar primeiro template
  - Templates → Novo Template
  - Ex: Boas-vindas, FAQ, etc.

- [ ] Criar primeiro trigger
  - Triggers → Novo Trigger
  - Associe ao template criado

---

## 🎯 Fluxo de Uso Típico

### Criar Automação Simples

1. **Criar Template**
   ```
   Templates → Novo
   Key: saudacao
   Content: Olá! Como posso ajudá-lo?
   Salvar
   ```

2. **Criar Trigger**
   ```
   Triggers → Novo
   Tipo: contains
   Padrão: oi
   Template: saudacao
   Salvar
   ```

3. **Testar**
   - Envie "oi" para o WhatsApp conectado
   - Bot responde automaticamente!

### Criar Flow Conversacional

1. **Criar Templates para cada step**
   ```
   welcome: Bem-vindo! Digite 1 para Vendas ou 2 para Suporte
   vendas: Ótimo! Nossa equipe de vendas entrará em contato.
   suporte: Certo! Qual seu problema?
   ```

2. **Criar Flow**
   ```
   Flows → Novo Flow
   Nome: Atendimento
   Steps:
     1. Send Template (welcome)
     2. Collect Input → Transições: 1→vendas, 2→suporte
     3. Send Template (vendas ou suporte)
     4. End
   Publicar
   ```

3. **Criar Trigger para iniciar**
   ```
   Triggers → Novo
   Pattern: menu
   Flow: Atendimento
   ```

---

## 🔧 Configurações Importantes

### Rate Limiting

Edite `.env`:
```env
RATE_MAX_PER_MIN=12              # Máximo global por minuto
RATE_PER_CONTACT_PER_5MIN=2      # Máximo por contato a cada 5 min
```

### Horário Comercial

Edite `.env` ou use a UI:
```env
BUSINESS_HOURS=09:00-18:00       # 9h às 18h
```

### Circuit Breaker

Edite `.env`:
```env
CB_FAIL_RATE_OPEN=0.25           # Abre com 25% de falhas
CB_MIN_ATTEMPTS=20               # Mínimo de tentativas antes de abrir
```

---

## 🆘 Troubleshooting

### WhatsApp não conecta

**Problema**: QR Code não aparece
**Solução**:
1. Verifique logs do backend
2. Confira se há Chromium/Chrome instalado no Linux (`which chromium-browser`)
   - Se estiver usando WSL/Ubuntu: `sudo apt install -y chromium-browser`
   - Ou configure `PUPPETEER_EXECUTABLE_PATH` para um binário válido
3. Delete pasta `.wwebjs_auth`
4. Reinicie backend
5. Novo QR Code será gerado

### Token expirado

**Problema**: "Unauthorized" ao fazer requisições
**Solução**: Faça logout e login novamente

### Mensagens não estão sendo enviadas

**Problema**: Fila não processa
**Solução**:
1. Verifique `/status` - Queue status
2. Verifique Circuit Breaker status
3. Se OPEN, faça reset: `/circuit-breaker/reset`

### Frontend não conecta ao backend

**Problema**: Erro de conexão
**Solução**:
1. Verifique se backend está rodando (porta 3001)
2. Verifique `.env.local` do frontend
3. CORS: confirme `API_CORS_ORIGIN` no backend `.env`

---

## 📊 Monitoramento

### Ver Status em Tempo Real

```bash
# Via CLI
curl http://localhost:3001/status \
  -H "Authorization: Bearer <seu_token>"

# Via Dashboard
Acesse /dashboard - atualiza automaticamente
```

### Ver Mensagens

```bash
# Via CLI
curl http://localhost:3001/messages \
  -H "Authorization: Bearer <seu_token>"

# Via Dashboard
Acesse /messages - atualiza a cada 5 segundos
```

### Ver Fila

```bash
# Via CLI
curl http://localhost:3001/queue/status \
  -H "Authorization: Bearer <seu_token>"

# Via Dashboard
Card "Fila" no dashboard
```

---

## 🎓 Exemplos de Uso

### Enviar Mensagem via API

```bash
curl -X POST http://localhost:3001/send \
  -H "Authorization: Bearer <seu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "text": "Olá! Esta é uma mensagem automática."
  }'
```

### Broadcast para Todos

```bash
curl -X POST http://localhost:3001/broadcast \
  -H "Authorization: Bearer <seu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Novidade! Confira nosso novo produto.",
    "optedInOnly": true
  }'
```

### Criar Usuário Operador

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Authorization: Bearer <seu_token_admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operador@empresa.com",
    "password": "senha123",
    "name": "João Silva",
    "role": "operator"
  }'
```

---

## 💡 Dicas de Uso

### Performance

- **Use templates com variantes** para humanização
- **Configure cooldowns** em triggers para evitar spam
- **Monitore o Circuit Breaker** - se abre frequentemente, reduza volume

### Boas Práticas

- **Sempre teste** triggers com `/simulate` antes de ativar
- **Use flows para conversas complexas**, triggers para respostas simples
- **Respeite opt-outs** - o sistema detecta automaticamente PARAR/SAIR
- **Monitore business hours** - mensagens fora do horário recebem resposta automática

### Segurança

- **Troque senha padrão** imediatamente
- **Use JWT_SECRET forte** em produção
- **Não commite** `.env` ou `.wwebjs_auth/`
- **Backup regular** do banco de dados

---

## 🔄 Atualizações

### Resetar Sistema

```bash
# Limpar banco de dados
cd apps/backend
rm prisma/dev.db
npx prisma db push

# Limpar sessão WhatsApp
rm -rf .wwebjs_auth

# Reiniciar
npm run dev
```

### Atualizar Dependências

```bash
# Backend
cd apps/backend
npm update

# Frontend
cd WhatsSelf
npm update
```

---

## 📞 Suporte

### Logs

Todos os serviços logam informações importantes:
- **Backend**: Console com Pino (JSON estruturado)
- **Frontend**: Browser console

### Health Check

```bash
curl http://localhost:3001/health
# Retorna: {"ok":true}
```

### Debug Mode

Edite `.env`:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 🎉 Pronto para Produção?

Antes de fazer deploy:

1. ✅ Trocar `JWT_SECRET`
2. ✅ Trocar senha do admin
3. ✅ Configurar PostgreSQL (substituir SQLite)
4. ✅ Configurar CORS adequadamente
5. ✅ Usar HTTPS
6. ✅ Configurar backup automático
7. ✅ Monitorar logs em produção
8. ✅ Rate limits adequados ao volume

---

## 📚 Mais Informações

- **Documentação Completa**: `docs/reports/IMPLEMENTATION_COMPLETE.md`
- **Integração Frontend**: `docs/reports/FRONTEND_INTEGRATION.md`
- **Guia de Desenvolvimento**: `docs/guides/CLAUDE.md`
- **API Reference**: `docs/technical/API.md`
- **Database Schema**: `docs/technical/DATABASE.md`

---

**✨ Aproveite o WhatsSelf! ✨**
