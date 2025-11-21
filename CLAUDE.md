# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsSelf is a WhatsApp Business automation platform optimized for Windows that enables intelligent conversational flows, message templating, and automated customer service with integrated anti-ban protection. Built with TypeScript, Express, and whatsapp-web.js.

## Development Commands

### Backend Development

```bash
# Navigate to backend
cd apps\backend

# Development (hot reload)
npm run dev

# Build
npm run build
npm run build:check  # Type check only

# Production
npm run start:prod

# Database
npm run db:generate  # Generate Prisma client after schema changes
npm run db:push      # Push schema to database (dev)
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio GUI
npm run db:reset     # Reset database (DESTRUCTIVE)

# Testing
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run test:ui      # UI mode
npm run test:coverage # Coverage report

# Configuration
npm run config:init  # Initialize SystemConfig from .env (run once after .env setup)

# Maintenance
npm run clean        # Clean build artifacts
npm run clean:all    # Clean everything including node_modules
```

### Windows-Specific Scripts

```cmd
# Setup and start
setup-windows.bat      # Initial setup (dependencies, database, .env generation)
start-all-windows.bat  # Start backend + frontend together
start-windows.bat      # Start backend only

# Diagnostics and cleanup
troubleshoot-windows.bat # Run diagnostics on Node.js, browser, ports, database
cleanup-windows.bat      # Clean build artifacts and temp files
```

### Running a Single Test

```bash
cd apps\backend
npm run setup:test-db && npx vitest run src/__tests__/specificTest.test.ts
```

## Architecture Overview

### Core Domain Logic

The system follows a layered architecture with clear separation between services, domain logic, and API:

1. **AutomationOrchestrator** (`services/automationOrchestrator.ts`): Main coordinator that ties together all services. Handles incoming WhatsApp messages and coordinates responses through:
   - **TriggerMatcher** (`domain/triggerMatcher.ts`): Pattern matching for incoming messages (equals, contains, regex, number conditions)
   - **FlowEngine** (`domain/flowEngine.ts`): State machine for multi-step conversational flows
   - **TemplateRenderer** (`services/templateRenderer.ts`): Renders templates with variable substitution and variants

2. **Anti-Ban Protection System**:
   - **MessageQueue** (`services/messageQueue.ts`): Priority queue with global and per-contact rate limiting
   - **Humanizer** (`services/humanizer.ts`): Adds random delays (3-7s) and typing indicators (1.5-3.5s) before sending
   - **CircuitBreaker** (`services/circuitBreaker.ts`): Auto-pauses automation when failure rate exceeds 25% (configurable)
   - **BusinessRules** (`services/businessRules.ts`): Enforces business hours, opt-out detection, cooldown periods

3. **WhatsApp Integration** (`services/whatsappService.ts`): Wraps whatsapp-web.js with auto-detection of Chrome/Edge browsers, QR code generation, and session persistence

4. **System Configuration** (`services/systemConfigService.ts`): Centralized config management with encryption for secrets, audit trail, and WebSocket notifications on changes

### Message Processing Flow

```
Incoming Message → AutomationOrchestrator
  ↓
BusinessRules Check (opt-out, business hours)
  ↓
Circuit Breaker Check
  ↓
Active Flow? → YES → FlowEngine (applyInputAndProgress)
           ↓ NO
           ↓
TriggerMatcher → Template OR Flow Start
  ↓
MessageQueue (rate limiting, priority)
  ↓
Humanizer (delays, typing indicator)
  ↓
WhatsAppService → Send via whatsapp-web.js
```

### Database Schema

**Key models** (see `apps/backend/prisma/schema.prisma`):
- **Contact**: Phone numbers, opt-in/out status, flow instances
- **Template**: Message templates with variables and variants for humanization
- **Trigger**: Pattern matchers (equals/contains/regex/number) that start flows or send templates
- **Flow/FlowStep**: Multi-step conversational flows with state persistence
- **FlowInstance**: Per-contact flow execution state
- **Message**: All inbound/outbound messages with status tracking
- **SystemConfig**: Single-row global config (encrypted secrets, rate limits, circuit breaker settings)
- **ConfigAudit**: Audit trail for config changes
- **User**: Admin/operator authentication with JWT

### Configuration System

Configuration comes from TWO sources and must stay in sync:

1. **Environment variables** (`.env` in `apps/backend/`): Initial bootstrap values
2. **SystemConfig table**: Single row (`id: "global"`) that stores runtime config with encrypted secrets

**Critical workflow**:
- After changing `.env`, run `npm run config:init` to sync to database
- Use `/config` API endpoint (admin only) to update at runtime
- Services subscribe to `systemConfigService` for live updates via WebSocket

**Encrypted fields**: `jwtSecret`, `defaultAdminPassword` (uses `CONFIG_CRYPTO_KEY` from .env)

### State Management

- **Flow state**: Stored in `FlowInstance.stateJson` (JSON field) per contact
- **Circuit breaker state**: In-memory, tracks last 50 attempts or 5-minute window (configurable)
- **Rate limiting**: In-memory sliding windows (global: last minute, per-contact: last 5 minutes)
- **WhatsApp session**: Persisted to disk via LocalAuth in `data/whatsapp_session/`

## Development Guidelines

### When Modifying Services

1. **Rate limits or circuit breaker settings**: Update both `env.validator.ts` schema AND `systemConfigService.ts` types. Services subscribe to config changes via `subscribe(callback)` pattern.

2. **Adding new Trigger types**: Update `TriggerType` enum in `prisma/schema.prisma`, regenerate Prisma client, and add matching logic in `triggerMatcher.ts`

