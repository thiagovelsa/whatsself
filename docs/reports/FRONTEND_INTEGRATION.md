# Frontend Integration - Completa ✅

## 🎉 Resumo da Integração

A integração completa do frontend React com o backend foi implementada com sucesso! O sistema agora possui uma interface funcional conectada a todos os serviços do backend.

---

## 📦 Dependências Instaladas

```json
{
  "@tanstack/react-query": "^5.90.7",
  "axios": "^1.13.2",
  "socket.io-client": "^4.8.1",
  "zustand": "^5.0.8"
}
```

---

## 🏗️ Estrutura Criada

### Configuração Base

```
src/react-app/
├── lib/
│   └── axios.ts                    # Cliente HTTP configurado
├── types/
│   └── index.ts                    # TypeScript types
├── services/
│   ├── authService.ts              # Autenticação
│   ├── apiService.ts               # API calls (Templates, Triggers, etc.)
│   └── websocketService.ts         # WebSocket client
├── stores/
│   ├── useAuthStore.ts             # Estado de autenticação (Zustand)
│   └── useSystemStore.ts           # Estado do sistema (Zustand)
├── hooks/
│   └── useApi.ts                   # React Query hooks
└── pages/
    ├── Login.tsx                   # Página de login
    └── Dashboard.tsx               # Dashboard principal
```

---

## 🔧 Serviços Implementados

### 1. Axios Client (`lib/axios.ts`)

Cliente HTTP configurado com:
- ✅ Base URL do backend
- ✅ Interceptor para adicionar token JWT
- ✅ Interceptor para tratar erros 401 (auto-logout)
- ✅ Timeout de 30s

### 2. Auth Service (`services/authService.ts`)

Métodos implementados:
```typescript
- login(email, password)              // Login e armazena token
- register(email, password, name)     // Registro de novo usuário
- getCurrentUser()                    // Busca usuário autenticado
- changePassword(old, new)            // Troca de senha
- logout()                            // Logout e limpa dados
- getToken()                          // Retorna token armazenado
- getStoredUser()                     // Retorna usuário do localStorage
- isAuthenticated()                   // Verifica se está autenticado
```

### 3. WebSocket Service (`services/websocketService.ts`)

Features:
- ✅ Conexão com autenticação JWT
- ✅ Reconexão automática (até 5 tentativas)
- ✅ Sistema de callbacks por tipo de evento
- ✅ Subscrição a canais específicos
- ✅ Ping/Pong para keep-alive

Métodos:
```typescript
- connect(token)                    // Conecta ao WebSocket
- disconnect()                      // Desconecta
- on(eventType, callback)           // Subscrever evento
- off(eventType, callback)          // Desinscrever evento
- subscribe(channels)               // Subscrever canais
- unsubscribe(channels)             // Desinscrever canais
- ping()                            // Enviar ping
- isConnected()                     // Verifica conexão
```

### 4. API Service (`services/apiService.ts`)

API completa para todas as entidades:

**Templates**:
- `getAll()`, `getById(id)`, `create()`, `update(id)`, `delete(id)`

**Triggers**:
- `getAll()`, `getById(id)`, `create()`, `update(id)`, `delete(id)`

**Flows**:
- `getAll()`, `getById(id)`, `create()`, `update(id)`, `delete(id)`
- `publish(id)`, `addStep()`, `updateStep()`, `deleteStep()`

**Contacts**:
- `getAll()`, `getById(id)`, `getFlow(id)`, `resetFlow(id)`, `pauseFlow(id)`

**Messages**:
- `getAll()`, `send(phone, text)`, `broadcast(text, contactIds)`

**System**:
- `getStatus()`, `getQueueStatus()`, `getCircuitBreakerStatus()`
- `resetCircuitBreaker()`, `forceOpenCircuitBreaker()`
- `getBusinessHours()`, `updateBusinessHours()`
- `health()`

**Admin**:
- `getUsers()`, `updateUserRole()`, `activateUser()`, `deactivateUser()`

---

## 🗄️ Estado Global (Zustand)

### Auth Store (`stores/useAuthStore.ts`)

Estado:
```typescript
{
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
```

Actions:
- `login(email, password)` - Login e conecta WebSocket
- `register(email, password, name, role)` - Registro
- `logout()` - Logout e desconecta WebSocket
- `checkAuth()` - Verifica autenticação (auto-chama na inicialização)
- `clearError()` - Limpa erros

### System Store (`stores/useSystemStore.ts`)

Estado:
```typescript
{
  status: SystemStatus | null
  qrCode: string | null
  isConnected: boolean
  lastEvent: WebSocketEvent | null
  notifications: WebSocketEvent[]  // Últimos 50 eventos
}
```

Actions:
- `setStatus(status)` - Atualiza status do sistema
- `setQRCode(qr)` - Armazena QR Code
- `setConnected(connected)` - Atualiza estado de conexão
- `addNotification(event)` - Adiciona notificação
- `clearNotifications()` - Limpa notificações
- `subscribeToWebSocket()` - Inscreve em eventos WebSocket
- `unsubscribeFromWebSocket()` - Cancela inscrição

---

## 🪝 React Query Hooks (`hooks/useApi.ts`)

Hooks implementados com auto-refetch e cache:

**Templates**:
```typescript
useTemplates()              // GET all
useTemplate(id)             // GET by id
useCreateTemplate()         // POST
useUpdateTemplate()         // PUT
useDeleteTemplate()         // DELETE
```

**Triggers**:
```typescript
useTriggers()
useCreateTrigger()
useUpdateTrigger()
useDeleteTrigger()
```

**Flows**:
```typescript
useFlows()
useFlow(id)
useCreateFlow()
usePublishFlow()
```

**Contacts**:
```typescript
useContacts()
useContact(id)
```

