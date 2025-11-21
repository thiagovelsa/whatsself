# WhatsSelf - Complete File Index

**Last Updated**: 2025-01-12
**Purpose**: Complete reference of all files in the project

---

## 📁 Root Directory Files

| File | Purpose | Target Audience |
|------|---------|----------------|
| **README.md** | Main documentation, Windows-focused | Everyone |
| **docs/windows/installation.md** | Detailed Windows installation guide | Windows users |
| **docs/guides/GETTING-STARTED.md** | Quick start guide (5 min setup) | Beginners |
| **docs/windows/setup.md** | Windows optimization details | Developers |
| **docs/reports/PROJECT-STATUS.md** | Current project state & roadmap | Stakeholders |
| **docs/guides/FILE-INDEX.md** | This file - complete file listing | Developers |
| **docs/guides/CLAUDE.md** | AI assistant instructions | AI/Developers |
| **docs/reports/PROPOSTA.md** | Product vision (Portuguese) | Product team |
| **docs/reports/CHANGELOG.md** | Version history | Everyone |
| **docs/guides/CONTRIBUTING.md** | Contribution guidelines | Contributors |
| **docs/reports/ROADMAP.md** | Future features | Stakeholders |
| **.gitignore** | Git ignore rules (Windows-optimized) | Developers |
| **LICENSE** | MIT License | Legal |

---

## 🪟 Windows Scripts (Root)

| File | Type | Purpose |
|------|------|---------|
| **setup-windows.bat** | Batch | Simple installation script |
| **setup-windows.ps1** | PowerShell | Advanced setup with security features |
| **start-windows.bat** | Batch | Application launcher |
| **troubleshoot-windows.bat** | Batch | Diagnostic tool (12 checks) |
| **cleanup-windows.bat** | Batch | Project cleanup & organization |

**Usage**:
```cmd
setup-windows.bat      # First time setup
start-windows.bat      # Daily startup
troubleshoot-windows.bat  # When issues occur
cleanup-windows.bat    # Cleanup project
```

---

## 📚 docs/ Directory (Technical Documentation)

| File | Topic | Last Updated |
|------|-------|--------------|
| **docs/technical/API.md** | REST API endpoint reference | Complete |
| **docs/technical/STACK.md** | Technology stack & architecture | Complete |
| **docs/technical/DATABASE.md** | Database schema & operations | Complete |
| **docs/technical/SECURITY.md** | Security best practices | Complete |
| **docs/technical/TESTING.md** | Testing guide (planned) | Planned |
| **docs/technical/DEPLOYMENT.md** | Production deployment | Complete |
| **docs/technical/MONITORING.md** | Monitoring & telemetry | Complete |
| **docs/technical/BUSINESS_RULES.md** | Business logic rules | Complete |
| **docs/reports/FRONTEND_INTEGRATION.md** | Frontend integration guide | Complete |
| **docs/guides/TROUBLESHOOTING.md** | Advanced troubleshooting | Complete |

---

## 🖥️ apps/backend/ Directory

### Root Files

| File | Purpose |
|------|---------|
| **package.json** | Dependencies & scripts (Windows-optimized) |
| **tsconfig.json** | TypeScript configuration (strict mode) |
| **.env** | Environment configuration (not in git, created by setup) |
| **.env.windows** | Windows environment template |
| **.env.example** | Generic environment template |

### src/ Directory

#### src/config/

| File | Purpose |
|------|---------|
| **env.validator.ts** | ✅ NEW: Environment validation with Zod |

**Features**:
- Validates all environment variables
- Converts types automatically
- Resolves paths to absolute
- Security checks
- Windows-specific handling

#### src/domain/

| File | Purpose |
|------|---------|
| **triggerMatcher.ts** | Pattern matching engine (equals, contains, regex, number) |
| **flowEngine.ts** | Conversation flow state machine |

#### src/middleware/

| File | Purpose |
|------|---------|
| **auth.ts** | JWT authentication middleware |

#### src/services/

