# 🚀 Como Iniciar o WhatsSelf

## ⚠️ CONFIGURAÇÃO INICIAL OBRIGATÓRIA

**ANTES DE INICIAR**, certifique-se de que os arquivos de configuração existem:

### 0️⃣ Verificar/Criar Arquivos .env

#### Backend (.env)
Se o arquivo `apps/backend/.env` **NÃO EXISTE**:

```cmd
cd apps\backend
copy .env.example .env
```

#### Frontend (.env.local)
Se o arquivo `WhatsSelf/.env.local` **NÃO EXISTE**:

```cmd
cd WhatsSelf
copy .env.example .env.local
```

#### Criar Banco de Dados
Se o arquivo `apps/backend/prisma/dev.db` **NÃO EXISTE**:

```cmd
cd apps\backend
npx prisma db push
```

**IMPORTANTE:** Sem estes arquivos, o sistema **NÃO VAI FUNCIONAR**!

---

## 📋 Passo a Passo para Iniciar

### 1️⃣ Iniciar o Backend

Abra um terminal (CMD ou PowerShell) e execute:

```cmd
cd C:\Users\User\Desktop\WhatsSelf\apps\backend
start-windows.bat
```

**O que vai acontecer:**
- ✅ Servidor backend iniciará na porta **3001**
- ✅ API REST estará disponível em `http://localhost:3001`
- ✅ WebSocket estará disponível em `ws://localhost:3001`
- ✅ Você verá logs do servidor no terminal

**Mantenha este terminal aberto!** O backend precisa ficar rodando.

---

### 2️⃣ Iniciar o Frontend

Abra um **NOVO** terminal (deixe o backend rodando no outro) e execute:

```cmd
cd C:\Users\User\Desktop\WhatsSelf\WhatsSelf
start-frontend.bat
```

**O que vai acontecer:**
- ✅ O script verificará se o backend está rodando
- ✅ Servidor frontend iniciará na porta **5173**
- ✅ Dashboard estará disponível em `http://localhost:5173`
- ✅ Seu navegador pode abrir automaticamente

**Mantenha este terminal aberto também!**

---

## 🌐 Acessar o Sistema

Depois que ambos os servidores estiverem rodando:

1. Abra seu navegador
2. Acesse: **http://localhost:5173**
3. Faça login com as credenciais padrão (configure no backend)

---

## ⚡ Comandos Rápidos

### Alternativa: Usar comandos npm diretamente

**Backend:**
```cmd
cd C:\Users\User\Desktop\WhatsSelf\apps\backend
npm run dev
```

**Frontend:**
```cmd
cd C:\Users\User\Desktop\WhatsSelf\WhatsSelf
npm run dev
```

---

## 🛑 Para Parar os Servidores

Em cada terminal onde os servidores estão rodando:
- Pressione **CTRL + C**
- Confirme se solicitado

---

## ✅ Checklist de Verificação

Antes de iniciar, certifique-se:

- [x] ✅ Backend: dependências instaladas (node_modules)
- [x] ✅ Backend: arquivo .env configurado *(veja passo 0️⃣ acima)*
- [x] ✅ Backend: banco de dados criado (`apps/backend/prisma/dev.db`)
- [x] ✅ Backend: Prisma Client gerado
- [x] ✅ Frontend: dependências instaladas (node_modules)
- [x] ✅ Frontend: arquivo .env.local configurado *(veja passo 0️⃣ acima)*
- [x] ✅ Node.js versão 22.13.1 instalado
- [x] ✅ npm versão 11.5.2 instalado
- [x] ✅ Templates .env.example criados

**Configurações básicas OK!** Lembre-se de verificar os arquivos .env antes da primeira inicialização! ✨

---

## 📊 Portas Utilizadas

| Serviço | Porta | URL |
|---------|-------|-----|
| Backend API | 3001 | http://localhost:3001 |
| Frontend | 5173 | http://localhost:5173 |
| WebSocket | 3001 | ws://localhost:3001 |
| Prisma Studio | 5555 | http://localhost:5555 (se executar `npm run db:studio`) |

---

## 🔧 Comandos Úteis

### Gerenciar Banco de Dados
```cmd
cd C:\Users\User\Desktop\WhatsSelf

# Abrir interface visual do banco
npx prisma studio

# Resetar banco de dados (CUIDADO: apaga todos os dados!)
cd apps\backend
npm run db:reset
```

### Ver Logs Detalhados
Os logs aparecem automaticamente nos terminais onde os servidores estão rodando.

---

## 📖 Documentação

Para mais detalhes, consulte:
- `docs/windows/installation.md` - Guia completo Windows
- `WhatsSelf/README.md` - Documentação do frontend
- `docs/guides/GETTING-STARTED.md` - Guia de início rápido

---

## ⚙️ Configurações Importantes

### Backend (.env)
- **JWT_SECRET**: Já configurado com valor seguro ✅
- **DATABASE_URL**: Apontando para `file:./dev.db` ✅
- **PORT**: 3001 ✅

### Frontend (.env.local)
- **VITE_API_URL**: http://localhost:3001 ✅
- **VITE_WS_URL**: ws://localhost:3001 ✅

---

## 🎉 Pronto!

O sistema está **100% configurado** e pronto para uso. Basta executar os comandos de inicialização acima!

Se encontrar algum problema, verifique:
1. Ambos os terminais estão abertos?
2. O backend iniciou antes do frontend?
3. As portas 3001 e 5173 estão livres?

**Bom desenvolvimento!** 🚀
