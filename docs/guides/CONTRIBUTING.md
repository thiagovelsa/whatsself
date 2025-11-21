# docs/guides/CONTRIBUTING.md

Guia para contribuir com o WhatsSelf.

## Pré‑requisitos

- Node.js 20 LTS
- npm (ou pnpm)
- SQLite instalado (dev) – opcional, Prisma cria o arquivo

## Setup de desenvolvimento

1) Instalar dependências do backend:
```
cd apps/backend
npm install
```
2) Variáveis de ambiente:
```
cp .env.example .env
```
3) Banco de dados (gera client e cria tabelas):
```
cd ../..
npx prisma generate
npx prisma db push
```
4) Rodar a API:
```
cd apps/backend
npm run dev
```

## Padrões de código

- TypeScript estrito (`strict: true`).
- Validação com Zod em payloads de API.
- Camadas: domínio (`src/domain`) → serviços (`src/services`) → API (`src/server.ts`).
- Nomes descritivos, evitar abreviações.

## Estilo e lint

- Preferir ESLint + Prettier (a configurar). Manter o estilo consistente com o código atual.

## Commits e PRs

- Commits no padrão Conventional Commits (ex.: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- PRs pequenos e focados; descrição do problema, solução e impacto.
- Adicione exemplos de uso quando alterar a API.
- Atualize documentação relacionada (docs/technical/API.md, docs/technical/DATABASE.md, etc.).

## Testes

- Adicione testes de unidade para domínio e serviços (Vitest).
- Para rotas, use Supertest.
- Cobertura mínima: ver docs/technical/TESTING.md.

## Segurança

- Nunca inclua `.env` ou segredos em commits.
- Não logar conteúdo sensível (PII). Ver docs/technical/SECURITY.md.

## Roadmap e issues

- Prioridades e fases: ver docs/reports/ROADMAP.md e docs/reports/PROPOSTA.md.
- Use issues para discutir mudanças de escopo.

