# WhatsSelf Frontend - WhatsApp Business Automation Platform

**Modern React 19 dashboard for WhatsApp automation management**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## 🎯 Overview

The WhatsSelf frontend is a modern, responsive web application built with React 19, TypeScript, and Tailwind CSS. It provides a comprehensive dashboard for managing WhatsApp automation, including templates, triggers, flows, contacts, and messages.

### ✨ Key Features

- 🎨 **Modern UI**: Dark-themed dashboard with Tailwind CSS
- ⚡ **Fast**: Vite for lightning-fast dev server and optimized builds
- 🔄 **Real-time**: WebSocket integration for live updates
- 📊 **Data Management**: React Query for efficient data fetching and caching
- 🧭 **Routing**: Client-side routing with React Router 7
- 🔐 **Authentication**: JWT-based auth with automatic token management
- 📱 **Responsive**: Mobile-friendly design
- 🪟 **Windows-Optimized**: Native Windows scripts and configuration

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Backend API** running on port 3001 ([Setup Guide](../docs/windows/installation.md))

### Installation (Windows)

#### Option 1: Using Batch Script (Recommended)

```cmd
setup-frontend.bat
```

#### Option 2: Manual Setup

```cmd
# 1. Install dependencies
npm install

# 2. Copy environment template
copy .env.example .env.local

# 3. Edit .env.local (if needed)
notepad .env.local

# 4. Type check
npm run type-check
```

### Running the App

```cmd
# Start development server
start-frontend.bat

# Or manually
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Default Credentials** (from backend):
- Email: `admin@whatsself.local`
- Password: (check backend `.env` file)

---

## 📊 Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 19.0 | UI library |
| **Language** | TypeScript | 5.8 | Type safety |
| **Build Tool** | Vite | 7.1 | Dev server & bundler |
| **Styling** | Tailwind CSS | 3.4 | Utility-first CSS |
| **Routing** | React Router | 7.5 | Client-side routing |
| **State Management** | Zustand | 5.0 | Lightweight state |
| **Data Fetching** | React Query | 5.90 | Server state management |
| **HTTP Client** | Axios | 1.13 | API requests |
| **WebSocket** | Socket.io-client | 4.8 | Real-time updates |
| **Icons** | Lucide React | 0.510 | Icon library |

---

## 🛠️ Available Scripts

### Development

```cmd
npm run dev          # Start dev server (port 5173)
npm run dev:host     # Start with network access
```

### Build & Production

```cmd
npm run build        # Build for production
npm run build:check  # Type check without building
npm run preview      # Preview production build
```

### Code Quality

```cmd
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # TypeScript type checking
```

### Maintenance

```cmd
npm run clean        # Clean dist folder
npm run clean:all    # Clean dist + node_modules
```

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` file (or copy from `.env.example`):

```env
# Backend API URL
VITE_API_URL=http://localhost:3001

# WebSocket URL
VITE_WS_URL=ws://localhost:3001
```

### API Proxy (Development)

During development, Vite proxies API calls to avoid CORS issues. All API requests to `/templates`, `/triggers`, `/flows`, `/contacts`, `/messages`, `/auth`, etc. are automatically proxied to the backend at `http://localhost:3001`.

**Note**: In production, configure CORS on backend or use a reverse proxy.

---

## 📱 Features

### Dashboard
- WhatsApp connection status, message queue metrics, circuit breaker state
- Failed messages tracking, today's message count, total contacts
- Automation rate, recent messages feed, quick action links

### WhatsApp QR Code
- Real-time QR code generation, connection status monitoring
- Step-by-step instructions, system status information

### Contacts Management
- Infinite scroll pagination (25/page), search by name/phone
- Filter by opt-in status, message count per contact
- Flow instance management, flow reset/pause controls

### Messages
- Infinite scroll pagination (50/page), filter by status & direction
- Real-time updates (5s interval), broadcast messaging
- Manual message sending, message status tracking

### Templates
- Create/edit/delete templates, variable support ({{varName}})
- Message variants (humanization), locale support

### Triggers
- Pattern matching (equals, contains, regex, number)
- Priority ordering, cooldown configuration
- Link to templates or flows

### Flows
- Multi-step conversation flows, draft/published/archived status
- Version management, flow step CRUD, visual flow representation

### Settings
- Business hours configuration, rate limit controls
- Circuit breaker management, user management (admin only)

---

## 📞 Support

### Resources

- **Main Documentation**: [../README.md](../README.md)
- **Windows Setup**: [../docs/windows/installation.md](../docs/windows/installation.md)
- **Backend API**: [../docs/technical/docs/technical/API.md](../docs/technical/docs/technical/API.md)

### Common Issues

**"Cannot connect to backend"**
- Ensure backend is running: `cd ../apps/backend && npm run dev`
- Check backend is on port 3001
- Verify `.env.local` has correct API_URL

**"WebSocket not connecting"**
- Check backend WebSocket is enabled
- Verify `VITE_WS_URL` in `.env.local`

**"401 Unauthorized"**
- Token may have expired - logout and login again
- Check backend JWT_SECRET is set

---

<div align="center">

**Built with ❤️ for Windows users**

[⬆ Back to top](#whatsself-frontend---whatsapp-business-automation-platform)

</div>
