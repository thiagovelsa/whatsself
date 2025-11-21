# docs/reports/ROADMAP.md

Plano de evolução técnica por fases. Consulte também docs/reports/PROPOSTA.md e docs/technical/STACK.md.

## Fase 1 – MVP funcional (Backend)

- [x] Schema Prisma (Contact, Template, Trigger, Flow, FlowStep, FlowInstance, Message)
- [x] CRUD: Templates, Triggers, Flows (+ steps)
- [x] Simulador de gatilhos/fluxos
- [x] Healthcheck `/health`
- [ ] Autenticação JWT + RBAC básico
- [ ] Integração WhatsApp (whatsapp-web.js) – conexão, QR e status
- [ ] Fila in‑process + rate limit + delays/typing
- [ ] Circuit Breaker (global e por contato)
- [ ] Endpoints de operação: `/qr`, `/status`, `/send`
- [ ] Observabilidade mínima: logs pino + `/metrics` (prom-client)

## Fase 2 – Operação confortável

- [ ] Painel web (Next.js): QR/status, fila, eventos
- [ ] Configuração visual de Templates/Gatilhos/Fluxos + simulador
- [ ] Follow‑ups (agendador) com janelas de horário
- [ ] Exportar métricas (CSV)
- [ ] Rate limit por endpoint e CORS estrito

## Fase 3 – Escala e integrações

- [ ] Broadcast (somente opt‑in) com throttle pesado e janelas
- [ ] Redis/BullMQ (fila distribuída) e Postgres gerenciado
- [ ] Deploy com Docker/Compose ou PM2 + CI/CD
- [ ] Integrações: pagamentos/CRM/planilhas
- [ ] Alertas pró‑ativos (sessão, fila, taxa de erro)

## Entregáveis e critérios de aceite

- Logs rastreáveis sem PII em claro
- Respeito a opt‑out e horários
- Testes de domínio com cobertura ≥ 80%
- Documentação atualizada (API, SECURITY, DATABASE, MONITORING, TESTING)

