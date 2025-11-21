## Conexão entre Frontend e Backend

### Visão geral
- O painel React (`WhatsSelf/src/react-app/*`) consome exclusivamente os endpoints expostos por `apps/backend/src/server.ts`. A comunicação acontece via `axios` (`WhatsSelf/src/react-app/lib/axios.ts`), que injeta o JWT e notifica tanto toasts quanto o banner de rede em caso de falha ou desconexão.
- WebSocket (Socket.IO) é inicializado em `services/websocketService.ts` e alimenta o dashboard com eventos reais (`qr_code`, `system_status`, `queue_update`, `circuit_breaker_state_change`, `message_sent`, `message_received`).

### Endpoints críticos
- Autenticação `/auth/register`, `/auth/login`, `/auth/me`, `/auth/change-password`.
- Configuração (templates, triggers, flows, business hours, status, circuit breaker).
- Operação: `/contacts`, `/messages`, `/send`, `/broadcast`, `/simulate`, `/queue/status`, `/circuit-breaker/*`, `/status`, `/business-hours`.
- Cada hook do frontend (`useApi.ts`) chama exatamente um desses endpoints e invalida caches automaticamente quando necessário.

### Filters/pagination
- Os endpoints `/contacts` e `/messages` aceitam `take`, `skip`, `search`, `status` (e `direction` para mensagens). O backend aplica esses filtros diretamente em `Prisma` (`apps/backend/src/server.ts:520-610`), retornando `items`, `hasMore`, `total`. O frontend consome isso por meio de `useInfiniteQuery` e botões “Carregar mais”.

### Observabilidade e resiliência
- Axios detecta perda de conexão e alterna os estados em `useNetworkStore`, exibindo `NetworkBanner` (`WhatsSelf/src/react-app/components/NetworkBanner.tsx`).
- `ToastStack` registra falhas (erros 4xx/5xx) para o operador (`useNotificationStore`).
- O backend emite eventos de fila/circuit breaker no `AutomationOrchestrator` (`services/automationOrchestrator.ts`) para manter o painel sincronizado.

### Sobre mocks/simulações
- Não há mocks no runtime da aplicação. O único mock existente é `mockWhatsAppClient` dentro dos testes (`apps/backend/src/__tests__/setup.ts`) e se restringe ao ambiente de testes Vitest; o WhatsApp real (via `whatsapp-web.js`) roda em produção/dev.
- O fluxo do painel/humanização, fila e circuito breaker opera sobre dados reais de WhatsApp (`WhatsAppService` envia mensagens de verdade) e os eventos de testes não afetam o backend real.

### Validação contínua
- `apps/backend/package.json:test` executa `setup-test-db.js` + Vitest (58 testes) para garantir que o backend responde conforme o contrato.
- `openapi.yaml` documenta todos os endpoints e formas de requisição/retorno para conferência manual ou via ferramenta.

Com base nisso, o sistema está conectado ponta a ponta: nenhuma simulação em produção e toda falha de rede/req é visível ao operador. Para testes de ponta a ponta, execute `npm run test` em `apps/backend` e garanta que o `SKIP_WHATSAPP=true` mantém os testes isolados. ***
