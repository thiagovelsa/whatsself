# docs/technical/MONITORING.md

Métricas, logs, alertas e dashboards recomendados para operar o WhatsSelf.

## Objetivos

- Detectar falhas rapidamente (sessão, entregas, fila parada).
- Medir qualidade (tempo de 1ª resposta, taxa de sucesso) e carga.
- Guiar decisões de ajuste (limites, circuit breaker, horários).

## Métricas‑chave (a instrumentar)

- Envio/Entrega
  - `messages_outbound_total` (counter)
  - `messages_outbound_failed_total` (counter)
  - `delivery_success_ratio` (gauge ou compute)
  - `first_response_latency_seconds` (histogram)
- Fila e cadência
  - `queue_depth` (gauge)
  - `rate_global_per_min` (gauge)
  - `rate_per_contact_per_5min` (gauge)
- Circuit Breaker
  - `cb_state_global` (gauge: 0 closed, 1 half-open, 2 open)
  - `cb_state_contact{contactId}` (gauge)
  - `cb_fail_rate_window` (gauge)
- Gatilhos/Fluxos
  - `trigger_hits_total{triggerId}` (counter)
  - `flow_auto_steps_total{flowId}` (counter)
- Sistema
  - `process_uptime_seconds`, `nodejs_event_loop_lag_seconds`, `db_pool_in_use`

Sugerido expor em `/metrics` (Prometheus). Ainda não implementado no código.

## Logs

- Logger: Pino (JSON estruturado). Campos recomendados: `level`, `ts`, `msg`, `requestId`, `route`, `contactId`, `messageId`.
- Evitar conteúdo e telefones completos (mascarar). Usar IDs internos para correlação.
- Logar eventos de sessão WhatsApp (quando implementado): conectado, desconectado, QR atualizado.

## Alertas

- Sessão expirada/desconectada.
- Fila parada (queue_depth > 0 por N minutos) ou taxa de saída ≪ taxa de entrada.
- Taxa de falhas de envio > limiar (ex.: 25%) ou CB aberto.
- Erros 5xx no backend acima de limiar por janela.
- Crescimento anormal de mensagens por contato (possível abuso/bot do outro lado).

## Dashboards sugeridos

- Visão geral: status da sessão, QR (se aplicável), fila, taxa de envio/erro, CB state.
- Qualidade: latência de 1ª resposta, entregas por dia, opt-in/out por período.
- Gatilhos/Fluxos: top gatilhos acionados, passos automáticos por fluxo, quedas por passo.

## SLIs/SLOs iniciais (metas)

- Disponibilidade API: ≥ 99.5% mensal.
- 1ª resposta a inbound: P95 ≤ 2 min.
- Taxa de envio com sucesso: ≥ 97% diária.
- Tempo de recuperação de sessão: ≤ 5 min (P95) após desconexão.

## Implementação

- Adicionar biblioteca `prom-client` e expor `/metrics` no backend.
- Enviar logs para agregador (Loki/Elastic/Datadog) com fonte e ambiente.
- Integrar alertas (Grafana/Datadog) por Slack/Email.

