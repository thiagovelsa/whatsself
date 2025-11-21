+ Proposta – Gerador de Fluxos via IA (Ollama) para o WhatsSelf

Documento revisado para organizar a logística do fluxo proposto, alinhado aos contratos já existentes (`Template`, `Trigger`, `Flow`, `FlowStep`) e às regras descritas em `docs/technical/BUSINESS_RULES.md`, `docs/technical/STACK.md` e `docs/reports/PROPOSTA.md`.

---

## 1. Contexto e objetivo

- Disponibilizar uma **página de IA** no painel capaz de transformar instruções em linguagem natural em fluxos de atendimento completos.
- Definir um **pacote JSON padronizado (AiFlowPackage)**, entendido pelo backend atual e seguro para importação.
- Permitir que o operador importe esse pacote na página de Templates/Fluxos, revisando o conteúdo antes de publicar.
- Garantir que toda a automação respeite as camadas existentes de anti-ban, horário comercial, opt-out e circuit breaker.

**Meta operacional:** `ABRIR PÁGINA IA → ENVIAR PROMPT → GERAR JSON → IMPORTAR → PUBLICAR FLUXO`.

---

## 2. Fluxo operacional ponta a ponta

1. **Planejamento pelo operador**
   - Define o objetivo do atendimento (ex.: pré-vendas, suporte, agendamento) e o tom desejado.
2. **Geração via página de IA**
   - Usuário descreve o fluxo e dispara o botão “Gerar fluxo com IA (Ollama)”.
   - Frontend chama `POST /ai/flows/suggest`.
3. **Processamento no backend**
   - Backend monta o prompt base, chama o Ollama (`OLLAMA_BASE_URL` + `OLLAMA_MODEL`) e recebe o JSON bruto.
   - JSON é validado com Zod (`AiFlowPackageSchema`).
4. **Entrega ao usuário**
   - Página de IA mostra resumo + JSON formatado.
   - Usuário pode baixar, copiar ou enviar diretamente para o import.
5. **Importação**
   - Página de Templates/Fluxos abre modal “Importar JSON” e envia `POST /flows/import`.
   - Backend grava templates/gatilhos/fluxos em transação e retorna um resumo do que foi criado/atualizado.
6. **Revisão e publicação**
   - Operador revisa itens em `/templates`, `/triggers`, `/flows`.
   - Publica o fluxo usando `POST /flows/:id/publish` quando estiver satisfeito.

---

## 3. Componentes e responsabilidades

### 3.1. Página de IA (frontend)

- Tela dedicada (`AiFlowDesigner`) com:
  - Textarea para o prompt livre.
  - Campos opcionais: tipo de atendimento, tom, idioma.
  - Botão “Gerar fluxo com IA (Ollama)”.
- Exibe o resultado:
  - Resumo textual do fluxo.
  - JSON formatado, com botões “Copiar” e “Enviar para importação”.

### 3.2. Backend – módulo de IA

- Endpoint `POST /ai/flows/suggest`:
  - Recebe o prompt e parâmetros opcionais.
  - Injeta prompt base fixo (define formato do JSON e regras de negócio).
  - Chama o Ollama, extrai somente o JSON e valida (`AiFlowPackageSchema`).
  - Retorna `{ package, raw }`, onde `package` é o objeto tipado e `raw` é o texto bruto (para auditoria).

### 3.3. Backend – pipeline de importação

- Endpoint `POST /flows/import`:
  - Campos: `package`, `mode` (`create` | `upsert`), `dryRun` (boolean).
  - Executa:
    1. Validação sintática com Zod.
    2. Validação de regras de negócio (limites de passos, loops, compatibilidade com precedência de fluxos).
    3. Transação Prisma para criar/atualizar templates, flows, steps e triggers.
  - Retorna resumo e avisos (duplicidades, itens ignorados).

### 3.4. Página de Templates/Fluxos

- Recebe nova ação “Importar JSON”.
- Modal com textarea e checkbox “Sobrescrever existentes (upsert)”.
- Após importação, mostra o resumo retornado pelo backend e link rápido para o fluxo criado.

