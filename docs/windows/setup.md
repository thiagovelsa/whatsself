# WhatsSelf - Windows Setup & Organization Guide

## 🎯 Overview

This document explains the complete Windows-optimized structure of WhatsSelf, including all modifications made to ensure 100% Windows compatibility.

---

## 📁 Project Organization

### Root Structure

```
WhatsSelf/
│
├── 🪟 WINDOWS SCRIPTS (Main entry points)
│   ├── setup-windows.bat          # Simple batch setup
│   ├── setup-windows.ps1          # Advanced PowerShell setup
│   ├── start-windows.bat          # Application launcher
│   ├── troubleshoot-windows.bat   # Diagnostic tool
│   └── cleanup-windows.bat        # Project cleanup
│
├── 📖 DOCUMENTATION
│   ├── README.md                  # Main documentation (Windows-focused)
│   ├── docs/windows/installation.md          # Detailed Windows guide
│   ├── docs/guides/CLAUDE.md                  # AI assistant instructions
│   ├── docs/windows/setup.md           # This file
│   ├── docs/reports/PROPOSTA.md                # Product vision (PT-BR)
│   ├── docs/reports/CHANGELOG.md               # Version history
│   ├── docs/guides/CONTRIBUTING.md            # Contribution guide
│   └── docs/reports/ROADMAP.md                 # Future features
│
├── 📚 docs/ (Technical documentation - organized)
│   ├── docs/technical/API.md                     # REST API reference
│   ├── docs/technical/STACK.md                   # Technology stack
│   ├── docs/technical/DATABASE.md                # Database schema
│   ├── docs/technical/SECURITY.md                # Security guidelines
│   ├── docs/technical/TESTING.md                 # Testing guide
│   ├── docs/technical/DEPLOYMENT.md              # Deployment instructions
│   ├── docs/technical/MONITORING.md              # Monitoring setup
│   ├── docs/technical/BUSINESS_RULES.md          # Business logic
│   ├── docs/reports/FRONTEND_INTEGRATION.md    # Frontend integration
│   └── docs/guides/TROUBLESHOOTING.md         # Advanced troubleshooting
│
├── 🖥️ apps/backend/ (Main application)
│   ├── src/
│   │   ├── config/
│   │   │   └── env.validator.ts   # ✅ NEW: Environment validation
│   │   ├── domain/
│   │   │   ├── triggerMatcher.ts
│   │   │   └── flowEngine.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── services/
│   │   │   ├── whatsappService.ts # ✅ FIXED: Windows path handling
│   │   │   ├── authService.ts     # ✅ FIXED: Security hardening
│   │   │   ├── businessRules.ts   # ✅ FIXED: Timezone support
│   │   │   ├── messageQueue.ts
│   │   │   ├── humanizer.ts
│   │   │   ├── circuitBreaker.ts
│   │   │   ├── templateRenderer.ts
│   │   │   ├── automationOrchestrator.ts
│   │   │   └── websocketService.ts
│   │   ├── index.ts               # ✅ FIXED: Windows shutdown handling
│   │   └── server.ts
│   │
│   ├── scripts/
│   │   ├── run-dev-windows.mjs    # ✅ NEW: Windows-optimized dev runner
│   │   └── setup-test-db.js       # Test database setup
│   │
│   ├── .env                       # (Created by setup, not in git)
│   ├── .env.windows               # ✅ NEW: Windows template
│   ├── .env.example               # Generic template
│   └── package.json               # ✅ UPDATED: Windows scripts
│
├── 💾 prisma/
│   ├── schema.prisma              # ✅ UPDATED: Windows binary targets
│   └── dev.db                     # SQLite database (single location)
│
├── 📦 data/                       # Application data (created by setup)
│   └── whatsapp_session/          # WhatsApp session storage
│
├── 📝 logs/                       # Application logs (created automatically)
│
├── .gitignore                     # ✅ NEW: Windows-optimized
└── .git/                          # Git repository
```

---

## ✅ Windows-Specific Improvements

### 1. **Browser Detection Fixed**

**File**: `apps/backend/src/services/whatsappService.ts`

**Before** (BROKEN):
```typescript
'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'
```

**After** (WORKING):
```typescript
join(process.env['ProgramFiles'] || 'C:\\Program Files',
     'Google', 'Chrome', 'Application', 'chrome.exe')
```

**Changes**:
- Uses Node.js `path.join()` for correct path construction
- Detects Windows environment variables
- Supports Chrome, Edge, Chromium, Brave
- Checks Program Files, Program Files (x86), LocalAppData
- Provides helpful error messages for Windows

### 2. **Path Handling Universally Fixed**

**All paths now use**:
- `path.resolve()` for absolute paths
- `path.join()` for path construction
- No hardcoded separators (`\\` or `/`)
- Respects Windows environment variables

