# Validação do Fluxo WhatsApp ↔ Backend ↔ Frontend

## Objetivo
Garantir que o pipeline completo (sessão WhatsApp, API Express, WebSocket e painel web) esteja saudável e detecte regressões rapidamente antes do usuário escanear o QR.

## Ferramentas adicionadas
- `scripts/ensure-env.mjs`: garante `.env`, diretórios (`data/whatsapp_session`, `temp/windows`) e randomiza segredos antes de subir os serviços.
- `apps/backend/scripts/diagnose-whatsapp.mjs`: script CLI que executa a seguinte bateria:
  1. `GET /health`
  2. `GET /qr`
  3. Conexão WebSocket em modo **public** aguardando `qr_code` ou `whatsapp_ready`
  4. `POST /auth/login` + `GET /status`
  → Comando disponível via `npm run diagnose:whatsapp` (executar na raiz após subir backend).

## Procedimento recomendado
1. `start.bat` (ou `fix-whatsself.bat` para correção completa) – garante dependências, sincroniza Prisma/SystemConfig, inicia backend + frontend.
2. `npm run diagnose:whatsapp` – confirma que API e WebSocket respondem antes de solicitar o celular do operador.
3. Abrir `http://localhost:5173/qr` (ou a landing pública) e escanear o QR exibido. O painel consome os mesmos eventos usados pelo script, então qualquer divergência ficará evidente.
4. Após parear, usar `/status` (ou o painel) para validar:
   - `whatsapp.ready === true`
   - `queue.processing === true` (após enviar mensagens)
   - `circuitBreaker.state === 'CLOSED'`
5. Enviar/receber uma mensagem real via `/send` ou pela interface para finalizar a verificação.

## Resultados esperados
- QR Code disponível (REST ou WebSocket) em < 30s após `start.bat`.
- Evento `whatsapp_ready` distribuído a todos os clientes autenticados.
- Sessão persistida em `data/whatsapp_session/` (mantida entre reinícios).
- `npm run diagnose:whatsapp` retornando status ✅ em todas as etapas.

> Observação: o script não simula o aplicativo oficial do WhatsApp. Ele assegura que toda a cadeia até o WebSocket esteja operacional – qualquer falha restante será física (navegador/telefone) e não do backend.

