# WhatsSelf - WhatsApp Business Automation Platform (Windows Edition)

<div align="center">

**Plataforma de automação empresarial para WhatsApp com proteção anti-ban integrada**

[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows)](https://www.microsoft.com/windows)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🛠️ Features](#-features) • [❓ Support](#-support)

</div>

---

## 🎯 Overview

WhatsSelf é uma plataforma completa de automação para WhatsApp Business, otimizada especificamente para Windows, que permite criar fluxos conversacionais inteligentes, gerenciar templates de mensagens e automatizar atendimento ao cliente - tudo isso com proteção anti-ban integrada.

### ✨ Key Features

- 🤖 **Automação Inteligente**: Fluxos conversacionais com state machine
- 🔒 **Anti-Ban Protection**: Rate limiting, humanização e circuit breakers
- 📱 **WhatsApp Web.js**: Integração nativa via Puppeteer
- 🎯 **Trigger System**: Pattern matching avançado (regex, keywords, condicionais)
- 📝 **Template Engine**: Sistema de templates com variáveis dinâmicas
- ⏰ **Business Hours**: Horário comercial com suporte a timezone
- 🔐 **Security-First**: JWT auth, password validation, environment validation
- 💾 **SQLite/PostgreSQL**: Suporte multi-database via Prisma ORM
- 🪟 **Windows-Optimized**: 100% otimizado para Windows 10/11

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WhatsSelf Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│  │   WhatsApp   │───▶│   Message    │──▶│    Flow      │  │
│  │   Service    │    │    Queue     │   │   Engine     │  │
│  └──────────────┘    └──────────────┘   └──────────────┘  │
│         │                    │                   │         │
│         ▼                    ▼                   ▼         │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│  │  Humanizer   │    │ Rate Limiter │   │   Circuit    │  │
│  │   Layer      │    │   (8-12/min) │   │   Breaker    │  │
│  └──────────────┘    └──────────────┘   └──────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          REST API + WebSocket (Express + Socket.IO)  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Database (SQLite/PostgreSQL via Prisma)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

Before installing, ensure you have:

- ✅ **Windows 10** (version 1903+) or **Windows 11**
- ✅ **Node.js 20+** ([Download](https://nodejs.org/))
- ✅ **Google Chrome** or **Microsoft Edge**
- ✅ **4 GB RAM** minimum (8 GB recommended)

### Installation (3 Easy Steps)

#### Step 1: Download

Download and extract WhatsSelf to a folder **without spaces in the path**:
- ✅ Good: `C:\WhatsSelf`
- ❌ Bad: `C:\Program Files\WhatsSelf`

#### Step 2: Setup / Repair

Execute o novo script de preparação (idempotente) sempre que clonar ou atualizar o projeto:

```cmd
repair-windows.bat --prepare-only
```

Para reinstalar dependências, sincronizar o banco, gerar builds e recriar a sessão do WhatsApp, use:

```cmd
repair-windows.bat --reset-session --force-install
```

Precisa de uma correção completa **e** subir tudo em um único comando? Utilize:

```cmd
fix-whatsself.bat
```

Ele encadeia `repair-windows.bat --force-install --reset-session`, força `skipsWhatsapp=false`, sincroniza SystemConfig (`config:init`) e em seguida executa `start.bat`.

O script irá:
- ✅ Finalizar `node.exe` antigos
- ✅ Criar/atualizar `.env` e `.env.local` com defaults válidos
- ✅ Instalar dependências do backend e frontend
- ✅ Executar `npx prisma db push` + `npm run build`
- ✅ Garantir `data\whatsapp_session` (ou resetar com backup)

> 💡 **Importante:** mantenha `DATABASE_URL=file:./dev.db`. Esse caminho relativo sempre aponta para `apps/backend/prisma/dev.db` e evita recriar a pasta `prisma/prisma`.

#### Step 3: Start

Agora basta um único comando para subir tudo:

```cmd
start.bat
```

Ele cria `.env` se necessário, instala dependências, roda `prisma db push`, inicia backend/frontend em janelas minimizadas e abre `http://localhost:5173`.  
Quando for parear o WhatsApp:
1. Instale Chrome/Edge (ou defina `PUPPETEER_EXECUTABLE_PATH`).
2. Execute `repair-windows.bat --reset-session`.
3. Remova `SKIP_WHATSAPP` do `.env` (ou defina `false`).
4. Execute `start.bat` e escaneie o QR em até 30 s.

**Feito!** API em `http://localhost:3001`, painel em `http://localhost:5173`.

#### (Opcional) Diagnóstico rápido

Após iniciar os serviços, rode:

```cmd
npm run diagnose:whatsapp
```

Esse script testa `/health`, `/qr`, WebSocket (modo público) e `/status` (logando como admin). Ideal para confirmar que tudo está pronto antes de chamar alguém para escanear o QR.

---

## 📖 Documentation

### Essential Guides

| Document | Description |
|----------|-------------|
| **[docs/windows/installation.md](docs/windows/installation.md)** | Complete Windows installation and configuration guide |
| **repair-windows.bat** | Auto-fix Windows environment (deps, DB, sessão WhatsApp) |
| **[TROUBLESHOOTING](troubleshoot-windows.bat)** | Run diagnostic tool for common issues |
| **[docs/technical/API.md](docs/technical/API.md)** | REST API endpoints documentation |
| **[docs/technical/SECURITY.md](docs/technical/SECURITY.md)** | Security best practices |
| **[docs/guides/CLAUDE.md](docs/guides/CLAUDE.md)** | AI assistant instructions (for developers) |
| **[docs/reports/structure-audit.md](docs/reports/structure-audit.md)** | Mapa completo da estrutura do repositório e itens redundantes |
| **[docs/reports/env-audit.md](docs/reports/env-audit.md)** | Detalhamento das variáveis de ambiente e sincronização SystemConfig |
| **[docs/reports/whatsapp-validation.md](docs/reports/whatsapp-validation.md)** | Passo a passo para validar o fluxo WhatsApp ↔ Backend ↔ Dashboard |
| **[docs/reports/e2e-tests.md](docs/reports/e2e-tests.md)** | Resumo dos testes automatizados/executados (backend, frontend e WebSocket) |

### Technical Documentation

All technical documentation is organized in the `docs/` directory:

- [docs/technical/STACK.md](docs/technical/STACK.md) - Technology stack details
- [docs/technical/DATABASE.md](docs/technical/DATABASE.md) - Database schema and operations
- [docs/technical/TESTING.md](docs/technical/TESTING.md) - Testing guide
- [docs/technical/DEPLOYMENT.md](docs/technical/DEPLOYMENT.md) - Production deployment guide
- [docs/technical/MONITORING.md](docs/technical/MONITORING.md) - Monitoring and telemetry
- [docs/technical/BUSINESS_RULES.md](docs/technical/BUSINESS_RULES.md) - Business logic rules

---

## 🛠️ Features

### 1. WhatsApp Integration

- Native integration via `whatsapp-web.js`
- Auto-detection of Chrome/Edge browsers
- QR Code authentication
- Session persistence
- Multi-device support

### 2. Message Automation

#### Trigger System
```typescript
// Pattern matching types
- equals: Exact match
- contains: Substring match
- regex: Regular expression
- number: Numeric conditions
```

#### Flow Engine
- Multi-step conversational flows
- State management per contact
- Input validation
- Dynamic branching
- Flow pausing/resuming

#### Template Rendering
```typescript
// Example template with variables
"Olá {{name}}! Seu pedido #{{orderId}} foi confirmado."
```

### 3. Anti-Ban Protection

WhatsSelf implements multiple safeguards:

| Feature | Description | Default |
|---------|-------------|---------|
| **Rate Limiting** | Global and per-contact limits | 12/min, 2/5min per contact |
| **Humanization** | Random delays + typing indicators | 3-7s delay, 1.5-3.5s typing |
| **Circuit Breaker** | Auto-pause on failure rate | >25% failure triggers pause |
| **Business Hours** | Only respond during business hours | 09:00-18:00 (configurable) |
| **Opt-Out Detection** | Auto-detect unsubscribe requests | PARAR, STOP, CANCELAR |
| **Cooldown Periods** | Per-trigger and per-contact delays | Prevents spam |

### 4. Security

- **JWT Authentication**: Secure token-based auth
- **Password Strength**: Enforced complexity requirements
- **Environment Validation**: Fail-fast on missing critical configs
- **Input Sanitization**: Zod schemas for all API inputs
- **No Hardcoded Credentials**: Auto-generated secure defaults

### 5. Developer Experience

- **TypeScript**: Full type safety
- **Hot Reload**: Instant feedback during development
- **Prisma ORM**: Type-safe database queries
- **Zod Validation**: Runtime type checking
- **Pino Logging**: Structured JSON logging
- **Windows Scripts**: Native .bat and .ps1 scripts

---

## 🏃 Usage

### Starting the Server

```cmd
# Desenvolvimento (hot reload tradicional)
cd apps\backend
npm run dev

# Produção
npm run build
npm run start:prod

# Teste rápido de API + WebSocket
npm run test:ws   # exige backend rodando (ex.: via start.bat)
```

### Common Commands

```cmd
# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:studio      # Open Prisma Studio GUI

# Testing
npm run test           # Run tests
npm run test:watch     # Watch mode

# Maintenance
npm run clean          # Clean build artifacts
npm run clean:all      # Clean everything including node_modules
```

### Environment Configuration

Edit `apps\backend\.env` to configure:

```env
# Segurança (trocar imediatamente)
JWT_SECRET=your-random-64-character-secret
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
CONFIG_CRYPTO_KEY=base64-32-bytes-secret

# Banco (não altere o prefixo!)
DATABASE_URL=file:./dev.db

# Aplicação
PORT=3001
TIMEZONE=America/Sao_Paulo
BUSINESS_HOURS=09:00-18:00
LOG_LEVEL=info

# WhatsApp
SKIP_WHATSAPP=false
WHATS_SESSION_PATH=../../data/whatsapp_session
PUPPETEER_HEADLESS=true
# PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# WebSocket
WS_PORT=3001
WS_PATH=/socket.io

# Rate Limiting / Humanizer
RATE_MAX_PER_MIN=12
RATE_PER_CONTACT_PER_5MIN=2
HUMANIZER_MIN_DELAY_MS=3000
HUMANIZER_MAX_DELAY_MS=7000
```

Após preencher `.env`, execute uma vez:

```bash
cd apps/backend
npm run config:init
```

Esse comando cria/atualiza o registro único na tabela `SystemConfig`, cifrando segredos com `CONFIG_CRYPTO_KEY`.

### Configuração via interface

1. **Inicie** backend e frontend com `start-all-windows.bat` ou `npm run dev`.
2. **Acesse** o painel (`http://localhost:5173`), faça login com as credenciais padrão exibidas no terminal.
3. **Abra** o menu `Configurações` e ajuste campos organizados por seções (Segurança, WhatsApp, Limites, Humanização, Circuit Breaker, Operação e WebSocket).
4. **Revele/regenere segredos** usando os botões dedicados – o backend registra cada alteração em `ConfigAudit`.
5. **Faça testes** com os botões “Detectar navegadores” e “Validar caminho” para garantir o executável do navegador.
6. **Salve** e acompanhe o histórico de auditoria no rodapé da página.

> Observação: alterar `JWT_SECRET` invalida tokens ativos. O evento `config_updated` é transmitido via WebSocket para todas as sessões autenticadas.

---

## 📁 Project Structure

```
WhatsSelf/
├── apps/
│   └── backend/               # Backend application
│       ├── src/
│       │   ├── config/        # Configuration & validation
│       │   ├── domain/        # Business logic
│       │   ├── middleware/    # Express middleware
│       │   ├── services/      # Service layer
│       │   ├── index.ts       # Entry point
│       │   └── server.ts      # Express server
│       ├── scripts/           # Build & dev scripts
│       └── package.json
│
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── dev.db                 # SQLite database (dev)
│
├── data/
│   └── whatsapp_session/      # WhatsApp session data
│
├── docs/                      # Technical documentation
│
├── logs/                      # Application logs
│
├── .env.windows               # Environment template
├── .gitignore                 # Windows-optimized
├── setup-windows.bat          # Installation script
├── setup-windows.ps1          # Advanced setup (PowerShell)
├── start-windows.bat          # Startup script
├── troubleshoot-windows.bat   # Diagnostic tool
├── cleanup-windows.bat        # Project cleanup
├── README.md                  # This file
└── docs/windows/installation.md          # Windows installation guide
```

---

## 🔧 Troubleshooting

### Run Diagnostic Tool

```cmd
troubleshoot-windows.bat
```

This will check:
- ✅ Node.js installation
- ✅ Browser availability
- ✅ Port conflicts
- ✅ Database status
- ✅ Configuration issues
- ✅ Windows Firewall rules

### Common Issues

| Issue | Solution |
|-------|----------|
| **Port 3001 in use** | Change `PORT` in `.env` or stop conflicting app |
| **Chrome not found** | Install Chrome or set `PUPPETEER_EXECUTABLE_PATH` |
| **Database error** | Run `npm run db:push` in `apps\backend` |
| **Permission denied** | Run as Administrator or move to user directory |
| **WhatsApp QR not showing** | Set `PUPPETEER_HEADLESS=false` in `.env` |

**See [docs/windows/installation.md](docs/windows/installation.md) for detailed troubleshooting**

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a random 64+ character string
- [ ] Set strong `DEFAULT_ADMIN_PASSWORD`
- [ ] Review and update `API_CORS_ORIGIN`
- [ ] Enable HTTPS (requires certificate)
- [ ] Configure Windows Firewall properly
- [ ] Set `NODE_ENV=production`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Implement rate limiting at network level
- [ ] Setup monitoring and logging
- [ ] Regular backups of database

**See [docs/technical/SECURITY.md](docs/technical/SECURITY.md) for comprehensive security guide**

---

## 📊 Performance Tips

1. **Use SSD**: SQLite performs significantly better on SSD
2. **Increase Node.js priority**: Task Manager → Details → node.exe → Set Priority → High
3. **Disable Windows Search indexing** for project folder
4. **Use Edge**: Better Windows integration than Chrome
5. **Keep browser updated**: Latest Chrome/Edge for best performance

---

## 🤝 Contributing

Contributions are welcome! See [docs/guides/CONTRIBUTING.md](docs/guides/CONTRIBUTING.md) for guidelines.

---

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## ❓ Support

### Getting Help

1. Check [docs/windows/installation.md](docs/windows/installation.md) for installation help
2. Run `troubleshoot-windows.bat` for diagnostics
3. Review [docs/guides/TROUBLESHOOTING.md](docs/guides/TROUBLESHOOTING.md)
4. Check existing issues on GitHub
5. Create a new issue with diagnostic output

### Reporting Issues

When reporting issues, include:
- Output from `troubleshoot-windows.bat`
- Relevant logs from `logs/` directory
- Steps to reproduce
- Expected vs actual behavior

---

## 🗺️ Roadmap

See [docs/reports/ROADMAP.md](docs/reports/ROADMAP.md) for planned features and improvements.

---

## 🙏 Acknowledgments

Built with:
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [TypeScript](https://www.typescriptlang.org/)
- [Socket.IO](https://socket.io/)
- [Pino](https://getpino.io/)

---

<div align="center">

**Made with ❤️ for Windows users**

[⬆ Back to top](#whatsself---whatsapp-business-automation-platform-windows-edition)

</div>
