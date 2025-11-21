# Testes Executados

## Backend
- `npm run test` dentro de `apps/backend`  
  Resultado: **100% dos 61 testes (businessRules, circuitBreaker, authService, config e api) aprovados**.
- `npm run diagnose:whatsapp` (novo script) — valida /health, /qr, WebSocket público e /status autenticado.

## Frontend
- `npm run build` em `frontend/` com Tailwind atualizado (sem gradientes).  
  Resultado: build Vite concluído sem warnings (exceto `punycode` herdado da lib whatsapp-web.js).

## WebSocket
- `node apps/backend/scripts/test-websocket.mjs` (modo privado) — exige backend rodando e credenciais válidas; aguarda `system_status`.
- `npm run diagnose:whatsapp` (modo público + privado) — cobre qr_code/ready e /status.

## Como repetir
```bash
# Passo 0: garantir variáveis e diretórios
npm run env:ensure

# Passo 1: iniciar serviços (backend + frontend)
start.bat

# Passo 2: Diagnóstico rápido antes de abrir o painel
npm run diagnose:whatsapp

# Passo 3: Suite completa de testes (opcional)
cd apps/backend && npm run test
cd ../../frontend && npm run build
```

