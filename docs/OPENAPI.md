# OpenAPI – manutenção e validação

### Objetivo
Garantir que o contrato formal `openapi.yaml` espelhe os endpoints declarados em `apps/backend/src/server.ts` e mantenha a documentação machine-readable pronta para gerar clients/collections.

### Passo a passo recomendado
1. Sempre que adicionar/alterar uma rota (e.g. novos verbos, parâmetros, status), atualize `openapi.yaml` manualmente para refletir os campos/paths; use `docs/technical/API.md` como referência humana.
2. Valide o arquivo com o utilitário criado para detectar erros de sintaxe e referências quebradas:
   ```bash
   cd apps/backend
   npm run docs:validate-openapi
   ```
   O script usa `swagger-cli` para garantir que a especificação esteja bem formada.
3. Atualize o `openapi.yaml` exposto na raiz e, se necessário, gere coleções (Postman/Insomnia) a partir dele para downstream.

### Conferência cruzada rápida
- Cheque `PM` (coleções/consumidores) com `openapi.yaml` atual.
- Sempre mencione no `README` ou `docs/technical/API.md` quando adicionar novos recursos para alertar sobre a atualização da especificação.
