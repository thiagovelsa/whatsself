# docs/technical/BUSINESS_RULES.md

Regras de negócio, fluxos de conversa, templates e roteamento do WhatsSelf.

## Princípios

- Responder como humano: `typing` e delays naturais (3–7s) antes de enviar.
- Priorizar inbound e contatos com opt-in.
- Respeitar opt-out imediatamente ao detectar keywords (“PARAR”, “SAIR”, “CANCELAR”).
- Evitar rajadas: limites por conta e por contato.
- Fora do horário comercial, responder com aviso e evitar automações agressivas.

## Precedência e avaliação

1) Fluxo ativo do contato (se existe e não está pausado)
2) Gatilhos globais ordenados por prioridade desc e atualização desc
3) Fallback (mensagem padrão ou encaminhar para humano)

## Gatilhos (Trigger)

- Tipos suportados: `equals`, `contains`, `regex`, `number`.
- Campos:
  - `pattern`: texto a casar (ou expressão regular)
  - `priority`: desempate e ordenação de avaliação
  - `cooldownSec`: janela mínima antes de reacionar para mesmo contato
  - `templateId` (opcional): resposta direta
  - `flowId` (opcional): inicia um fluxo
- Regras:
  - Se `cooldownSec > 0`, somente reagir novamente após a janela desde o último disparo para aquele contato.
  - `number`: compara apenas dígitos (útil para códigos e pedidos simples).

## Fluxos de conversa (Flow)

- Passos (`FlowStep`):
  - `send_template`: envia um template (com variáveis), segue transição
  - `collect_input`: aguarda resposta; transições por texto explícito ou `*` (fallback)
  - `end`: encerra o fluxo
- Transições (`transitionsJson`): mapa `entrada → proximo_step_key`.
  - Chave especial `next` para sequência automática.
  - Chave `*` como fallback quando aguardando input.
- Limites de segurança:
  - Máximo de 20 passos automáticos sem input.
  - `paused=true` encerra execução e aguarda intervenção humana.

## Templates

- `content`: mensagem base (com placeholders `{{nome}}`, etc.).
- `variants`: variações para humanização (uma escolhida aleatoriamente a cada envio).
- `variables`: variáveis esperadas (para validação futura).
- Boas práticas:
  - Mensagens curtas, pessoais e úteis.
  - Evitar repetição literal em massa (use `variants`).

## Regras anti‑ban (aplicadas na camada de domínio)

- Limite global de 8–12 msgs/min.
- Limite por contato: 1–2 msgs/5min.
- Janela de horário comercial (`BUSINESS_HOURS`, ex.: 09:00–18:00).
- Circuit Breaker: pausa automações em caso de falhas acima de 25% na janela.

## Horários por região/cliente

- Configuração global no MVP via env `BUSINESS_HOURS`.
- Futuro: tabela por conta/região, com fuso horário do contato.

## Encaminhar para humano

- Quando a confiança do match for baixa (sem gatilhos/fluxos aplicáveis após 2–3 tentativas), enviar mensagem educada e pausar o bot para o contato.
- Operador pode retomar limpando/pausando a instância do fluxo (`/contacts/:id/flow/reset`).

## Exemplos de fluxos (MVP)

- Boas‑vindas (1ª vez)
  - `send_template`: "Olá {{nome}}! Sou da {{empresa}}. Como posso te ajudar?"
  - `collect_input`: espera palavra‑chave; `*` → encaminha para humano
- Confirmação de recebimento
  - disparado no inbound: aguardar 3–7s e enviar "Recebi sua mensagem, já te respondo."
- Fora do horário
  - "Estamos fora do horário. Responderemos no próximo dia útil."

