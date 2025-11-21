# Auditoria de Variáveis de Ambiente – WhatsSelf (Nov/2025)

## Arquivos analisados
| Local | Situação Atual | Observações |
| --- | --- | --- |
| `.env` (raiz) | **Não utilizado pelo runtime** | Replica subset do backend, mas nem `start.bat` nem `envValidator` o consomem. Causa confusão; sugere-se substituí-lo por instruções apontando para `apps/backend/.env`. |
| `apps/backend/.env` | **Em uso** | Valores coerentes, porém `WHATS_SESSION_PATH=./data/whatsapp_session` gera sessão dentro de `apps/backend/data`. Recomenda-se usar `../../data/whatsapp_session` (padrão do `env.validator.ts`) e armazenar fora do pacote. |
| `apps/backend/.env.example` | **Desatualizado** | `DATABASE_URL=file:./prisma/dev.db` gera caminho inválido (fica `prisma/prisma/dev.db`). Falta `WINDOWS_*`, `HUMANIZER_*` e `CB_*` coerentes com `env.validator.ts`. |
| `apps/backend/.env.windows` | **Redundante** | Mesmo problema do `.env.example`, além de duplicar tabela sem variações reais. |
| `frontend/.env.example` | **Parcial** | `VITE_WS_URL` vazio e não menciona `VITE_WS_PATH`. Usuários ficam sem saber caminho do Socket.IO. |
| `frontend/.env.local` | **Ok (dev)** | Aponta para `http://localhost:3001` e `ws://localhost:3001`, mas não define `VITE_WS_PATH` explicitamente. |

## Divergências entre `.env` ↔ `env.validator.ts` / `SystemConfig`
1. **Sessão WhatsApp**: padrão do validator (`../../data/whatsapp_session`) × `.env` atual (`./data/whatsapp_session`). Resultado: duas árvores `data/whatsapp_session` (raiz e apps/backend).  
2. **Campos faltantes quando `.env` é gerado por script**: `start.bat`/`repair-windows.bat` criam apenas ~13 variáveis e ignoram `BUSINESS_HOURS`, `TIMEZONE`, `HUMANIZER_*`, `CB_*`, `WINDOWS_*`. O validator aplica defaults silenciosos; `SystemConfig` fica inconsistente até rodar `config:init`.  
3. **Variáveis órfãs**: scripts adicionam `API_PORT` e `CIRCUIT_BREAKER_ENABLED` que não existem em `env.validator.ts` nem no código (exceto `API_PORT` num script de teste).  
4. **Valores hardcoded inseguros**: `DEFAULT_ADMIN_PASSWORD=Admin@123456` e `JWT_SECRET=whatsself_secret_key_2024_Admin@123` sempre iguais quando `.env` é autogerado. Embora aceitáveis para dev, violam requisito de “nenhuma intervenção manual” em cenários multiusuário; precisam ser randomizados e exibidos ao usuário.  
5. **Frontend não herda PATH do WS**: `VITE_WS_PATH` tem default `/socket.io`, mas falta no `.env.local` gerado automaticamente; se o backend mudar via painel, o frontend não acompanha.  
6. **`.env` raiz aponta `WHATS_SESSION_PATH=.wwebjs_auth`** (pasta antiga). Inconsistente com `env.validator.ts` e `systemConfigService` (que moveu sessões para `data/whatsapp_session`).  
7. **`.env.example` não explica sincronização** (`npm run config:init` / `repair-windows.bat`).  

## Hardcodes encontrados que deveriam virar configuração
| Local | Valor | Ação proposta |
| --- | --- | --- |
| `apps/backend/src/services/businessRules.ts` | `FIRST_CONTACT_MESSAGE` default fixo | expor `FIRST_CONTACT_MESSAGE` em `.env` (opcional) e documentar. |
| `apps/backend/src/services/messageQueue.ts` (verificar) | limites 12/min e 2/5min | já existem em env + SystemConfig, ok. |
| `apps/backend/src/services/humanizer.ts` | delays 3-7s / typing 1.5-3.5s | também vêm do config. |
| `frontend/src/react-app/services/apiService.ts` | baseURL derivado de `VITE_API_URL` | ok. |
| `start.bat` | URLs do frontend/backend fixos | alinhar com `.env` / `SystemConfig`. |

## Ações corretivas recomendadas
1. **Atualizar templates** (`apps/backend/.env.example`, `.env.windows`, `frontend/.env.example`, raiz `.env.example`) com todos os campos aceitos por `env.validator.ts`, exemplos seguros e comentários claros.  
2. **Unificar sessão WhatsApp**: ajustar `.env` gerado + scripts para usar `../../data/whatsapp_session` e limpar `apps/backend/data/whatsapp_session`.  
3. **Reescrever geração automática** (`start.bat` / `repair-windows.bat`) para:
   - Produzir `.env` completo (ou copiar do template), preenchendo defaults somente se ausentes.  
   - Garantir valores fortes (`JWT_SECRET`, `CONFIG_CRYPTO_KEY`, `DEFAULT_ADMIN_PASSWORD`) com randomização e log amigável.  
   - Criar também `frontend/.env.local` com `VITE_WS_URL` e `VITE_WS_PATH`.  
4. **Documentar fluxo de sincronização**: README/`docs/windows/installation.md` devem citar `npm run config:init` após mudanças de `.env`, explicando relação com `SystemConfig`.  
5. **Remover `.env` raiz ou convertê-lo em “metaplanilha”** com referências aos arquivos reais, para evitar que usuários editem o arquivo errado.  
6. **Adicionar checklist automático** (PowerShell/Node) para validar `.env` antes de iniciar (ver etapa futura do start).  

## Implementação aplicada
- Criado `scripts/ensure-env.mjs` para gerar/atualizar `.env`, `.env.local` e diretórios sensíveis (com secrets randômicos e migração da sessão para `data/`).  
- `start.bat` e `repair-windows.bat` agora invocam o script antes de qualquer etapa, garantindo coerência automática.  

Essas correções alinharão os ambientes com `env.validator.ts`, evitarão dados duplicados e permitirão que o `SystemConfig` reflita exatamente o que está no `.env`.***

