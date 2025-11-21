# docs/technical/DEPLOYMENT.md

Guia rápido de deploy do backend em produção (PM2 ou Docker) e procedimentos essenciais.

## Pré‑requisitos

- Node.js 20 LTS e npm (para PM2) ou Docker Engine + Compose
- Banco PostgreSQL gerenciado (recomendado) – defina `DATABASE_URL`
- Domínio com HTTPS (via proxy/Nginx/Traefik/Cloud)

## Variáveis de ambiente

- Copie `.env.example` para `.env` e ajuste:
  - `NODE_ENV=production`
  - `PORT` (ex.: 3001)
  - `DATABASE_URL` (Postgres)
  - `JWT_SECRET` (forte)
  - `API_CORS_ORIGIN` (domínio do painel)

## Passos com PM2

1) Instalar dependências e compilar
```
cd apps/backend
npm ci
npm run build
```
2) Provisionar banco e migrações (na raiz)
```
cd ../..
npx prisma generate
npx prisma migrate deploy
```
3) Subir com PM2
```
npm i -g pm2
pm2 start apps/backend/dist/index.js --name whatsself-api --update-env
pm2 save
pm2 startup  # opcional: iniciar no boot
```
4) Proxy reverso
- Configure Nginx/Traefik para encaminhar `https://api.seu-dominio.com` → `http://localhost:3001`.
- Ative HTTP/2 e TLS modernos.

## Passos com Docker (exemplo simples)

Dockerfile (sugestão):
```
# Etapa build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
RUN npm --prefix apps/backend ci
COPY . .
RUN npm --prefix apps/backend run build

# Etapa runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/package*.json ./apps/backend/
RUN npm --prefix apps/backend ci --omit=dev
EXPOSE 3001
CMD ["node", "apps/backend/dist/index.js"]
```

Compose (trecho):
```
services:
  api:
    build: .
    env_file: .env
    ports:
      - "3001:3001"
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: whatsself
      POSTGRES_USER: whatsself
      POSTGRES_PASSWORD: troque-isto
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata: {}
```

Aplique migrações com `npx prisma migrate deploy` executado no container ou em job separado de release.

## Observabilidade e segurança

- Exponha `/health` no load balancer e crie alarme de falha.
- Adicione `/metrics` (Prometheus) conforme `docs/technical/MONITORING.md`.
- Restrinja CORS e proteja rotas sensíveis com JWT.
- Rotacione segredos e configure backups do Postgres (RPO ≤ 24h).

## Checklists de release

- [ ] `DATABASE_URL` aponta para Postgres prod
- [ ] Migrações aplicadas (`migrate deploy`)
- [ ] Logs fluindo para agregador
- [ ] CORS e AUTH habilitados
- [ ] Backups e monitoramento ativos