---

## 4. Formato do pacote gerado pela IA

### 4.1. Estrutura geral

```json
{
  "metadata": {
    "name": "string",
    "description": "string",
    "locale": "pt-BR",
    "channel": "whatsapp",
    "version": 1,
    "tags": ["string"]
  },
  "templates": [],
  "flows": [],
  "triggers": []
}
```

- `metadata`: descrição humana do pacote (nome, idioma, tags).
- `templates`: coleções de mensagens reutilizáveis.
- `flows`: fluxos em draft com steps ordenados.
- `triggers`: mapeiam padrões para templates ou fluxos.

Cada item possui um `id` **local** usado apenas dentro do pacote; na importação ele é traduzido para IDs reais do banco.

### 4.2. Templates

```json
{
  "id": "template_boas_vindas",
  "key": "boas_vindas_vendas",
  "content": "Olá {{nome}}! Sou da {{empresa}}...",
  "variables": ["nome", "empresa"],
  "variants": ["Oi {{nome}}! ...", "Olá {{nome}}! ..."],
  "locale": "pt-BR",
  "isActive": true
}
```

- Campo `key` permite upsert seguro.
- `variants` preservam a camada de humanização existente.

### 4.3. Fluxos e steps

```json
{
  "id": "flow_vendas_menu",
  "name": "Atendimento - Vendas (Menu)",
  "status": "draft",
  "version": 1,
  "steps": [
    {
      "id": "step_boas_vindas",
      "key": "boas_vindas",
      "type": "send_template",
      "templateRef": "template_boas_vindas",
      "waitInput": true,
      "order": 0,
      "transitions": { "next": "step_menu" }
    },
    {
      "id": "step_menu",
      "key": "menu",
      "type": "collect_input",
      "waitInput": true,
      "order": 1,
      "transitions": {
        "1": "step_orcamento",
        "2": "step_suporte",
        "*": "step_falar_humano"
      }
    }
  ]
}
```

Regras:

- Tipos válidos: `send_template`, `collect_input`, `end`.
- `templateRef` aponta para `templates[].id`.
- `transitions` mapeiam entradas para `steps[].id` (`next` e `*` seguem o padrão já descrito em `BUSINESS_RULES.md`).
- Limites:
  - Até 20 steps por fluxo.
  - Máx. 10 passos automáticos em sequência sem `collect_input`.
  - Detectar loops que nunca esperam input.

### 4.4. Gatilhos

```json
{
  "id": "trigger_vendas",
  "type": "contains",
  "pattern": "vendas",
  "priority": 100,
  "cooldownSec": 300,
  "active": true,
  "templateRef": null,
  "flowRef": "flow_vendas_menu"
}
```

- `type`: `equals | contains | regex | number`.
- `templateRef` e `flowRef` são mutuamente opcionais; pelo menos um deve estar preenchido.
- `priority` e `cooldownSec` seguem o padrão atual para precedência e cadência.

---

## 5. Processo de importação (backend)

1. **Entrada**
   - Body: `{ package, mode, dryRun }`.
   - `mode`:
     - `create`: falha se já existir `key`/nome duplicado.
     - `upsert`: reutiliza e atualiza registros existentes.
   - `dryRun`: valida e retorna o que aconteceria, sem gravar.

2. **Validação**
   - Zod (`AiFlowPackageSchema`) garante integridade estrutural.
   - Validações adicionais:
     - IDs locais únicos.
     - `templateRef`/`flowRef` apontando para recursos existentes no pacote.
     - Limites de passos e transições seguras.

3. **Execução em transação**
   - Criação/atualização de templates primeiro (para resolver `templateRef`).
   - Criação de flows e steps em duas passagens (primeiro os steps, depois atualização das transições para IDs reais).
   - Criação/atualização dos gatilhos apontando para os IDs finais.

4. **Retorno**
   - Contagem de itens criados/atualizados.
   - Avisos (ex.: “Template key X atualizado porque mode=upsert”).
   - Lista de erros (quando houver) com mensagens amigáveis para o painel.

