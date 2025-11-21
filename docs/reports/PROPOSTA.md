+ Proposta – WhatsSelf (Atendimento no WhatsApp sem dor de cabeça)

## Objetivo
- Automatizar atendimentos no WhatsApp Business usando [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js).
- Responder rápido, com cara de humano (typing + delays), e evitar ban por spam.
- Aumentar conversões com fluxos simples de vendas (boas‑vindas, confirmação de recebimento, palavra‑chave, encaminhar para humano).

## Como funciona (resumo direto)
- Conectamos via QR Code (Multi‑Device) e mantemos a sessão ativa.
- Toda saída passa por uma fila com limites e aleatoriedade (anti‑spam).
- Mensagens “humanizadas”: mostra digitando e espera um delay aleatório antes de enviar.
- Regras simples: horário comercial, opt‑out (“PARAR/SAIR”), primeira mensagem com boas‑vindas, confirmação de recebimento.
- API minimalista para operar: ver QR, checar status, enviar mensagem, (mais pra frente) broadcast somente para opt‑in.

## Módulos do MVP
- Conexão e sessão
  - `initClient` com `LocalAuth` (persistência local da sessão)
  - QR Code disponível em endpoint/painel
  - Reconexão automática + health check
- Fila e anti‑spam
  - Fila única de envio (in‑process) com rate limit
  - Regras padrão (ajustáveis): 8–12 msgs/min total, 1–2 por contato/5 min
  - Atrasos e jitter (aleatoriedade) para evitar padrão robótico
  - Circuit Breaker (MVP): pausa envios automáticos se taxa de falha > 25% em janela de 5 min ou últimos 50 envios (min. 20 tentativas), escopos global e por contato; estados Closed → Open → Half‑Open; cooldown inicial 2–5 min com backoff até 30 min; em Open só permite respostas a inbound; Half‑Open com probes (1 a cada 30–60 s) e fecha se sucesso ≥ 90% em 10 probes
- Humanização
  - `typing` entre 1.5–3.5 s (ajustável)
  - Delay pós‑recebimento de 3–7 s antes de responder
  - Variações de texto (templates com alternativas) para não repetir igual
- Gatilhos, templates e fluxos
  - Templates com variáveis e variações (respostas humanizadas)
  - Gatilhos configuráveis: equals/contains/regex/número, com prioridade e cooldown
  - Precedência: fluxo ativo > gatilhos globais > fallback
  - Reentrada: novas mensagens continuam avaliadas para transições/novos gatilhos
  - Fluxos multi‑etapas (menu → coleta → confirmação → fim) com transições por entrada
- Regras de atendimento
  - Boas‑vindas para primeiro contato (uma vez por contato)
  - Confirmação de recebimento (“Recebi sua msg, já te retorno”)
  - Guard de horário comercial (resposta educada fora do horário)
  - Opt‑out: detectar “PARAR/SAIR/CANCELAR” e silenciar automaticamente
  - Roteador simples por palavra‑chave (ex.: orçamento, preço, suporte)
  - Encaminhar para humano quando não entender (e pausar o bot)
- Contatos e opt‑in
  - Cadastro mínimo (número, nome quando disponível, primeiro/último contato)
  - Registro de opt‑in/opt‑out
  - Tags simples (ex.: “lead quente”, “pós‑venda”)
- API inicial
  - `GET /status` – sessão, fila, contadores básicos
  - `GET /qr` – QR Code atual (quando não logado)
  - `POST /send` – envia 1:1 via fila (respeita limites)
  - (Fase 2) `POST /broadcast` – apenas opt‑in + throttle pesado
  - `GET/POST/PUT/DELETE /templates` – CRUD de respostas
  - `GET/POST/PUT/DELETE /triggers` – CRUD de gatilhos
  - `GET/POST/PUT/DELETE /flows` e `POST /flows/:id/publish` – fluxos e publicação
  - `POST /simulate` – simular qual gatilho/fluxo casaria com um texto
  - `GET /contacts/:id/flow` e reset/pause – gerenciar fluxo atual do contato
- Logs e métricas
  - Log de eventos (entrada/saída/erros)
  - Métricas: tempo de 1ª resposta, taxa de entrega, tamanho da fila, acertos de gatilhos/fluxos

