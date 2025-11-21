# docs/guides/CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsSelf is a WhatsApp Business automation platform that enables automated customer service with anti-ban safeguards. The system uses whatsapp-web.js for WhatsApp connectivity and implements sophisticated rate limiting, message queuing, and humanization features to avoid detection as a bot.

## Common Development Commands

### Backend Development (from `apps/backend/` directory)
```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Database operations (from project root)
npx prisma generate    # Generate Prisma client
npx prisma db push     # Sync schema to database
npx prisma migrate dev  # Create and apply migrations
```

### Testing
Currently not implemented. Planned stack:
- Vitest for unit tests
- Supertest for API endpoint testing

## High-Level Architecture

### Core Domain Logic

**Message Flow Pipeline:**
1. **Inbound messages** → Trigger Matcher → Flow Engine/Template Renderer → Message Queue
2. **Message Queue** enforces rate limits (8-12 msgs/min global, 1-2 per contact/5min)
3. **Humanization layer** adds typing indicators (1.5-3.5s) and random delays (3-7s)
4. **Circuit Breaker** monitors failures and pauses automations if failure rate >25%

**Key Business Rules:**
- **Opt-out detection**: Automatically detects "PARAR/SAIR/CANCELAR" and silences contact
- **Business hours enforcement**: Polite responses outside configured hours
- **First contact welcome**: One-time greeting for new contacts
- **Flow precedence**: Active flow > global triggers > fallback response

### Database Schema

The system uses Prisma ORM with SQLite (dev) / PostgreSQL (prod). Key models and their relationships:

- **Contact** → Messages (1:N): Tracks phone numbers and opt-in status
- **Flow** → FlowStep (1:N): Multi-step conversation definitions
- **FlowInstance**: Runtime state of a flow for a specific contact
- **Trigger** → Template/Flow: Pattern-based message routing
- **Template**: Response templates with variable interpolation ({{varName}})

### API Structure (`src/server.ts`)

All endpoints use Zod validation for type-safe input:

**Template Management:**
- `GET/POST/PUT/DELETE /templates` - Manage response templates

**Trigger Configuration:**
- `GET/POST/PUT/DELETE /triggers` - Configure pattern matching rules
- Supports: equals, contains, regex, number matching

**Flow Management:**
- `GET/POST/PUT/DELETE /flows` - Create/edit conversation flows
- `POST /flows/:id/publish` - Activate a flow
- `POST/PUT/DELETE /flows/:flowId/steps/:stepId` - Manage flow steps

**Simulation & Testing:**
- `POST /simulate` - Test trigger matching without sending messages

**Contact Flow Control:**
- `GET /contacts/:id/flow` - Get active flow for contact
- `POST /contacts/:id/flow/reset|pause` - Control flow execution

### Anti-Ban Implementation

The system implements multiple safeguards in `src/domain/`:

1. **Rate Limiting**: Global and per-contact limits with configurable thresholds
2. **Circuit Breaker**: Monitors failure rates and enters protective states (Closed → Open → Half-Open)
3. **Message Humanization**: Random delays, typing indicators, text variations
4. **Cooldown Periods**: Per-trigger, per-contact cooldowns prevent spam
5. **Flow Guards**: Maximum 20 auto-steps to prevent infinite loops

### Environment Configuration

Key environment variables (see docs/technical/STACK.md for complete list):
- `DATABASE_URL`: SQLite file path or PostgreSQL connection
- `RATE_MAX_PER_MIN`: Global rate limit (default: 12)
- `RATE_PER_CONTACT_PER_5MIN`: Per-contact limit (default: 2)
- `BUSINESS_HOURS`: Operating hours (e.g., "09:00-18:00")
- Circuit Breaker settings (CB_* variables)

## Project Status

**Current Phase:** MVP - Core backend functionality implemented

**Completed:**
- Database schema and Prisma setup
- RESTful API with Zod validation
- Trigger matching system (`triggerMatcher.ts`)
- Flow engine with state management (`flowEngine.ts`)
- Template rendering with variables (`templateRenderer.ts`)

**Not Yet Implemented:**
- WhatsApp integration (whatsapp-web.js)
- Message queue and rate limiting
- Circuit breaker pattern
- Web panel (Next.js)
- Testing suite
- Production deployment configuration

## File Structure Reference

```
apps/backend/
├── src/
│   ├── domain/          # Business logic
│   │   ├── triggerMatcher.ts    # Pattern matching for message routing
│   │   └── flowEngine.ts        # Conversation flow state machine
│   ├── services/        # Service layer
│   │   └── templateRenderer.ts  # Template variable interpolation
│   ├── index.ts         # Application entry point
│   └── server.ts        # Express routes and handlers
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration (strict mode)
prisma/
└── schema.prisma        # Database schema definition
```

## Development Guidelines

When implementing new features:
1. Maintain strict TypeScript types (tsconfig has strict: true)
2. Use Zod schemas for all API input validation
3. Follow the domain → services → API layering
4. Respect anti-ban rules: always add humanization delays
5. Test trigger matching with the `/simulate` endpoint
6. Check flow execution limits (max 20 auto-steps)