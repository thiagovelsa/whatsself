# Telas e Especificações – WhatsSelf

Especificação por tela (objetivo, ações, dados/endpoints, estados, critérios). Alguns protótipos todavía exibem um placeholder “Página em construção” (ex.: `/templates`, `/triggers`, `/flows`, `/messages`, `/settings` em `WhatsSelf/src/react-app/pages`). Use este documento como meta de implementação.

## Dashboard (`/`)
- Objetivo: visão geral de operação (status, fila, métricas, atividades).
- Ações: atalhos rápidos (enviar mensagem, gerenciar contatos, relatórios).
- Dados/Endpoints:
  - Status sessão e fila: planejado `/status`
  - Métricas: planejado `/metrics` (Prometheus), ou endpoint interno
- Estados: online/offline, vazio (sem mensagens), erro (não conectado ao DB)
- Aceite: mostrar 4 métricas principais; atividade recente listada

## Conexão WhatsApp (`/qr`)
- Objetivo: conectar via QR e ver estado atual
- Ações: gerar novo QR, ver histórico de conexões
- Dados/Endpoints:
  - QR e status: planejado `/qr`, `/status`
- Estados: online (cartão verde), offline (QR + instruções), erro (retry)
- Aceite: fluxo completo conforme `docs/ui-ux/FLOWS.md` (Conectar WhatsApp)

## Contatos (`/contacts`)
- Objetivo: pesquisar e gerenciar contatos, ver resumo de conversas
- Ações: buscar, filtrar por tags, abrir conversa, editar contato
- Dados/Endpoints:
  - Lista/Busca: planejado (`/contacts` future), hoje mock
  - Detalhes: planejado `/messages?contactId=`
- Estados: opt-in/opt-out; vazio; loading; erro
- Aceite: filtros funcionais; destaque para opt‑out

## Templates (`/templates`)
- Objetivo: CRUD de mensagens com variáveis/variações
- Ações: criar/editar/ativar/desativar; visualizar variáveis
- Dados/Endpoints: `GET/POST/PUT/DELETE /templates`
- Estados: lista vazia; validação de placeholders
- Aceite: impedir salvar vazio; indicar variáveis não usadas

## Gatilhos (`/triggers`)
- Objetivo: regras de roteamento (equals/contains/regex/number)
- Ações: criar com prioridade/cooldown e destino (template/fluxo)
- Dados/Endpoints: `GET/POST/PUT/DELETE /triggers`
- Estados: ativo/inativo; conflito de prioridade; validação regex
- Aceite: bloquear padrões vazios; garantir número/regex válidos

## Fluxos (`/flows`)
- Objetivo: criar passos e publicar
- Ações: adicionar `send_template|collect_input|end`, transições e ordem; publicar
- Dados/Endpoints: `GET/POST/PUT/DELETE /flows`, `POST /flows/:id/publish`, steps CRUD
- Estados: rascunho/publicado/arquivado; sem passos; transições inválidas
- Aceite: não permitir publicar sem passo inicial; máximo 20 auto-steps em execução

## Mensagens (`/messages`)
- Objetivo: histórico por contato e geral
- Ações: ver status (queued/sent/failed/delivered/read), filtrar por contato/data
- Dados/Endpoints: planejado (`/messages`), hoje mock
- Estados: vazio; loading; erro
- Aceite: indicar claramente direção (inbound/outbound)

## Configurações (`/settings`)
- Objetivo: horários comerciais, limites, autenticação
- Ações: ajustar `BUSINESS_HOURS`, limites globais/por contato; gerenciar usuários (futuro)
- Dados/Endpoints: variáveis de ambiente e endpoints futuros
- Estados: validação de formatos (HH:MM‑HH:MM), valores mínimos/máximos
- Aceite: salvar persistente; validar formato de hora
