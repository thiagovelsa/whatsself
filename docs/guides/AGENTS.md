# docs/guides/AGENTS.md

Instruções para agentes de código (Codex/Claude/etc.) que trabalham neste repositório.

## Escopo e arquitetura

- Backend em TypeScript (Node 20) com Express e Prisma.
- Camadas:
  - `src/domain/` – regras de negócio (gatilhos, fluxos)
  - `src/services/` – serviços auxiliares (render de template)
  - `src/server.ts` – rotas HTTP (Zod para validar payloads)
  - `src/index.ts` – bootstrap
- Banco: SQLite no dev, Postgres no prod; schema em `prisma/schema.prisma`.

## Convenções de código

- TypeScript com `strict: true` (ver `apps/backend/tsconfig.json`).
- Validação de entrada com Zod nas rotas.
- Não logar PII (telefone/conteúdo) em claro; usar IDs internos.
- Não alterar nomes/paths sem necessidade. Manter estrutura minimalista.
- Escrever funções puras no domínio sempre que possível e cobrir com testes.

## Fluxo de trabalho

1) Antes de implementar: leia `docs/reports/PROPOSTA.md` e `docs/technical/STACK.md` para entender o produto e decisões.
2) Ao criar endpoints: mantenha a validação com Zod e documente em `docs/technical/API.md` e `openapi.yaml`.
3) Ao tocar domínio: respeite as regras anti‑ban (cadência, delays, circuit breaker) descritas nos docs.
4) Atualize documentação relevante se a superfície da API ou regras mudarem.

## Execução local

- Primeiro uso:
```
npm --prefix apps/backend install
npx prisma generate
npx prisma db push
npm --prefix apps/backend run dev
```
- Health: `GET http://localhost:3001/health`
- Simulação de regras: `POST /simulate` (veja `docs/technical/API.md`).

## Testes

- Adotar Vitest para domínio e Supertest para API (ver `docs/technical/TESTING.md`).
- Preferir SQLite em memória para testes. Rodar `prisma db push` antes.

## Segurança e privacidade

- Consultar `docs/technical/SECURITY.md` (LGPD/GDPR, tokens, retenção, backups, incidentes).
- Em PRs: revisar se logs não vazam PII e se configurações sensíveis não vão para o VCS.

## Deploy e operação

- Instruções em `docs/technical/DEPLOYMENT.md` (PM2/Docker – básico) e `docs/technical/MONITORING.md` (métricas/alertas).

