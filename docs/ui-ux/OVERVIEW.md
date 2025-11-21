# UI/UX Overview – WhatsSelf

Diretrizes gerais de produto e experiência do painel web. Baseado no protótipo em `WhatsSelf/` e no escopo do MVP.

## Objetivos de UX
- Operar rápido e com segurança anti-ban (delays, limites, opt-out visível).
- Clareza de estado (conectado/offline, fila, circuito, horário).
- Fricção mínima para tarefas frequentes (responder, ver QR, contatos, configurar regras).
- Acessível (teclado, contraste, foco visível; conteúdo em pt‑BR).

## Mapa de navegação (rotas)
- `/` Dashboard
- `/qr` Conexão (QR/Status)
- `/contacts` Contatos e conversas
- `/templates` Templates de mensagens
- `/triggers` Gatilhos (roteamento por palavra/regex)
- `/flows` Fluxos (passos e transições)
- `/messages` Histórico de mensagens
- `/settings` Configurações (horários, limites, auth)

Fonte: `WhatsSelf/src/react-app/App.tsx` e `components/Layout.tsx`.

## Personas e tarefas
- Operador: responder/conferir status, procurar contatos, ver fila.
- Admin: configurar templates/gatilhos/fluxos, limites, horários, usuários.

## Padrões de estado
- Loading: skeletons simples em cards/listas.
- Empty: mensagem clara + CTA (ex.: “Criar Template”).
- Error: banner com causa resumida e ação de retry.
- Disabled: botões claros com `title`/tooltip indicando motivo (ex.: “fora do horário”).

## Acessibilidade
- Contraste AA mínimo em texto e ícones.
- Focus visível em todos os elementos interativos.
- Navegação por teclado (ordem lógica; `skip to content` não obrigatório no MVP).
- Sem dependência de cor para semântica (usar ícones/labels).

## Linguagem e microcopy
- Tom direto, cordial e técnico onde necessário.
- Padronizar rótulos: “Contatos”, “Gatilhos”, “Fluxos”, “Mensagens”.
- Feedbacks curtos: “Conectado”, “Gerando QR…”, “Erro ao salvar”.

## Design tokens e componentes
- Ver `docs/ui-ux/DESIGN_SYSTEM.md` e `docs/ui-ux/COMPONENTS.md`.

## Referências cruzadas
- Arquitetura: `docs/ARCHITECTURE.md`
- Regras de negócio: `docs/technical/BUSINESS_RULES.md`
- API e endpoints: `docs/technical/API.md` e `openapi.yaml`
- Anti‑ban: `docs/reports/PROPOSTA.md` e `docs/technical/STACK.md`