| File | Purpose | Windows Changes |
|------|---------|----------------|
| **whatsappService.ts** | WhatsApp-web.js integration | ✅ FIXED: Path handling, browser detection |
| **authService.ts** | Authentication & user management | ✅ FIXED: Security hardening |
| **businessRules.ts** | Business hours, opt-out, first contact | ✅ FIXED: Timezone support |
| **messageQueue.ts** | Message queuing & rate limiting | Complete |
| **humanizer.ts** | Message humanization (delays, typing) | Complete |
| **circuitBreaker.ts** | Circuit breaker pattern | Complete |
| **templateRenderer.ts** | Template rendering with variables | Complete |
| **automationOrchestrator.ts** | Main orchestration service | Complete |
| **websocketService.ts** | WebSocket real-time updates | Complete |

#### src/

| File | Purpose | Windows Changes |
|------|---------|----------------|
| **index.ts** | Application entry point | ✅ FIXED: Graceful shutdown, Windows signals |
| **server.ts** | Express server & routes | Complete |

### scripts/

| File | Purpose | Platform |
|------|---------|----------|
| **run-dev-windows.mjs** | ✅ NEW: Windows-optimized dev runner | Windows-only |
| **setup-test-db.js** | Test database setup | Cross-platform |

**Removed**: `run-dev.mjs` (WSL-specific)

---

## 💾 prisma/ Directory

| File | Purpose | Windows Changes |
|------|---------|----------------|
| **schema.prisma** | Database schema | ✅ UPDATED: Added Windows binary targets |
| **dev.db** | SQLite database (development) | Single location |
| **dev.db-journal** | SQLite journal file | Auto-generated |

**Cleaned up**: Removed duplicate databases in `prisma/prisma/` and `apps/prisma/`

---

## 📦 data/ Directory

```
data/
└── whatsapp_session/    # WhatsApp session data (created by app)
    ├── Default/
    ├── IndexedDB/
    └── ... (managed by whatsapp-web.js)
```

**Purpose**: Persistent storage for WhatsApp authentication

---

## 📝 logs/ Directory

```
logs/
├── app.log             # Application logs
├── error.log           # Error logs
└── combined.log        # Combined logs
```

**Purpose**: Structured logging via Pino

---

## 🔍 File Count Summary

| Category | Count |
|----------|-------|
| **Root Documentation** | 12 files |
| **Windows Scripts** | 5 files |
| **Technical Docs** | 10 files |
| **Source Code** | 15 TypeScript files |
| **Configuration** | 4 files |
| **Scripts** | 2 files |
| **Database** | 1 schema file |
| **TOTAL** | ~49 project files |

*Excludes: node_modules, .git, generated files, logs*

---

## 📋 File Type Breakdown

| Type | Extension | Count | Purpose |
|------|-----------|-------|---------|
| **Documentation** | .md | 22 | Guides & references |
| **TypeScript** | .ts | 15 | Application code |
| **JavaScript** | .mjs, .js | 2 | Build scripts |
| **Batch Scripts** | .bat | 4 | Windows automation |
| **PowerShell** | .ps1 | 1 | Advanced setup |
| **Configuration** | .json, .prisma, .env | 5 | Project config |
| **Other** | .gitignore, LICENSE | 2 | Project meta |

---

## 🗂️ Important File Paths

### For Users

```
WhatsSelf/
├── setup-windows.bat           ← Start here
├── start-windows.bat           ← Daily use
├── troubleshoot-windows.bat    ← When problems occur
├── README.md                   ← Main docs
└── docs/guides/GETTING-STARTED.md          ← Quick guide
```

### For Developers

```
WhatsSelf/
├── apps/backend/
│   ├── src/
│   │   ├── config/env.validator.ts  ← Environment setup
│   │   ├── services/                 ← Main business logic
│   │   ├── domain/                   ← Core domain logic
│   │   ├── index.ts                  ← Entry point
│   │   └── server.ts                 ← API routes
│   ├── package.json                  ← Dependencies
│   └── .env                          ← Configuration
│
├── prisma/schema.prisma        ← Database schema
├── docs/guides/CLAUDE.md                   ← AI instructions
└── docs/windows/setup.md            ← Setup details
```

### For Documentation Writers

```
WhatsSelf/
├── docs/                       ← All technical docs
│   ├── docs/technical/API.md
│   ├── docs/technical/SECURITY.md
│   └── ... (10 files)
│
├── README.md                   ← Main entry
├── docs/guides/GETTING-STARTED.md          ← User guide
└── docs/guides/CONTRIBUTING.md             ← Contributor guide
```

---

## 🔄 File Updates Changelog