## Regras anti‑ban (na prática)
- Falar com quem quer falar: priorizar responder quem iniciou e contatos com opt‑in.
- Ritmo humano: sempre typing + delay aleatório; nada de envios em rajada.
- Limites por conta e por contato; cooldown depois de falhas (reduz cadência).
- Horário: evitar madrugada; mensagem educada fora do expediente.
- Conteúdo: pessoal e útil; variar textos; evitar repetição agressiva.
- Respeitar opt‑out imediatamente e registrar.
- Monitorar entregas; se falhar muito, reduzir ritmo automaticamente.
- Circuit Breaker: se a taxa de falha passar do limiar, pausa envios automáticos, mantém só respostas a inbound e retoma em Half‑Open com probes controlados.

## Fluxos automáticos (MVP)
- Boas‑vindas (1ª vez): pequena apresentação + pergunta aberta útil.
- Confirmação de recebimento: “Recebi sua mensagem, já te respondo.” (3–7 s).
- Fora do horário: aviso de retorno no próximo dia útil.
- Palavra‑chave (exemplos): “preço”, “orçamento”, “pagamento” → respostas curtas com link/ação.
- Encaminhar para humano: quando não entender/tentar 2–3 vezes sem sucesso.

## Arquitetura e tecnologias (simples e sólidas)
- Backend: Node.js 20 LTS com Express
- WhatsApp: `whatsapp-web.js` (Multi‑Device)
- Tipagem: TypeScript (recomendado) – pode começar em JS se preferir
- Banco (local/dev): SQLite com Prisma (prático no Windows e portátil)
- Logs: Pino
- Config: dotenv
- Validação: Zod (para payloads de API)
- Job scheduler simples: node‑cron (follow‑ups/horários)

## Persistência (tabelas base)
- contacts (id, número, nome, opt_in/out, tags, timestamps)
- messages (id, contact_id, direction, status, conteúdo, timestamps)
- outbound_queue (id, to, conteúdo, status, tentativas, agendamento)
- rules/settings (horários, limites, templates)
- metrics (contadores agregados por período)

## Painel (opcional – Fase 2)
- Tela para ver QR, status, fila e últimos eventos.
- Botão “pausar envios” e “modo humano” por contato.
- Filtros simples por tag e status.
- Configuração: CRUD visual de Templates, Gatilhos e Fluxos + simulador de gatilhos

## Roadmap
- Fase 1 – MVP funcional (sem painel)
  - Conexão via QR + sessão persistente
  - Fila com rate limit + humanização (typing/delays)
  - Circuit Breaker anti‑falhas (pausa automática, half‑open, cooldown e probes)
  - Boas‑vindas, confirmação de recebimento, fora do horário, opt‑out
  - API: `/qr`, `/status`, `/send`, CRUD de templates/gatilhos/fluxos e `/simulate`
  - Logs e métricas básicas
- Fase 2 – Operação confortável
  - Painel web simples (QR, status, fila, eventos)
  - Configuração visual: templates, gatilhos e fluxos + simulador no painel
  - Follow‑ups (lembretes) com limites
  - Exportar métricas (CSV)
- Fase 3 – Escala e integrações
  - Broadcast para opt‑in com throttle pesado e janela de horário
  - Integração pagamento/link e CRM/planilha
  - Redis/BullMQ (se precisar escalar envios) e Postgres (prod)
  - Alertas (falhas, fila presa, sessão expirada)

## Critérios de qualidade (check rápido)
- AA de contraste nas mensagens do painel (quando tiver)
- LCP < 2.5 s no painel, INP ok (sem travar)
- Logs claros para entender “por que” uma mensagem saiu/não saiu
- Sem envios fora do horário configurado
- Opt‑out respeitado de imediato

## Limites e cuidados
- Use somente com contatos que deram opt‑in ou iniciaram conversa.
- Não faça disparos frios; o risco de ban aumenta.
- Evite textos idênticos em massa; varie templates.
- Tenha política de privacidade mínima e avise sobre opt‑out.

## Próximos passos
1) Validar esta proposta.
2) Subir o esqueleto do projeto (API + fila + humanização).
3) Definir textos padrão de boas‑vindas/recebimento (podemos editar juntos).
4) Testar com um número real e ajustar limites.


