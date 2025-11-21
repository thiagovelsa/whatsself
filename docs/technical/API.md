# API – WhatsSelf

Documentação dos endpoints REST expostos pelo backend (`apps/backend`). Todos os recursos abaixo já estão implementados e protegidos por JWT.

- **Base URL (dev):** `http://localhost:3001`
- **Formato:** `application/json; charset=utf-8`
- **Autenticação (navegador):** cookie HttpOnly `auth_token` emitido pelo backend ao chamar `/auth/login` ou `/auth/register` (enviado automaticamente em requests subsequentes).
- **Autenticação (scripts/integrações):** cabeçalho `Authorization: Bearer <token>` continua suportado para uso programático.
- **Rotas públicas disponíveis:** `/health`, `/qr`, `/whatsapp/status`.
- **Segurança:** respostas seguem o padrão `{ "error": "mensagem" }` em validação ou autorização.

> Use `/health` para verificar conectividade sem autenticação. Endpoints privados exigem token obtido via `/auth/login` ou `/auth/register`, enviado via cookie HttpOnly (browsers) ou Authorization header (integrações).

---

## 1. Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/register` | Cria usuário (`admin` ou `operator`) e emite cookie `auth_token`. |
| `POST` | `/auth/login` | Retorna `{ user, token }` e emite cookie `auth_token`. |
| `POST` | `/auth/refresh` | Renova sessão usando cookie `auth_token` e retorna novo `{ user, token }`. |
| `POST` | `/auth/logout` | Limpa cookie `auth_token` e encerra sessão. |
| `GET` | `/auth/me` | Retorna o usuário atual (requer autenticação). |
| `POST` | `/auth/change-password` | Troca de senha autenticada. |

**Register – exemplo**

```http
POST /auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin",
  "name": "Administrator",
  "role": "admin"
}
```

Resposta `201`:

```json
{
  "user": {
    "id": "usr_123",
    "email": "admin@example.com",
    "name": "Administrator",
    "role": "admin",
    "active": true,
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-01T12:00:00.000Z"
  },
  "token": "jwt..."
}
```

**Login + cookie HttpOnly (fluxo navegador)**

- O backend define automaticamente um cookie `auth_token` com o JWT assinando a sessão:
  - `httpOnly: true` – não acessível via JavaScript (proteção contra XSS).
  - `sameSite: "lax"` – reduz risco de CSRF.
  - `secure: true` em produção.
- O frontend envia esse cookie em todas as requisições (ver `withCredentials: true` em `axios`), portanto **não precisa** enviar cabeçalho `Authorization` no navegador.

**Uso programático (scripts, Postman, etc.)**

- Ainda é possível usar apenas o header:

```http
GET /templates
Authorization: Bearer <token>
```

- O token é o mesmo retornado em `/auth/login` ou `/auth/refresh`.

---

## 2. Sistema & WhatsApp

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Health-check sem token. |
| `GET` | `/qr` | Último QR Code gerado para parear o WhatsApp. |
| `GET` | `/whatsapp/status` | Situação atual do cliente (ready/connected). |
| `GET` | `/status` | Status geral do orchestrator (WhatsApp, fila, circuit breaker, rate limit). |
| `GET` | `/queue/status` | Métricas da fila in-process. |
| `GET` | `/circuit-breaker/status` | Estado atual (CLOSED/OPEN/HALF_OPEN). |
| `POST` | `/circuit-breaker/reset` | Reseta para CLOSED. |
| `POST` | `/circuit-breaker/force-open` | Força estado OPEN. |
| `GET` | `/business-hours` | Retorna janela configurada. |
| `PUT` | `/business-hours` | Atualiza `{ "start": "09:00", "end": "18:00" }`. |

**Status – resposta 200**

```json
{
  "whatsapp": { "ready": true, "connected": true },
  "queue": { "length": 2, "processing": true },
  "circuitBreaker": { "state": "CLOSED", "failureRate": 0 },
  "rateLimit": { "sentLastMinute": 3, "globalLimit": 12 }
}
```