---

## 6. Integração com Ollama

### 6.1. Configuração

Adicionar variáveis no `.env` do backend:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TIMEOUT_MS=30000
```

- Se `OLLAMA_BASE_URL` ou `OLLAMA_MODEL` não estiverem definidos, `POST /ai/flows/suggest` responde `503` com mensagem “IA desativada”.
- Timeout configurável evita travamentos no painel.

### 6.2. Endpoint `POST /ai/flows/suggest`

- Body:

```json
{
  "prompt": "Quero um fluxo de pré-venda...",
  "tone": "informal",
  "type": "vendas",
  "locale": "pt-BR"
}
```

- Resposta:

```json
{
  "package": { "...": "AiFlowPackage" },
  "raw": "{...JSON original...}"
}
```

### 6.3. Prompt base

Backend injeta instruções fixas, por exemplo:

```
Você é um “AI Flow Designer” da plataforma WhatsSelf.
Transforme a descrição em um pacote JSON EXATO no formato AiFlowPackage.
Regras:
- Responda apenas com JSON válido.
- Canal WhatsApp, idioma pt-BR.
- Use ids locais para templates, fluxos, steps e triggers.
- Steps usam types send_template | collect_input | end.
- Gatilhos usam types equals | contains | regex | number.
- Até 20 steps por fluxo; evite loops sem input.
Descrição do usuário:
<<<PROMPT DO USUÁRIO AQUI>>>
```

Esse prompt garante que o modelo entregue algo importável e consistente com o backend.

---

## 7. UX e operação

### 7.1. Página de IA

- Disponibilizar no menu “Configurações → IA / Gerador de Fluxos”.
- Estados:
  - **Carregando:** spinner e texto “Gerando fluxo com Ollama…”.
  - **Erro:** mensagem clara (timeout, modelo indisponível, JSON inválido).
  - **Sucesso:** mostra resumo (nome, total de templates/flows/triggers) e JSON formatado.
- Ações:
  - `Copiar JSON`
  - `Baixar .json`
  - `Enviar para importação` → dispara `POST /flows/import` com `mode: "create"` (padrão).

### 7.2. Modal “Importar JSON”

- Acessível em `/templates` e `/flows`.
- Contém:
  - Textarea/JSON editor com validação básica antes de enviar.
  - Checkbox `Sobrescrever existentes (upsert)`.
  - Checkbox `Somente validar (dry run)`.
- Após import:
  - Mostrar resumo.
  - Botão “Abrir fluxo criado” quando existir `flowId`.

---

## 8. Segurança e limites

- Nenhuma etapa altera:
  - Rate limit global ou por contato.
  - Guards de horário comercial.
  - Regras de opt-out.
  - Circuit breaker (permanecem ativos e exigidos).
- Todos os fluxos importados entram como `draft`; publicação é manual.
- Logs devem registrar:
  - Prompt (hash ou resumo, para evitar PII).
  - Quem iniciou a geração/importação.
  - Resultado (sucesso/erro) e IDs criados.
- Falhas na IA ou importação não impactam a fila de mensagens existente.

---

## 9. Roadmap incremental

1. **Fase 1 – Importador seguro**
   - Implementar `AiFlowPackageSchema`.
   - Criar `POST /flows/import` e UI de importação.
   - Testar fluxo manual importando JSON estático.

2. **Fase 2 – Integração com Ollama**
   - Implementar `ollamaClient` e `aiFlowDesignerService`.
   - Expor `POST /ai/flows/suggest`.
   - Criar a página “IA / Gerador de Fluxos”.

3. **Fase 3 – Refinos**
   - Melhorar pré-visualização (cards com passos).
   - Feedback proativo sobre riscos (ex.: muitos passos automáticos).
   - Ações rápidas (abrir fluxo recém-criado, editar diretamente).

Com essa logística, o AI Flow Designer opera como uma camada adicional (não disruptiva) sobre os módulos já existentes, mantendo integridade de regras e conferindo rastreabilidade de ponta a ponta.

