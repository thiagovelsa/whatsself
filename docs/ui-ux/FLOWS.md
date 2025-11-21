# Fluxos de UX – WhatsSelf

Modelos de fluxo para as principais tarefas. Referência visual do protótipo em `WhatsSelf/`.

## Conectar WhatsApp (QR)
```mermaid
flowchart TD
  A[Dashboard] --> B[Acessar QR]
  B --> C{Conectado?}
  C -- Não --> D[Exibir QR]
  D --> E[Gerar Novo QR]
  E --> D
  C -- Sim --> F[Mostrar status + histórico]
  F --> A
```

Estados e regras
- Offline: botão “Gerar Novo QR”, instruções passo a passo.
- Online: informações de sessão ativa e histórico.
- Erros: banner com retry e logs mínimos.

## Procurar contato e responder
```mermaid
flowchart TD
  A[Contatos] --> B[Buscar/Filtrar]
  B --> C[Selecionar contato]
  C --> D[Ver conversa]
  D --> E{Fora do horário?}
  E -- Sim --> F[Mensagem educada]
  E -- Não --> G[Responder 1:1]
```

Estados e regras
- Opt-out: destacar e desabilitar automações para o contato.
- Sem nome: exibir “Sem nome” e permitir edição posterior.

## Criar Template → Gatilho → Fluxo
```mermaid
flowchart TD
  T1[Templates] --> T2[Criar Template]
  T2 --> T3[Salvar]
  G1[Gatilhos] --> G2[Criar Gatilho]
  G2 --> G3[Vincular Template/Fluxo]
  G3 --> G4[Prioridade + Cooldown]
  F1[Fluxos] --> F2[Definir passos]
  F2 --> F3[Publicar]
```

Critérios
- Template com `variants` e placeholders.
- Gatilho com tipo, padrão, prioridade, cooldown, destino.
- Fluxo com passos `send_template|collect_input|end`, transições e ordem.

## Simular gatilho/fluxo
```mermaid
flowchart TD
  S1[Simulador] --> S2[Informar texto + contato]
  S2 --> S3[Executar simulação]
  S3 --> S4{Match?}
  S4 -- Não --> S5[Mostrar "sem match"]
  S4 -- Sim --> S6[Exibir gatilho + ações do fluxo]
```

Critérios
- Mostrar trigger casado, instância de fluxo e ações `send_text/end_flow`.
- Útil para depurar regras antes de enviar mensagens reais.

## Opt-out detectado
```mermaid
flowchart TD
  O1[Inbound: "PARAR/SAIR/CANCELAR"] --> O2[Marcar opt-out]
  O2 --> O3[Silenciar contato]
  O3 --> O4[Registrar evento]
```

Regras
- Nunca enviar mensagens automáticas após opt-out.
- Mostrar tag “Opt-out” nos contatos.