---

## 3. Mensagens

| Método | Rota | Payload | Descrição |
| --- | --- | --- | --- |
| `POST` | `/send` | `{ phone, text, priority? }` | Enfileira uma mensagem 1:1 (cria contato se necessário). |
| `POST` | `/broadcast` | `{ text, contactIds?, optedInOnly? }` | Enfileira broadcast respeitando opt-in. |
| `GET` | `/messages` | Query opcional: `search`, `status`, `direction`, `take`, `skip`. | Lista mensagens (paginado opcional). |

**Paginação de `/messages`**

- Sem `take/skip`: retorna todos.
- Com `take/skip`: resposta `{ items, hasMore, total }`.

---

## 4. Templates, Gatilhos e Fluxos

Rotas seguem CRUD completo, todas autenticadas.

### Templates (`/templates`)

- `GET /templates` – lista ordenada por `updatedAt desc`.
- `GET /templates/:id`
- `POST /templates` – `{ key, content, variables?, variants?, locale?, isActive? }`
- `PUT /templates/:id` – campos opcionais acima.
- `DELETE /templates/:id`

### Triggers (`/triggers`)

Campos aceitos: `type (equals|contains|regex|number)`, `pattern`, `priority`, `cooldownSec`, `active`, `templateId`, `flowId`.

- `GET /triggers`
- `GET /triggers/:id` (inclui template e flow)
- `POST /triggers`
- `PUT /triggers/:id`
- `DELETE /triggers/:id`

### Flows (`/flows`)

- `GET /flows` – inclui steps ordenados.
- `GET /flows/:id`
- `POST /flows` – cria flow e steps (`key`, `type`, `templateId`, `waitInput`, `order`, `transitions`).
- `PUT /flows/:id`
- `POST /flows/:id/publish`
- `DELETE /flows/:id`
- `POST /flows/:id/steps`
- `PUT /flows/:id/steps/:stepId`
- `DELETE /flows/:id/steps/:stepId`

### Simulador

`POST /simulate`:

```json
{ "text": "quero orçamento", "contactId": "ctc_123" }
```

Resposta indica trigger, flowInstance e ações automáticas.

---

## 5. Contatos

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/contacts` | Suporta `search`, `status=optIn|optOut`, `take`, `skip`. Retorna lista ou `{ items, hasMore, total }`. |
| `GET` | `/contacts/:id` | Inclui últimas 50 mensagens + instâncias de fluxo. |
| `GET` | `/contacts/:id/flow` | Instância de fluxo ativa. |
| `POST` | `/contacts/:id/flow/reset` | Pausa instâncias ativas. |
| `POST` | `/contacts/:id/flow/pause` | Idem ao reset (mantido para compatibilidade). |

---

## 6. Administração

Disponível apenas para `admin`:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/admin/users` | Lista usuários (sem senha). |
| `PUT` | `/admin/users/:id/role` | `{ "role": "admin" | "operator" }`. |
| `POST` | `/admin/users/:id/activate` | Reativa usuário. |
| `POST` | `/admin/users/:id/deactivate` | Suspende usuário. |

---

## 7. Event Streaming (WebSocket)

- Endpoint: `ws://localhost:3001/socket.io`
- Autenticação: enviar `{ auth: { token } }` na conexão.
- Eventos emitidos (payload `event.type`):
  - `qr_code`, `whatsapp_ready`, `whatsapp_disconnected`
  - `message_received`, `message_sent`
  - `queue_update`, `system_status`
  - `circuit_breaker_state_change`

---

## 8. Boas práticas

- Rode `npm --prefix apps/backend run dev` para levantar a API.
- Antes de usar endpoints que dependem de banco, execute `npx prisma db push`.
- Utilize SQLite apenas em desenvolvimento. Em produção, configure `DATABASE_URL` para Postgres.
- Sempre verifique `BUSINESS_HOURS`, circuit breaker e opt-out antes de cadências manuais ou integrações externas.
