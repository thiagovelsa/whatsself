# Relatório Técnico – Resiliência e Performance (WhatsSelf)

## 1. Pontos Fortes
- **Orquestração integrada**: `AutomationOrchestrator` concentra fila, WhatsApp client, circuit breaker e WebSocket. A atualização em tempo real (via `emitSystemStatus`) já existe e facilita diagnósticos.
- **Ferramentas Windows**: scripts `.bat` (por exemplo, `repair-windows.bat` e `diagnose-whatsapp.mjs`) mantêm o setup prático para usuários domésticos, sem exigir Linux.
- **Config centralizada**: `systemConfigService` dissemina mudanças (como `skipWhatsapp`, limites e portas WebSocket), garantindo que todos os serviços reajam automaticamente.
- **Dashboard enriquecido**: o novo endpoint `/dashboard/summary` entrega saúde do robô, alertas e mensagens recentes em uma resposta, reduzindo múltiplas chamadas do frontend.

## 2. Melhorias de Baixo Risco
1. **Fila em memória com loop contínuo** – `apps/backend/src/services/messageQueue.ts`
   - Hoje a fila roda `while (this.queue.length > 0)` com `sleep(2000)` quando atinge o rate-limit. Em Windows, esse loop pode consumir CPU desnecessária e atrasar mensagens.
   - Recomendo migrar o processamento para um modelo event-driven simples: usar `setTimeout` apenas quando existir item elegível e liberar a thread quando o rate-limit impedir envios. É uma troca local que melhora responsividade sem reescrever a fila.

2. **Persistência da fila e dos contadores de rate-limit**
   - Reiniciar o backend zera o backlog e “esquece” a janela de rate-limit, causando picos logo após subir o processo.
   - Como solução rápida, serializar o array `queue` + mapas `globalSentTimes/ contactSentTimes` para um arquivo em `data/queue-state.json`. Restaurar esse estado no boot evita perda de mensagens e mantém limites consistentes.

3. **Circuit breaker sem estado persistido** – `apps/backend/src/services/circuitBreaker.ts`
   - O estado (`OPEN/HALF_OPEN`, `cooldownMultiplier`, tentativas recentes) é mantido apenas em memória. Ao reiniciar o backend o circuito volta para `CLOSED`, mesmo que o WhatsApp ainda esteja com problema, e o histórico de falhas desaparece.
   - Sugestão: persistir periodicamente o objeto `{ state, openedAt, cooldownMultiplier, attempts }` em um registro (`SystemConfig` ou arquivo `data/circuit-state.json`). Ao iniciar, recarregar essa estrutura e retomar o cooldown de onde parou, evitando bombar o WhatsApp logo após um reboot.

4. **Métricas pesadas no dashboard**
   - `/dashboard/summary` executa várias contagens em `prisma.message` a cada chamada. À medida que a tabela crescer, o endpoint pode ficar lento.
   - Sugestão: criar uma tabela ou view de agregados (ex.: `MessageDailyStats`) atualizada a cada minuto pelo próprio backend. O dashboard passa a ler apenas esses valores consolidados, reduzindo carga no SQLite.

5. **Broadcast WebSocket mesmo sem clientes ativos** – `apps/backend/src/services/automationOrchestrator.ts`
   - O status é enviado a cada 2 s independentemente de haver ouvintes, gerando logs e consumo contínuo.
   - Recomendação: pausar o intervalo quando `websocketService.getConnectedClientsCount()` for 0 e retomar no primeiro subscribe. É só um ajuste no scheduler atual.

6. **Backup automático da sessão do WhatsApp**
   - A pasta `data/whatsapp_session` mantém o token local. Se for corrompida ou apagada, o robô exige novo pareamento manual e toda a operação fica parada.
   - Sugestão: incorporar no próprio backend um “auto-backup” acionado ao fechar a interface ou ao clicar num botão “Salvar sessão” no painel. O backend compacta a pasta para `data/backups/whatsapp_session-YYYYMMDD.zip` sem exigir scripts `.bat` adicionais.

7. **Watchdog Windows para o WhatsApp**
   - Se o Chrome/Edge controlado pelo `whatsapp-web.js` travar, o sistema depende de ação manual.
   - Um `watchdog.bat` agendado no Task Scheduler pode verificar se o processo do WhatsApp/Chrome está ativo e relançar `start.bat` quando necessário. Não altera o Node e reduz inatividade prolongada.

8. **Rotação automática de logs**
   - Os logs atuais (Pino) crescem indefinidamente, algo crítico em discos limitados.
   - Sugiro configurar um transporte com rotação (ex.: `rotating-file-stream`) ou rodar um script semanal (`logman`/PowerShell) que compacte/remova arquivos antigos.

9. **Node.js mínimo para o frontend build**
   - O Vite requer Node 20.19+; o build quebra em Node 18 (como visto no teste).
   - Atualize o `repair-windows.bat` para checar `node -v` e orientar upgrade automático quando for < 20.19. Isso reduz suporte e evita builds “travados”.

## 3. Próximos Passos (prioridade sugerida)
1. Persistir fila + trocar o loop por scheduler baseado em eventos (melhora estabilidade e consumo de CPU). 
2. Agregar métricas em cache (alívio imediato no dashboard). 
3. Ajustar o broadcast para só rodar com clientes conectados. 
4. Implementar watchdog e rotação de logs (operacional). 
5. Forçar Node 20.19+ nos scripts de preparação.

Com essas alterações incrementais, o WhatsSelf mantém a simplicidade do setup Windows, mas ganha resiliência e previsibilidade para suportar mais usuários e volume sem travamentos.
