# docs/technical/SECURITY.md

Política de segurança, privacidade e conformidade para o projeto WhatsSelf.

## Objetivos

- Proteger dados de contatos e mensagens.
- Reduzir riscos operacionais (ban, abuso, vazamento e indisponibilidade).
- Atender requisitos mínimos de LGPD/GDPR desde o MVP.

## Escopo e classificação de dados

- Dados pessoais: número de telefone, nome, tags e opt-in/opt-out.
- Dados de mensagens: conteúdo textual e metadados (direção, status, timestamps).
- Dados operacionais: templates, gatilhos, fluxos e métricas.
- Classificação sugerida:
  - PII sensível: telefone, nome, conteúdo. Proteção alta, retenção restrita.
  - Operacional: templates/fluxos/gatilhos. Proteção média, retenção necessária ao negócio.

## Autenticação e autorização (estado atual x alvo)

- Estado atual: API sem autenticação; uso apenas em ambiente controlado (rede privada/localhost).
- Alvo curto prazo:
  - JWT (HS256) emitido por endpoint de login (usuário/senha) com expiração curta e refresh.
  - RBAC simples: admin (CRUD completo), operator (listar/operar apenas), viewer (somente leitura).
  - Rate limit global e por IP em rotas de autenticação e públicas.
- Boas práticas:
  - Armazenar `JWT_SECRET` via variável de ambiente.
  - Rotas sensíveis atrás de proxy/reverse com TLS terminado (HTTPS obrigatório).
  - Rotas de painel com CORS estrito.

## Gestão de tokens/sessões

- Tokens JWT com expiração de 15–60min e refresh de 7–30 dias.
- Logout invalida refresh tokens (lista de revogação em banco/cache).
- Em produção, preferir cookies `HttpOnly`, `Secure`, `SameSite=Strict` quando o painel estiver no mesmo domínio.

## Criptografia e segredos

- Em trânsito: HTTPS em todas as comunicações externas (painel ↔ API; API ↔ banco/Redis).
- Em repouso:
  - SQLite (dev): proteger o arquivo com permissões restritas e disco criptografado do SO.
  - PostgreSQL: habilitar encryption at rest do provedor, TDE quando disponível.
- Segredos: `.env` nunca vai para VCS. Usar cofre (Secrets Manager) em produção.

## Logs e dados sensíveis

- Não logar conteúdo de mensagens ou telefones completos por padrão. Preferir mascarar: `+55********1234`.
- Correlacionar logs por IDs internos (contactId, messageId).
- Definir retenção curta de logs com PII (ex.: 7–30 dias) e arquivamento anonimizando dados.

## Retenção e minimização (LGPD/GDPR)

- Minimização: armazenar apenas o necessário para operar e auditar.
- Retenção sugerida:
  - Contatos: ativo enquanto houver relação e consentimento.
  - Mensagens: 30–90 dias em produção (configurável), depois anonimizar/expurgar.
  - Métricas agregadas: sem PII.
- Direitos do titular (LGPD/GDPR): acesso, correção, exclusão, portabilidade e revogação de consentimento. Implementar endpoints/rotinas administrativas para atender solicitações.

## Consentimento e opt-out

- Explícito para contatos incluídos manualmente.
- Implícito para quem inicia a conversa, respeitando opt-out imediato por palavras-chave (“PARAR/SAIR/CANCELAR”).
- Registrar `optIn`/`optOut` e data do evento.

## Anti‑spam / Anti‑ban

- Tratar cadência: limites globais (8–12 msgs/min) e por contato (1–2 msgs/5min).
- Atrasos e typing sempre presentes; mensagens variam por template/variante.
- Circuit Breaker: reduzir/pausar quando houver falhas elevadas.
- Janela de horário: evitar envios fora do expediente.

## Backups e restauração

- Dev (SQLite): backup do arquivo `dev.db` com versionamento diário (local seguro).
- Prod (PostgreSQL): snapshots automáticos (RPO ≤ 24h) e testes de restauração periódicos.
- Armazenar backups criptografados e com acesso restrito.

## Resposta a incidentes

- Detecção: alertas para taxa de erro, falhas de entrega, queda de sessão.
- Contenção: pausar automações (circuito aberto), restringir acessos, rotacionar segredos.
- Erradicação/Recuperação: restaurar a partir de backup quando necessário, revisão de PRs e configurações.
- Pós‑incidente: RCA documentada e ações corretivas registradas no CHANGELOG/Issues.

## Conformidade (LGPD/GDPR)

- Base legal principal: consentimento e/ou legítimo interesse (casos de inbound).
- Registro de atividades de tratamento (ROPA) em documento operacional da empresa.
- DPO/Encarregado: definir responsável e canal de contato.
- Avaliação de impacto (DPIA) recomendada antes de grandes mudanças.

## Checklist mínimo (MVP em dev)

- [ ] `.env` fora do VCS e com segredos fortes
- [ ] API atrás de rede privada ou autenticação obrigatória
- [ ] Logs sem PII em claro; mascaramento aplicado
- [ ] Backups periódicos do banco
- [ ] Opt‑out respeitado e auditável
- [ ] Plano de atualização de dependências e correções de segurança