### 2025-01-12 - Windows Optimization

**New Files Created** (14):
1. `src/config/env.validator.ts`
2. `scripts/run-dev-windows.mjs`
3. `.env.windows`
4. `.gitignore`
5. `setup-windows.bat`
6. `setup-windows.ps1`
7. `start-windows.bat`
8. `troubleshoot-windows.bat`
9. `cleanup-windows.bat`
10. `docs/windows/setup.md`
11. `docs/reports/PROJECT-STATUS.md`
12. `docs/guides/GETTING-STARTED.md`
13. `docs/guides/FILE-INDEX.md` (this file)
14. `docs/windows/installation.md`

**Files Modified** (7):
1. `src/services/whatsappService.ts` - Path fixes
2. `src/services/authService.ts` - Security hardening
3. `src/services/businessRules.ts` - Timezone support
4. `src/index.ts` - Windows shutdown
5. `package.json` - Windows scripts
6. `prisma/schema.prisma` - Windows binaries
7. `README.md` - Complete rewrite (Windows-focused)

**Files Removed** (4):
1. `scripts/run-dev.mjs` - Replaced
2. `prisma/prisma/dev.db` - Duplicate
3. `apps/prisma/dev.db` - Duplicate
4. Linux npm dependency removed

**Documentation Organized**:
- Moved 10 files to `docs/` directory
- Removed 5 outdated/duplicate files

---

## 🎯 Key Files for Common Tasks

### Installation

```
1. setup-windows.bat           # Run first
2. apps/backend/.env           # Edit this
3. start-windows.bat           # Then run
```

### Development

```
1. apps/backend/src/           # Code here
2. prisma/schema.prisma        # Database schema
3. apps/backend/.env           # Configuration
4. package.json                # Scripts & deps
```

### Troubleshooting

```
1. troubleshoot-windows.bat    # Diagnostics
2. logs/                       # Check logs
3. docs/windows/installation.md           # Solutions
4. docs/guides/TROUBLESHOOTING.md     # Advanced
```

### Documentation

```
1. README.md                   # Overview
2. docs/guides/GETTING-STARTED.md          # Quick start
3. docs/technical/API.md                 # API reference
4. docs/technical/SECURITY.md            # Security
```

---

## 📌 Quick Reference

### Most Important Files

**For Users**:
1. `setup-windows.bat` - Installation
2. `start-windows.bat` - Launch
3. `docs/guides/GETTING-STARTED.md` - Guide
4. `troubleshoot-windows.bat` - Fix issues

**For Developers**:
1. `apps/backend/src/index.ts` - Entry point
2. `apps/backend/.env` - Configuration
3. `prisma/schema.prisma` - Database
4. `docs/guides/CLAUDE.md` - Development guide

**For Documentation**:
1. `README.md` - Main docs
2. `docs/` directory - Technical docs
3. `docs/windows/setup.md` - Setup details
4. `docs/reports/PROJECT-STATUS.md` - Current state

---

## 🔎 Finding Files

### By Purpose

| Need to... | Look at... |
|------------|------------|
| Install | `setup-windows.bat` |
| Configure | `apps/backend/.env` |
| Start app | `start-windows.bat` |
| Fix issues | `troubleshoot-windows.bat` |
| Learn API | `docs/technical/API.md` |
| Understand security | `docs/technical/SECURITY.md` |
| Add feature | `apps/backend/src/services/` |
| Change database | `prisma/schema.prisma` |
| Deploy | `docs/technical/DEPLOYMENT.md` |
| Contribute | `docs/guides/CONTRIBUTING.md` |

### By File Extension

```cmd
# Find all TypeScript files
dir /s /b *.ts

# Find all markdown docs
dir /s /b *.md

# Find all batch scripts
dir /s /b *.bat

# Find configuration files
dir /s /b *.json *.env* *.prisma
```

---

## 📊 Statistics

- **Total Lines of Code**: ~3,500 (TypeScript)
- **Total Documentation**: ~8,000 lines (Markdown)
- **Total Scripts**: ~500 lines (Batch + PowerShell)
- **Test Coverage**: 0% (tests not implemented yet)
- **Documentation Coverage**: 100% ✅

---

**Last Updated**: 2025-01-12
**Maintained By**: Project team
**Review Frequency**: Monthly
