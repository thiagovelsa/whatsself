# Relatório de Revisão Técnica - WhatsSelf

## Resumo Executivo
A revisão do código identificou que o sistema segue uma arquitetura coerente, mas apresenta riscos de escalabilidade em operações de listagem e envio em massa (broadcast), além de lacunas de testes em componentes críticos. Não foram encontradas automações "fantasmas" ativas por padrão que enviem mensagens sem configuração (o "First Contact" vem desativado por padrão), mas sua implementação é hardcoded.

---

## 1. Backend (Performance e Robustez)

### Crítico: Consumo de Memória em Broadcast
**Arquivo:** `apps/backend/src/server.ts` (Linha ~980, endpoint `/broadcast`)
**Impacto:** O endpoint carrega **todos** os contatos do banco na memória (`prisma.contact.findMany`) antes de iterar. Em uma lista de 10k+ contatos, isso causará pico de memória e possível crash do processo Node.js.
**Sugestão:** Implementar processamento em *chunks* (paginação via cursor) ou mover a lógica de seleção de contatos para um *background job* que processe em lotes.

### Alto: Listagens Sem Paginação (Unbounded Queries)
**Arquivos:** `apps/backend/src/server.ts`
- `/flows` (Linha ~660): Retorna todos os fluxos e steps aninhados.
- `/templates` (Linha ~560): Retorna todos os templates.
- `/triggers` (Linha ~620): Retorna todos os triggers.
**Impacto:** Degradação progressiva do Dashboard e telas de configuração conforme o uso cresce. Trava a UI do frontend ao tentar renderizar listas gigantes.
**Sugestão:** Adicionar parâmetros `take/skip` obrigatórios ou defaults seguros (ex: `take: 50`) nesses endpoints.

### Alto: Serialização da Fila (CPU Bound)
**Arquivo:** `apps/backend/src/services/messageQueue.ts`
**Impacto:** Embora use `fs.promises` (evitando bloqueio de I/O), a cada operação de escrita o sistema serializa a fila inteira usando `JSON.stringify`. Com uma fila cheia (ex: 10k itens), essa operação síncrona pode bloquear o Event Loop (CPU bound), aumentando a latência de resposta da API. Além disso, `globalSentTimes` (rate limit) reside em memória e é perdido ao reiniciar o processo.
**Sugestão:** Migrar persistência da fila e rate limits para um banco (Redis ou tabela PostgreSQL), evitando a sobrecarga de serializar o estado completo a cada mudança.

### Médio: Processamento de Métricas (CPU Burst)
**Arquivo:** `apps/backend/src/server.ts` (`/metrics/timeseries`)
**Impacto:** O endpoint limita a busca a 10.000 mensagens (seguro para memória), mas realiza o agrupamento por hora em um loop JavaScript. Isso gera um pico de uso de CPU desnecessário a cada requisição do dashboard.
**Sugestão:** Realizar o agrupamento via SQL (`GROUP BY date_trunc('hour', created_at)`), delegando o esforço computacional ao banco de dados (que é otimizado para isso).

---

## 2. Regras de Negócio e Automações

### Automações Implícitas ("Hardcoded")
**Arquivo:** `apps/backend/src/services/businessRules.ts`
**Achado:** A lógica de "First Contact Welcome" existe no código.
- **Status:** **Seguro.** Vem desativada por padrão (`firstContactEnabled: false` no `SystemConfig`) e o texto é configurável.
- **Crítica Arquitetural:** A lógica de disparo ("é a primeira mensagem?") é fixa no código (`businessRules.ts`). O usuário não tem flexibilidade para alterar a condição (ex: "enviar só se não tiver vindo de anúncio").
- **Recomendação:** Futuramente, migrar essa lógica para um Gatilho de Sistema visível na UI, unificando a gestão de regras de disparo.

### Horário Comercial
**Arquivo:** `apps/backend/src/services/businessRules.ts`
**Achado:** O sistema verifica horário comercial, mas a ação padrão fora do horário é continuar o fluxo sem resposta automática (`outside_business_hours_continue`).
**Risco:** O comportamento silencioso (sem auto-reply de "estamos fechados") pode não ser o esperado por alguns usuários, embora evite spam acidental.
**Recomendação:** Explicitar na UI de configurações que "fora do horário comercial" apenas pausa notificações ou segue fluxo normal, ou permitir configurar uma resposta automática opcional.

---

## 3. Frontend (Consistência)

### Consumo de Listas
**Arquivos:** `frontend/src/react-app/services/*.ts`
**Impacto:** Os serviços de `flows`, `templates` e `triggers` consomem os endpoints sem paginação do backend.
**Sugestão:** Implementar paginação ou *infinite scroll* nas telas de listagem para suportar volumes maiores de dados.

### Endpoint `/messages` Sem Limite Explícito
**Arquivo:** `frontend/src/react-app/services/apiService.ts`
**Impacto:** O método `messages.getAll` permite chamada sem parâmetros. Se ocorrer, o backend tenta retornar todas as mensagens do banco.
**Sugestão:** Tornar parâmetros de paginação obrigatórios no serviço frontend ou implementar limite default (`take: 50`) no backend.

---

## 4. Testes e Cobertura

### Lacunas Críticas
- **Falta de Testes Unitários:**
    - `apps/backend/src/domain/flowEngine.ts`: O motor de fluxos (máquina de estados) não tem testes isolados. Crítico pois qualquer erro aqui quebra toda a automação.
    - `apps/backend/src/services/automationOrchestrator.ts`: A orquestração entre WhatsApp, Fila e Regras não está testada.
    - `apps/backend/src/services/messageQueue.ts`: A lógica de retry e persistência carece de testes.
- **Ponto Positivo:** Os testes de `businessRules` cobrem bem os casos de borda de horário e first contact.

---

## 5. Outros Achados

- **Watchers:** O Watchdog do WhatsApp roda a cada 60s, adequado para recuperação sem agressividade.
- **WebSocket:** Cliente frontend implementa reconexão exponencial correta.
- **Cleanup:** Tarefa automática limpa mensagens antigas (>90 dias), garantindo manutenção básica do banco.
