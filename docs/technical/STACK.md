+ Stack – WhatsSelf (Frontend + Backend para Produção)

## Visão geral
- Diagrama de arquitetura: ver `docs/ARCHITECTURE.md`.
- **Objetivo**: stack simples, sólida e pronta para produção, com painel web e API para operar o WhatsApp Business via `whatsapp-web.js` sem arriscar banimento.
- **Preferência de linguagem**: TypeScript (fortemente recomendado). Ganha em segurança, manutenção e refatoração. Se precisar, começamos com JS e migramos depois.

## Backend (API + Worker de mensagens)
- **Runtime**: Node.js 20 LTS
- **Linguagem**: TypeScript
- **Framework HTTP**: Express
- **WhatsApp**: `whatsapp-web.js` com `LocalAuth` (Multi‑Device, sessão persistente)
- **Realtime**: `socket.io` para eventos (QR, status, logs ao vivo, progresso de fila)
- **Banco (dev)**: SQLite (arquivo local, rápido e portátil no Windows)
- **Banco (prod)**: PostgreSQL (gerenciado ou VM própria)
- **ORM**: Prisma (migrate, schema e tipos)
- **Fila e rate limit (MVP)**: in‑process com `bottleneck` + Circuit Breaker (global e por contato)
- **Fila (escala)**: BullMQ + Redis (quando precisar de concorrência e robustez)
- **Validação**: Zod (inputs de API e variáveis de ambiente)
- **Logs**: Pino (estruturado, pronto para enviar a agregadores)
- **Config/segredos**: dotenv + Zod (validação) + suporte a variáveis de sistema
- **Agendador**: node‑cron (follow‑ups, janelas de horário)
- **Segurança**:
  - Helmet, CORS restrito, `express-rate-limit` nas rotas públicas
  - Autenticação do painel via JWT (ou sessão) com RBAC simples (admin/operador)
  - Sanitização e limitação de payloads
  - Respeito a opt‑out (“PARAR/SAIR”) em nível de domínio (nunca envia se opt‑out)
- **Observabilidade**: endpoints `/health` e `/metrics` (Prometheus opcional), traços mínimos
- **Testes**: Vitest (unidade), supertest (HTTP)
- **Build**: `tsup` ou `tsc` + `nodemon` no dev
- **Process manager**: PM2 (ou Docker/Compose em produção)

### Endpoints principais (MVP)
- `GET /status` – estado do client, fila e conectividade
- `GET /qr` – QR Code atual quando não autenticado
- `POST /send` – envia 1:1 via fila (respeita limites e janelas de horário)
- `POST /broadcast` (fase 2) – apenas opt‑in + throttle pesado + janela
- `GET /logs` – últimos eventos (paginado)
- `GET/POST/PUT/DELETE /templates` – CRUD de respostas
- `GET/POST/PUT/DELETE /triggers` – CRUD de gatilhos
- `GET/POST/PUT/DELETE /flows`, `POST /flows/:id/publish` – fluxos e publicação
- `POST /simulate` – simular match de gatilho/fluxo
- `GET /contacts/:id/flow`, `POST /contacts/:id/flow/reset|pause` – gerenciar fluxo por contato

### Regras anti‑ban (implementadas na camada de domínio)
- Limites por conta (8–12 msgs/min) e por contato (1–2 msgs/5 min)
- Atrasos aleatórios e `typing` (1.5–3.5 s) antes de enviar
- Guarda de horário comercial + resposta fora do expediente
- Opt‑out automático por palavras (“PARAR/SAIR/CANCELAR”)
- Redução de cadência ao detectar falhas/recusas (cooldown)
- Circuit Breaker (MVP): janela de 5 min ou últimos 50 envios (o que vier primeiro); abre se falhas > 25% com mínimo de 20 tentativas; escopos global e por contato; estados Closed → Open (pausa automações, permite só respostas a inbound) → Half‑Open (probes controlados a cada 30–60 s); cooldown inicial 2–5 min com backoff exponencial até 30 min; fecha se sucesso ≥ 90% em 10 probes, senão reabre.

## Frontend (Painel Web de Operação)
- **Framework**: Next.js (TypeScript)
- **Renderização**: híbrida (SSR para páginas de operação se necessário; SSG onde der)
- **UI**: React + Tailwind CSS com tokens próprios (sem clichês “UI de IA”)
  - Componentes baseados em acessibilidade (Radix UI primitives, quando útil)
  - Paleta neutra e contrastes AA; evitar gradientes e fundo azul por padrão
- **Estado**: React Query (requisições e cache) + Zustand (estado local)
- **Realtime**: `socket.io-client` (QR, status, fila em tempo real)
- **Auth**: NextAuth (credenciais) ou rota custom com JWT (simples e auditável)
- **Build/Qualidade**: ESLint + Prettier + Lighthouse checks
- **Testes**: Playwright (E2E) e React Testing Library (componentes)

