# Estrutura Geral – WhatsSelf (Nov/2025)

## Visão panorâmica
- `apps/backend`: API Express + integrações WhatsApp (`src`, `prisma`, `scripts`, `temp`, `logs`, `data`, `.wwebjs_auth`).  
- `frontend`: SPA Vite/React destinada ao painel.  
- `landing`: site estático (marketing) não integrado ao fluxo principal.  
- `data/whatsapp_session`: sessão raiz compartilhada, mas o backend também possui `apps/backend/data/whatsapp_session` (duplicidade).  
- `docs`: arquitetura, guias técnicos, relatórios.  
- `.claude`, `.cursor`: artefatos de assistência.  
- `node_modules` na raiz apenas para `concurrently`.

## Estruturas relevantes mapeadas
- `apps/backend/src`: serviços core (`automationOrchestrator`, `messageQueue`, `circuitBreaker`, `businessRules`, `whatsappService`, `websocketService`, `systemConfigService`, `configSyncService`), domínio (`flowEngine`, `triggerMatcher`), middleware (`auth.ts`), testes (`__tests__`).  
- `apps/backend/prisma`: `schema.prisma`, bancos SQLite (`dev.db`, `test.db`, `test-api.db`).  
- `apps/backend/scripts`: automações (`init-config.mjs`, `sync-config.mjs`, `setup-test-db.js`, etc.).  
- `frontend/src/react-app`: páginas, serviços, stores Zustand, serviços de API/WS.  
- `frontend/scripts`: utilitários de build/deploy Windows (não integrados ao `start.bat`).  
- `landing` apenas três arquivos (`index.html`, `styles.css`, `script.js`).

## Arquivos/pastas suspeitas ou redundantes
1. `%LOCALAPPDATA%` dentro de `apps/backend/` (contém `Temp/whatsself`). Provavelmente criado ao expandir variável em script; deve ser excluído do repo e adicionado ao `.gitignore`.  
2. `apps/backend/temp/windows` e `apps/backend/temp/` estão vazios; validar necessidade ou remover.  
3. Sessões duplicadas (`data/whatsapp_session` na raiz e `apps/backend/data/whatsapp_session`). O backend espera caminho relativo (`WHATS_SESSION_PATH=../../data/whatsapp_session`), então manter apenas a raiz e limpar o espelho dentro de `apps/backend/data`.  
4. `.wwebjs_auth` presente na raiz e em `apps/backend/.wwebjs_auth`. Somente um diretório deve existir (preferível `data/whatsapp_session`).  
5. `landing/` não participa do start atual; decidir se vira módulo oficial ou se sai do repositório.  
6. `node_modules` na raiz + `apps/backend/node_modules` + `frontend/node_modules`: esperado, porém os scripts `repair-windows.bat` e `start.bat` não limpam caches antigos (avaliar `cleanup-windows.bat`).  
7. `frontend/dist` e `apps/backend/dist` versionados? (presentes no workspace). Se estiverem no Git, remover e garantir `.gitignore` cobre `dist/`.  
8. `openapi.yaml` solto na raiz sem referência no README. Confirmar se está atualizado ou mover para `docs/technical/API.md`.

## Convenções e observações
- Convenção de nomes segue `kebab` para scripts `.bat` e `.mjs`, e `camelCase` para serviços TS.  
- `package-lock.json` está na raiz e nos pacotes, mas `.gitignore` ignora `package-lock.json` – conflito: ou versionar (recomendado) e remover da ignore list, ou apagar locks.  
- Repositório contém `frontend` fora de `apps/`. Documentação e scripts assumem `apps/frontend` inexistente; alinhar (mover pasta ou ajustar docs/scripts).  
- Logs ficam em `logs/` (raiz) e `apps/backend/logs/`. `start.bat` não garante criação; `env.validator` cria.  
- Documentação extensa em `docs/`; falta referenciar novos scripts (`fix-whatsself.bat`, `repair-windows.bat`, `start.bat`).

## Próximos passos estruturais
1. Remover `%LOCALAPPDATA%` e garantir `.gitignore` cobre pastas temporárias.  
2. Consolidar sessão do WhatsApp em `data/whatsapp_session` e ajustar scripts que criam `apps/backend/data`.  
3. Equalizar documentação/scripts para usar `frontend/` (ou mover para `apps/frontend`).  
4. Decidir destino de `landing/` (integrar ao start único ou separar).  
5. Revisar `.gitignore` vs arquivos rastreados (especialmente `package-lock.json`, `dist/`, bancos `.db`).  
6. Atualizar start scripts para detectar pastas duplicadas e sugerir limpeza automática.

