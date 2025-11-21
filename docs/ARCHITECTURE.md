# Arquitetura – WhatsSelf

Diagrama de alto nível dos componentes do MVP e fases seguintes.

Visualização rápida: [architecture.svg](architecture.svg) · [architecture.png](architecture.png)

```mermaid
flowchart LR
  subgraph Operator[Operador/Usuário]
    U[Browser/Painel Web]
  end

  subgraph Frontend[Next.js (Painel) – Fase 2]
    UI[UI + React Query]
    SIO[Socket.io-client]
    UI --- SIO
  end

  subgraph Backend[API Express (Node 20 / TS)]
    API[Rotas HTTP (Zod)]
    DOM[Domínio]
    TM[Trigger Matcher]
    FE[Flow Engine]
    TR[Template Renderer]
    Q[Fila + Rate Limit + Jitter]
    CB[Circuit Breaker]
    API --> DOM
    DOM --> TM
    DOM --> FE
    DOM --> TR
    DOM --> Q
    Q --- CB
  end

  subgraph WhatsApp[whatsapp-web.js]
    WA[Cliente WhatsApp\n(QR/Status/Envio)]
  end

  subgraph Data[Persistência]
    Prisma[Prisma Client]
    DB[(SQLite dev / Postgres prod)]
  end

  subgraph Observability[Observabilidade]
    Pino[Pino Logs]
    Metrics[/metrics (prom-client)]
    Prom[Prometheus]
    Grafana[Grafana]
    Pino -->|agregador| Logs[(Loki/Elastic/Datadog)]
    Metrics --> Prom --> Grafana
  end

  subgraph Scale[Escala – Fase 3]
    Redis[(Redis)]
    Bull[BullMQ]
    Bull --- Redis
  end

  U -->|HTTPS| UI
  UI -->|REST| API
  SIO -.->|Realtime| API
  Q --> WA -->|Entregas| WhatsAppCloud[(WhatsApp)]
  API --> Prisma --> DB
  API --> Pino
  API --> Metrics
  Q -. opcional .-> Bull
```

Notas
- MVP usa fila in-process; BullMQ/Redis entram na Fase 3.
- Observabilidade mínima: logs (Pino) e `/metrics` (Prometheus) no backend.
- Painel Next.js entra na Fase 2; em MVP, operação via API.