**Examples**:
```typescript
// WhatsApp session
const sessionPath = resolve(__dirname, '..', '..', 'data', 'whatsapp_session');

// Database
const dbPath = resolve(projectRoot, 'prisma', 'dev.db');

// Temp directory
const tempDir = join(homedir(), 'AppData', 'Local', 'Temp', 'whatsself');
```

### 3. **Environment Validation**

**File**: `apps/backend/src/config/env.validator.ts`

**Features**:
- Zod schemas for all environment variables
- Automatic type conversion (strings → numbers, booleans)
- Path resolution (relative → absolute)
- Security validation (password strength, JWT secret)
- Windows temp directory handling
- Fail-fast on critical missing values

**Usage**:
```typescript
import { envValidator } from './config/env.validator.js';

const config = envValidator.validate();
console.log(config.PORT); // Typed and validated!
```

### 4. **Security Hardening**

**File**: `apps/backend/src/services/authService.ts`

**Changes**:
- ❌ Removed hardcoded credentials
- ✅ Auto-generates secure JWT secret (development)
- ✅ Password complexity validation
- ✅ Bcrypt rounds increased (10 → 12)
- ✅ Common password detection
- ✅ Different rules for dev vs production
- ✅ JWT token includes unique ID (jti) for revocation support

### 5. **Timezone Support**

**File**: `apps/backend/src/services/businessRules.ts`

**Features**:
- Uses `Intl.DateTimeFormat` for proper timezone handling
- Configurable timezone via `TIMEZONE` env var
- Weekend detection
- Overnight business hours support (22:00-02:00)
- Fallback to local time if Intl fails

**Example**:
```env
TIMEZONE=America/Sao_Paulo
BUSINESS_HOURS=09:00-18:00
```

### 6. **Graceful Shutdown**

**File**: `apps/backend/src/index.ts`

**Windows Signals Handled**:
- `SIGTERM` - Terminate request
- `SIGINT` - Ctrl+C
- `SIGBREAK` - Ctrl+Break (Windows-specific)

**Shutdown Process**:
1. Stop accepting new connections
2. Close WebSocket server
3. Wait up to 10 seconds for operations to complete
4. Clean exit

### 7. **Package.json Scripts**

**File**: `apps/backend/package.json`

**New Windows-Optimized Scripts**:
```json
{
  "dev": "node scripts/run-dev-windows.mjs",
  "dev:watch": "tsx watch --clear-screen=false src/index.ts",
  "build": "tsc -p tsconfig.json",
  "build:check": "tsc -p tsconfig.json --noEmit",
  "start:prod": "set NODE_ENV=production && node dist/index.js",
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:reset": "prisma migrate reset --force",
  "clean": "if exist dist rmdir /s /q dist",
  "clean:all": "npm run clean && if exist node_modules rmdir /s /q node_modules"
}
```

**Removed**:
- `@rollup/rollup-linux-x64-gnu` dependency
- `ts-node-dev` (replaced with `tsx`)

**Added**:
- `pino-pretty` for beautiful logs

### 8. **Prisma Windows Binaries**

**File**: `prisma/schema.prisma`

**Before**:
```prisma
binaryTargets = ["native", "debian-openssl-3.0.x"]
```

**After**:
```prisma
binaryTargets = ["native", "windows", "debian-openssl-3.0.x"]
```

---

## 🔧 Installation Scripts

### setup-windows.bat (Simple)

**Features**:
- Checks Node.js 20+ installation
- Verifies Chrome/Edge presence
- Creates directory structure
- Installs npm dependencies
- Generates Prisma client
- Pushes database schema
- Copies .env template

**Usage**:
```cmd
setup-windows.bat
```

### setup-windows.ps1 (Advanced)

**Features**:
Everything in .bat PLUS:
- Generates secure 32-byte JWT secret
- Creates strong random admin password
- Configures Windows Firewall rule for port 3001
- Creates desktop shortcut
- Validates disk space
- Better error handling

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File setup-windows.ps1
```

### start-windows.bat (Launcher)

**Features**:
- Validates setup completion
- Checks .env existence
- Starts development server
- Clear error messages

**Usage**:
```cmd
start-windows.bat
```

### troubleshoot-windows.bat (Diagnostics)

**Checks**:
1. Node.js installation & version
2. npm installation & version
3. Chrome/Edge browser
4. Environment file existence & default values
5. Database file location & size
6. WhatsApp session directory
7. Log files count
8. Port 3001 availability
9. Windows Firewall rule
10. Dependencies installation
11. Prisma client generation
12. Common issues (spaces in path, special chars, disk space)

**Usage**:
```cmd
troubleshoot-windows.bat
```

### cleanup-windows.bat (Project Cleanup)

**Removes**:
- Duplicate database files
- Linux-specific scripts
- Old log files
- Build artifacts
- Temporary files
- Outdated documentation

**Organizes**:
- Moves technical docs to `docs/`
- Removes redundant files

**Usage**:
```cmd
cleanup-windows.bat
```

---

## 📝 Environment Configuration

### Critical Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3001` | HTTP server port |
| `DATABASE_URL` | Yes | `file:./dev.db` | Database connection |
| `JWT_SECRET` | Yes | Auto-generated (dev) | JWT signing key (32+ chars) |
| `DEFAULT_ADMIN_EMAIL` | No | `admin@whatsself.local` | Admin email |
| `DEFAULT_ADMIN_PASSWORD` | Yes | - | Admin password (8+ chars, complex) |
| `TIMEZONE` | No | `America/Sao_Paulo` | IANA timezone |
| `BUSINESS_HOURS` | No | `09:00-18:00` | Business hours (HH:MM-HH:MM) |
| `SKIP_WHATSAPP` | No | `false` | Skip WhatsApp for testing |
| `PUPPETEER_EXECUTABLE_PATH` | No | Auto-detected | Browser path |
| `WHATS_SESSION_PATH` | No | `../../data/whatsapp_session` | Session storage |
| `CONFIG_CRYPTO_KEY` | Yes | Auto-generated (dev) | Encrypts secrets at rest |

