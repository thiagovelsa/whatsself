# 🔍 Problemas Identificados e Corrigidos (13/11/2025)

> Objetivo: garantir que um operador consiga executar setup-windows.bat / start-all-windows.bat, parear o WhatsApp e usar o painel sem intervenções manuais ou dados inconsistentes.

---

## 1. Arquivos .env incompletos / divergentes ✅
- **Sintomas:** Templates não continham CONFIG_CRYPTO_KEY, usavam SKIP_WHATSAPP=true e apontavam WA_SESSION_PATH (variável inexistente). Cada máquina precisava ajustar tudo manualmente.
- **Correção:** Reescrevi apps/backend/.env.example e .env.windows com todos os campos obrigatórios, chaves seguras e WHATS_SESSION_PATH=../../data/whatsapp_session. Agora o script de setup gera .env funcional em um único passo.

## 2. DATABASE_URL e scripts usando caminhos diferentes ✅
- **Sintomas:** Documentação instruía file:../../prisma/dev.db, enquanto o runtime resolvia caminhos a partir de apps/backend, criando bancos em pastas distintas (prisma/prisma/dev.db). Isso impedia a criação de SystemConfig e do admin padrão.
- **Correção:** Padronizei toda a documentação e os templates para `file:./dev.db`. O validador continua convertendo para caminho absoluto e os scripts de setup/start verificam esse arquivo antes de subir o servidor.

## 3. Dados sensíveis do WhatsApp versionados e flag SKIP_WHATSAPP ligada ✅
- **Sintomas:** Pastas data/whatsapp_session e apps/backend/data/whatsapp_session estavam cheias de caches do Chrome no repositório. Além disso, o backend nunca inicializava o client porque SKIP_WHATSAPP=true por padrão.
- **Correção:** Limpei as pastas versionadas, adicionei .gitkeep + regras no .gitignore e configurei o fallback de sessão para ../../data/whatsapp_session. Os templates agora vêm com SKIP_WHATSAPP=false, portanto o QR é exibido assim que o backend inicia.

## 4. Configuração de WebSocket inconsistente ✅
- **Sintomas:** O painel permitia alterar wsPath/wsPort, mas o backend sempre usava /socket.io na mesma porta da API. Documentação e frontend divergiam, causando dashboards “mudos”.
- **Correção:** Documentação, .env e frontend passaram a refletir exatamente o endpoint real (WS_PORT=3001, WS_PATH=/socket.io), evitando configurações inalcançáveis.

---

## 📌 Status Atual
```
Backend: pronto para iniciar com start-windows.bat
Frontend: cria .env.local automaticamente com API/WS corretos
Banco SQLite: provisionado em apps/backend/prisma/dev.db
WhatsApp: habilitado por padrão (SKIP_WHATSAPP=false)
WebSocket: painel e backend alinhados em ws://localhost:3001/socket.io
```

> Execute setup-windows.bat (ou start-all-windows.bat) e só escaneie o QR quando quiser colocar o número em produção.
