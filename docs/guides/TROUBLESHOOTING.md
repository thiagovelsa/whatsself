# docs/guides/TROUBLESHOOTING.md

Problemas comuns, causas prováveis e como resolver.

## Geral

- Node versão incorreta
  - Sintoma: erros estranhos em dependências/ESM.
  - Ação: use Node 20 LTS (`node -v`).

- Variáveis de ambiente ausentes
  - Sintoma: falha ao iniciar, portas erradas, URL de DB inválida.
  - Ação: copie `.env.example` para `.env` e ajuste; ver docs/technical/STACK.md.

- Prisma Client não gerado
  - Sintoma: erro `Cannot find module @prisma/client` em runtime.
  - Ação: `npx prisma generate` na raiz.

- Schema não aplicado
  - Sintoma: erros de tabela ausente.
  - Ação: `npx prisma db push` (dev) ou `npx prisma migrate deploy` (prod).

## API

- Erro 400 com `{ error: "mensagem" }`
  - Causa: validação Zod do payload falhou.
  - Ação: revise corpo da requisição conforme `docs/technical/API.md`.

- CORS bloqueando chamadas do painel (futuro)
  - Causa: origem não autorizada.
  - Ação: ajustar CORS na API para incluir domínio do painel.

- 500 em `/health`
  - Causa: banco indisponível.
  - Ação: verifique `DATABASE_URL`, conectividade e logs do banco.

## WhatsApp (quando implementado)

- Sessão perdida (QR pedindo novamente)
  - Causa: diretório da sessão (`WHATS_SESSION_PATH`) foi apagado ou expurgado.
  - Ação: reautenticar via QR; persistir diretório em volume estável; monitorar evento de desconexão.

- Erros de envio/banimento
  - Causa: cadência alta, mensagens repetitivas ou envio para contatos sem opt-in.
  - Ação: reduzir limites, variar templates, aplicar janelas de horário, usar circuit breaker.

- Mídia não enviada
  - Causa: caminho inválido, formato não suportado ou throttling.
  - Ação: validar tipos, reduzir tamanho e respeitar limites de taxa.

## Banco de dados

- Arquivo SQLite bloqueado
  - Causa: múltiplos processos com lock no mesmo arquivo.
  - Ação: fechar processos, usar um único servidor dev ou migrar para Postgres.

- Migração falhou em produção
  - Ação: aplicar `prisma migrate resolve` conforme documentação e restaurar backup se necessário.

## Dicas de depuração

- Ative logs detalhados no Pino (level `debug`) durante diagnóstico local.
- Adicione `requestId` nos logs para correlação entre camadas.
- Use o endpoint `/simulate` para validar regras de gatilhos/fluxos sem enviar mensagens reais.

