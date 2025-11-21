# docs/technical/DATABASE.md

Detalhes de schema, índices, migrações e operações do banco de dados.

## Tecnologia

- Dev: SQLite via Prisma (`DATABASE_URL="file:./dev.db"`)
- Produção: PostgreSQL recomendado
- ORM: Prisma Client 5.x

## Modelos e relacionamentos (resumo)

- Contact (1) —— (N) Message
- Contact (1) —— (N) FlowInstance
- Flow (1) —— (N) FlowStep
- Flow (1) —— (N) FlowInstance
- Trigger (opcional) → Template/Flow
- Template (1) —— (N) FlowStep, (1) —— (N) Message

### Contact
- id (cuid, PK)
- phone (string, unique)
- name (string?)
- optIn (boolean, default true)
- timestamps

### Template
- id (cuid, PK)
- key (string, unique)
- content (string)
- variables (json?)  // ex.: ["nome"]
- variants (json?)   // ex.: ["Oi {{nome}}!", "Olá {{nome}}!"]
- locale (string?)
- isActive (boolean, default true)
- timestamps

### Trigger
- id (cuid, PK)
- type (equals|contains|regex|number)
- pattern (string)
- priority (int, default 0)
- cooldownSec (int, default 0)
- active (boolean, default true)
- templateId (FK?)
- flowId (FK?)
- timestamps

### Flow
- id (cuid, PK)
- name (string)
- status (draft|published|archived)
- version (int)
- schemaJson (json?)
- entryTriggerId (FK?)
- timestamps

### FlowStep
- id (cuid, PK)
- flowId (FK)
- key (string)
- type (send_template|collect_input|end)
- templateId (FK?)
- waitInput (boolean)
- transitionsJson (json?) // chave:resposta → próximo passo
- order (int)

### FlowInstance
- id (cuid, PK)
- contactId (FK)
- flowId (FK)
- currentStepKey (string)
- stateJson (json?)
- lastInteractionAt (datetime)
- paused (boolean)
- lockedBy (string?)
- timestamps

### Message
- id (cuid, PK)
- contactId (FK)
- direction (inbound|outbound)
- status (queued|sent|failed|delivered|read)
- content (string)
- triggerId (FK?)
- flowInstanceId (FK?)
- templateId (FK?)
- timestamps

## Índices recomendados

- `Message(contactId, createdAt)` para listagens por contato/ordem cronológica.
- `Message(contactId, triggerId, direction, createdAt)` para checar cooldown por gatilho (ver `triggerMatcher`).
- `Trigger(active, priority desc, updatedAt desc)` para ordenação/consulta frequente.
- `FlowInstance(contactId, paused)` para busca de instância ativa por contato.
- `FlowStep(flowId, order)` para recuperar o primeiro passo de um fluxo.

Observação: no SQLite, alguns índices compostos podem não trazer ganho visível em dev, mas são relevantes em Postgres.

## Migrações e geração de client

- Gerar client:
```
npx prisma generate
```
- Aplicar schema em dev (cria/alterar tabelas sem histórico):
```
npx prisma db push
```
- Criar migração (desenvolvimento):
```
npx prisma migrate dev -n "descricao"
```
- Aplicar migrações em produção:
```
npx prisma migrate deploy
```

## Seeds (futuro)

- Criar `prisma/seed.ts` com templates/gatilhos/fluxos básicos.
- Rodar via `npm run seed` (script a ser adicionado) ou `node prisma/seed.ts`.

## Políticas de backup

- Dev (SQLite): cópia do arquivo `dev.db` diária em pasta protegida; manter 7–14 versões.
- Prod (PostgreSQL): snapshots automáticos (RPO ≤ 24h) e restauração testada mensalmente. Exportar dump cifrado (pg_dump) para storage seguro.

## Consultas críticas (impacto de performance)

- Cooldown por gatilho (em `triggerMatcher.ts`):
  - Busca última mensagem outbound por `(contactId, triggerId)` com `createdAt >= since`.
  - Índice recomendado: `(contactId, triggerId, direction, createdAt)`.
- Recuperação do primeiro passo do fluxo (em `flowEngine.ts`):
  - Consulta por `flowId` ordenando por `order asc, key asc`.
  - Índice recomendado: `(flowId, order)`.

## Boas práticas operacionais

- Usar transações ao criar Fluxo + Steps em lote quando necessário.
- Validar conteúdo de `variants` e `variables` para evitar JSON malformado.
- Não persistir mídias no mesmo banco; usar storage externo (S3-like) no futuro.