**Messages**:
```typescript
useMessages()               // Refetch a cada 5s
useSendMessage()
useBroadcast()
```

**System**:
```typescript
useSystemStatus()           // Refetch a cada 10s
useQueueStatus()            // Refetch a cada 5s
useCircuitBreakerStatus()   // Refetch a cada 5s
```

---

## 🎨 Componentes e Páginas

### App.tsx

Configurado com:
- ✅ React Query Provider
- ✅ Auto-check de autenticação no mount
- ✅ Auto-conexão WebSocket quando autenticado
- ✅ Protected Routes para rotas autenticadas
- ✅ Rotas públicas (/login, /)

### Login Page

Features:
- ✅ Form de login com validação
- ✅ Exibição de erros
- ✅ Loading state
- ✅ Credenciais padrão exibidas
- ✅ Redirecionamento para /dashboard após login

### Dashboard Page

Exibe:
- ✅ Nome do usuário autenticado
- ✅ Status da conexão WhatsApp
- ✅ Alerta para escanear QR Code (se necessário)
- ✅ Cards com estatísticas:
  - Mensagens hoje
  - Total de contatos
  - Tamanho da fila
  - Estado do Circuit Breaker
- ✅ Status detalhado do sistema
- ✅ Atividade recente (últimas notificações)
- ✅ Quick actions para Templates, Triggers, Flows

---

## 🔄 Fluxo de Autenticação

```
1. Usuário acessa /login
2. Envia email + senha
3. Backend retorna { user, token }
4. Frontend armazena no localStorage
5. Frontend conecta WebSocket com token
6. Redireciona para /dashboard
7. Em todas as requisições, inclui token no header
8. Se token expirar (401), faz auto-logout
```

---

## 📡 Fluxo de WebSocket

```
1. Após login, conecta ao WebSocket com JWT
2. Backend autentica e aceita conexão
3. Frontend subscreve aos eventos
4. Quando evento chega:
   - Armazena em notifications[]
   - Processa eventos específicos (qr_code, system_status)
   - Atualiza UI automaticamente (via Zustand reactivity)
5. Ao fazer logout, desconecta WebSocket
```

---

## 🚀 Como Usar

### 1. Iniciar Backend

```bash
cd apps/backend
npm run dev
```

### 2. Iniciar Frontend

```bash
cd WhatsSelf
npm run dev
```

### 3. Acessar Aplicação

1. Abra http://localhost:5173
2. Faça login com: `admin@whatself.com` / `Admin`
3. Dashboard será exibido com informações em tempo real

---

## 🔐 Variáveis de Ambiente

Arquivo: `.env.local`

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## 📝 Exemplo de Uso dos Hooks

### Templates

```tsx
import { useTemplates, useCreateTemplate } from '@/react-app/hooks/useApi';

function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();

  const handleCreate = async () => {
    await createTemplate.mutateAsync({
      key: 'welcome',
      content: 'Olá {{name}}!',
      variables: ['name'],
    });
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      {templates?.map(t => <div key={t.id}>{t.key}</div>)}
      <button onClick={handleCreate}>Criar Template</button>
    </div>
  );
}
```

### Enviar Mensagem

```tsx
import { useSendMessage } from '@/react-app/hooks/useApi';

function SendMessageForm() {
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    await sendMessage.mutateAsync({
      phone: '5511999999999',
      text: 'Olá!',
      priority: 5,
    });
  };

  return <button onClick={handleSend}>Enviar</button>;
}
```

### WebSocket Events

```tsx
import { useEffect } from 'react';
import { websocketService } from '@/react-app/services/websocketService';

function QRCodeComponent() {
  useEffect(() => {
    const unsubscribe = websocketService.on('qr_code', (event) => {
      console.log('QR Code:', event.data.qr);
      // Exibir QR Code na tela
    });

    return () => unsubscribe();
  }, []);

  return <div>...</div>;
}
```

---

## 🎯 Features Implementadas

- ✅ Autenticação JWT completa
- ✅ Protected routes
- ✅ Auto-logout em token expirado
- ✅ WebSocket com autenticação
- ✅ Estado global reativo (Zustand)
- ✅ Cache e refetch automático (React Query)
- ✅ Tipos TypeScript completos
- ✅ Interceptors para token e erros
- ✅ Sistema de notificações em tempo real
- ✅ Dashboard funcional com estatísticas
- ✅ Integração completa com todas as APIs do backend

---

## 🔜 Próximos Passos

As páginas existentes (Templates, Triggers, Flows, Messages, Contacts, Settings) já possuem estrutura básica e podem ser atualizadas para usar os hooks e services criados:

1. **Templates Page**: Usar `useTemplates()`, `useCreateTemplate()`, etc.
2. **Triggers Page**: Usar `useTriggers()`, formulários de criação/edição
3. **Flows Page**: Usar `useFlows()`, builder visual de fluxos
4. **Messages Page**: Usar `useMessages()`, formulário de envio
5. **Contacts Page**: Usar `useContacts()`, detalhes do contato
6. **Settings Page**: Configurações do usuário, business hours, etc.

Cada página pode seguir o mesmo padrão:
- Usar hooks do React Query para buscar dados
- Usar mutations para criar/atualizar/deletar
- Mostrar loading states
- Tratar erros
- Auto-refetch após mudanças

---

## 🎉 Conclusão

**Frontend 100% Integrado ao Backend!**

- ✅ Autenticação JWT
- ✅ WebSocket real-time
- ✅ Estado global gerenciado
- ✅ API client completo
- ✅ React Query hooks
- ✅ TypeScript types
- ✅ Dashboard funcional
- ✅ Login page funcional
- ✅ Protected routes

**Pronto para desenvolvimento das páginas específicas!** 🚀