### Security Best Practices

**Development**:
```env
JWT_SECRET=dev_secret_auto_generated_by_validator
DEFAULT_ADMIN_PASSWORD=Admin123!
```

**Production**:
```env
JWT_SECRET=xxYour_Random_64_Character_String_Generated_By_Cryptographic_Toolxx
DEFAULT_ADMIN_PASSWORD=YourV3ry$ecureP@ssw0rd!2025
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/whatsself
```

---

## 🔒 .gitignore (Windows-Optimized)

**Includes**:
- Windows-specific files (Thumbs.db, desktop.ini, $RECYCLE.BIN)
- Node.js (node_modules, *.log)
- Environment files (.env, .env.local)
- Database files (*.db, *.db-journal)
- WhatsApp session data
- Build outputs
- IDE files (VSCode, JetBrains, Visual Studio)
- Temporary files
- Backups

**Excludes** (kept in git):
- `.env.example`
- `.env.windows`
- `.gitkeep` files

---

## 🗂️ File Changes Summary

### New Files Created (9)

1. `src/config/env.validator.ts` - Environment validation
2. `scripts/run-dev-windows.mjs` - Windows dev runner
3. `.env.windows` - Windows environment template
4. `.gitignore` - Windows-optimized gitignore
5. `setup-windows.bat` - Simple setup script
6. `setup-windows.ps1` - Advanced PowerShell setup
7. `start-windows.bat` - Launch script
8. `troubleshoot-windows.bat` - Diagnostic tool
9. `cleanup-windows.bat` - Cleanup script

### Modified Files (6)

1. `src/services/whatsappService.ts` - Fixed paths, browser detection
2. `src/services/authService.ts` - Security hardening
3. `src/services/businessRules.ts` - Timezone support
4. `src/index.ts` - Windows shutdown handling
5. `package.json` - Windows scripts, removed Linux deps
6. `prisma/schema.prisma` - Added Windows binary targets

### Removed/Deprecated Files

- `scripts/run-dev.mjs` (replaced with `run-dev-windows.mjs`)
- `@rollup/rollup-linux-x64-gnu` npm dependency
- Duplicate database files (`prisma/prisma/dev.db`, `apps/prisma/dev.db`)

---

## 🚀 Quick Reference

### First Time Setup

```cmd
1. setup-windows.bat
2. Edit apps\backend\.env (change JWT_SECRET, password)
3. start-windows.bat
```

### Daily Development

```cmd
cd apps\backend
npm run dev
```

### Troubleshooting

```cmd
troubleshoot-windows.bat
```

### Clean Rebuild

```cmd
cd apps\backend
npm run clean:all
npm install
npm run db:generate
npm run db:push
npm run dev
```

---

## 📊 Project Status

✅ **100% Windows-Ready**

- ✅ All paths use Node.js path module
- ✅ Browser detection working
- ✅ Database paths consolidated
- ✅ Security hardened
- ✅ Timezone support added
- ✅ Setup scripts created
- ✅ Diagnostic tool available
- ✅ Documentation complete
- ✅ No Linux dependencies
- ✅ Tested on Windows 10/11

---

## 📞 Support

- **Installation Issues**: Run `troubleshoot-windows.bat`
- **Configuration Help**: See `docs/windows/installation.md`
- **API Documentation**: See `docs/technical/API.md`
- **Security**: See `docs/technical/SECURITY.md`

---

## 🎓 Learning Resources

- [Node.js on Windows](https://nodejs.org/en/docs/guides/nodejs-windows)
- [Prisma Windows Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-windows)
- [WhatsApp Web.js](https://wwebjs.dev/)
- [Express.js](https://expressjs.com/)

---

**Made with ❤️ for Windows developers**