3. **Adding new Flow step types**: Update `StepType` enum in schema, add handling in `flowEngine.ts` (`processAutoSteps` and `applyInputAndProgress`)

4. **Modifying templates**: Templates support:
   - Variables: `{{variableName}}` in content
   - Variants: Array of alternative phrasings (randomly selected by `templateRenderer.ts`)
   - Locale: For future multi-language support

### Testing

Tests are in `apps/backend/src/__tests__/`:
- `businessRules.test.ts`: Opt-out, business hours, response message logic
- `circuitBreaker.test.ts`: State transitions, probe cycles, cooldown
- `authService.test.ts`: User registration, login, password validation
- `config.test.ts`: SystemConfig encryption, updates, audit trail
- `api.test.ts`: HTTP endpoint integration tests

**Test database**: Uses separate SQLite file (`test.db`), set up via `setup:test-db` script

### Security Considerations

- **Never commit** `.env` files or `data/whatsapp_session/` directory
- **JWT_SECRET**: Must be 32+ chars in production (validated by `env.validator.ts`)
- **DEFAULT_ADMIN_PASSWORD**: Must be changed from defaults; complexity enforced in production
- **CONFIG_CRYPTO_KEY**: 16+ chars, used for encrypting secrets in SystemConfig table
- **CORS**: Restricted to origins in `API_CORS_ORIGIN` (comma-separated)
- **Authentication**: All API routes except `/health`, `/qr`, `/whatsapp/status`, `/auth/*` require JWT via `authenticate` middleware
- **Authorization**: Admin-only routes use `authorize(UserRole.admin)` middleware

### Windows-Specific Notes

- **Paths**: Use `path.join()` and `path.resolve()` for cross-platform compatibility. Avoid hardcoded `\\` or `/` separators.
- **Browser detection**: `server.ts` has `detectBrowserExecutables()` that searches common Windows Chrome/Edge install paths
- **Long paths**: Enabled by default via `WINDOWS_LONG_PATH_SUPPORT=true` (sets `NODE_SKIP_PLATFORM_CHECK=1`)
- **Temp directory**: Defaults to `%LOCALAPPDATA%\Temp\whatsself` if `WINDOWS_TEMP_DIR` not set
- **Batch scripts**: All `.bat` files use Windows-native commands; `.ps1` is PowerShell alternative

### Common Gotchas

1. **Prisma schema changes**: Always run `npm run db:generate` after modifying `schema.prisma` to regenerate the client
2. **ESM modules**: Project uses `"type": "module"` in package.json; use `.js` extensions in imports even for `.ts` files
3. **WhatsApp session**: First run requires QR scan; set `PUPPETEER_HEADLESS=false` to see QR in browser window
4. **Circuit breaker**: When open, automation is paused except for direct inbound message responses. Use `/circuit-breaker/reset` API to manually reset
5. **Rate limits**: Global (12/min) and per-contact (2/5min) are cumulative; exceeding pauses message sending until window clears
6. **Flow instances**: Only ONE active (non-paused) flow per contact at a time; new flows auto-pause existing ones
7. **SystemConfig updates**: Changing `JWT_SECRET` invalidates all active tokens; users must re-login

### API Endpoint Patterns

- **Public**: `/health`, `/qr`, `/whatsapp/status`, `/auth/*`
- **Authenticated**: All others (JWT in `Authorization: Bearer <token>`)
- **Admin-only**: `/config/*`, `/admin/*`, `/circuit-breaker/force-open`
- **Real-time**: WebSocket on same port as API (`ws://localhost:3001/socket.io`), emits: `whatsapp:ready`, `whatsapp:qr`, `whatsapp:disconnected`, `message:received`, `message:sent`, `queue:update`, `circuit-breaker:state`, `system:status`, `config:updated`

### Error Handling

- **Validation errors**: Zod schemas throw descriptive errors caught by Express error handler
- **Database errors**: Prisma errors (e.g., unique constraint violations) are caught and returned as 409 Conflict
- **WhatsApp errors**: Logged and trigger circuit breaker failure counter
- **Uncaught exceptions**: Fatal log + process.exit(1) in `index.ts`

## File Structure Highlights

```
apps/backend/
├── src/
│   ├── config/
│   │   └── env.validator.ts      # Zod-based .env validation + path processing
│   ├── domain/                   # Core business logic (trigger matching, flow engine)
│   ├── middleware/
│   │   └── auth.ts               # JWT authenticate + authorize middleware
│   ├── services/                 # All services (WhatsApp, queue, humanizer, etc.)
│   │   ├── automationOrchestrator.ts  # Main coordinator
│   │   ├── systemConfigService.ts     # Centralized config + encryption
│   │   ├── circuitBreaker.ts          # Anti-ban circuit breaker
│   │   ├── messageQueue.ts            # Priority queue + rate limiting
│   │   └── businessRules.ts           # Opt-out, hours, cooldowns
│   ├── __tests__/                # Vitest tests
│   ├── index.ts                  # Entry point (startup, graceful shutdown)
│   └── server.ts                 # Express app + all routes
├── prisma/
│   └── schema.prisma             # Database schema (SQLite dev, Postgres prod)
├── scripts/                      # Build and dev scripts
└── .env                          # Environment variables (not committed)
```

## Related Documentation

- **Architecture diagram**: `docs/ARCHITECTURE.md` (Mermaid flowchart)
- **Technology stack details**: `docs/technical/STACK.md`
- **API reference**: `docs/technical/API.md`
- **Security guide**: `docs/technical/SECURITY.md`
- **Windows installation**: `docs/windows/installation.md`