### Documentação de UI/UX
- Visão geral e padrões: `docs/ui-ux/OVERVIEW.md`
- Design System (tokens/estados): `docs/ui-ux/DESIGN_SYSTEM.md`
- Telas e requisitos: `docs/ui-ux/SCREENS.md`
- Fluxos (Mermaid): `docs/ui-ux/FLOWS.md`
- Componentes base: `docs/ui-ux/COMPONENTS.md`

### Telas do painel (MVP)
- Login (credenciais)
- Dashboard: status da sessão, QR (se necessário), fila e últimos eventos
- Conversas e contatos: busca, tags, opt‑in/out
- Envio 1:1: formulário simples (respeita fila/limites)
- Configurações: horário comercial, limites
- Configurador: Templates (variáveis/variações), Gatilhos (tipo/padrão/prioridade/cooldown), Fluxos (passos e transições) e Simulador

## Monorepo e compartilhamento
- **Workspace**: pnpm workspaces (ou npm workspaces) para agrupar projetos
- **Pacotes**:
  - `apps/backend` – API/worker
  - `apps/web` – painel Next.js
  - `packages/shared` – tipos (TypeScript), validações Zod, constantes (templates, limites)
  - `prisma/` – schema e migrations

Exemplo de estrutura:

```txt
whats-self/
  apps/
    backend/
    web/
  packages/
    shared/
  prisma/
    schema.prisma
  .env
  package.json
  pnpm-workspace.yaml
```

## Ambientes
- **Dev (Windows‑friendly)**:
  - SQLite, `LocalAuth` do WhatsApp, logs locais
  - Sem comandos Unix; scripts pensados para CMD/PowerShell
- **Staging**:
  - PostgreSQL gerenciado, Redis (se BullMQ), logs agregados
  - Domínio protegido (basic auth) e dados de teste/consentimento
- **Produção**:
  - Docker/Compose ou PM2 em VM
  - PostgreSQL gerenciado, Redis (se fila distribuída), storage para mídias (S3‑like)
  - Backups automatizados e rotação de logs

## CI/CD (sugestão)
- **CI**: lint, typecheck, testes, build backend e frontend
- **CD**: deploy automatizado por branch/tag (Actions), migrations Prisma na subida
- **Qualidade**: Lighthouse CI no painel; alertas se performance cair

## Variáveis de ambiente (base)
```env
# Backend
NODE_ENV=production
PORT=3001
WHATS_SESSION_PATH=.wwebjs_auth
RATE_MAX_PER_MIN=12
RATE_PER_CONTACT_PER_5MIN=2
BUSINESS_HOURS=09:00-18:00
# Circuit Breaker
CB_WINDOW_MODE=5m_or_50        # 5 minutos ou últimos 50 envios
CB_MIN_ATTEMPTS=20
CB_FAIL_RATE_OPEN=0.25         # abre circuito acima de 25% falha
CB_PROBE_INTERVAL_SEC=45       # 30–60 s, usar 45 s como padrão
CB_PROBE_SUCCESS_CLOSE=0.9     # fecha se >= 90% sucesso nos probes
CB_PROBE_SAMPLES=10
CB_COOLDOWN_INITIAL_SEC=300    # 5 min
CB_COOLDOWN_MAX_SEC=1800       # 30 min

# DB
DATABASE_URL="file:./dev.db" # dev (SQLite) – não inclua "prisma/" no caminho
# DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" # prod

# Redis (fila distribuída, quando usar BullMQ)
REDIS_URL=redis://localhost:6379

# Frontend
NEXT_PUBLIC_API_BASE=https://api.seu-dominio.com
JWT_SECRET=trocar-por-um-segredo-forte
```

## Segurança e privacidade
- Autenticação obrigatória no painel; RBAC básico (admin/operador)
- CORS restrito ao domínio do painel
- Helmet, rate limit nas rotas sensíveis
- Logs sem dados sensíveis (mas rastreáveis por ID interno)
- Política de retenção de mensagens e contatos
- Respeito a opt‑out e opt‑in documentado

## Observabilidade e operação
- `GET /health` e `GET /metrics`
- Logs estruturados e correlação por requisição
- Alertas: sessão expirada, fila travada, falhas de entrega acima do limiar

## Padrões de design do painel (linha curta)
- Sem UI genérica “de IA”: sem gradientes aleatórios, fundo azul padrão, orbes/partículas
- Tipografia legível, contraste AA/AAA, foco e estados claros
- Layout focado em tarefa: QR, status, mensagens, fila, configurações

## Sem mocks desnecessários (princípio)
- Usar integrações reais sempre que viáveis (dados e fluxos reais)
- Documentar e isolar qualquer mock temporário com plano de remoção

## Roadmap técnico (resumo)
- MVP: API + fila/limites + Circuit Breaker + CRUD de templates/gatilhos/fluxos + simulador (API) + painel básico + auth + QR/status + envios 1:1
- Fase 2: broadcast somente opt‑in + editor de respostas/keywords + follow‑ups
- Fase 3: Redis/BullMQ (escala), Postgres/replicação, integrações (pagamento/CRM)

## Por que TypeScript aqui
- Contratos claros entre painel, API e domínio
- Refatoração segura conforme o produto cresce
- Menos erros bobos em produção; melhor DX no Windows

