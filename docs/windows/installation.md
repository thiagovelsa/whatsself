# WhatsSelf - Windows Installation Guide

## System Requirements

### Minimum Requirements
- Windows 10 version 1903 or higher / Windows 11
- 4 GB RAM (8 GB recommended)
- 500 MB free disk space
- Node.js 20.19.0 or higher
- Google Chrome or Microsoft Edge browser

### Recommended Requirements
- Windows 10 version 21H2 or higher / Windows 11
- 8 GB RAM or more
- 2 GB free disk space
- SSD storage
- Stable internet connection

## Quick Installation

### Method 1: Using Batch Script (Simplest)

1. **Download and extract** the WhatsSelf project to a folder without spaces in the path
   - Good: `C:\WhatsSelf`
   - Bad: `C:\Program Files\WhatsSelf` (contains spaces)

2. **Run the setup script**:
   - Double-click `setup-windows.bat`
   - Follow the on-screen instructions

3. **Start the application**:
   - Double-click `start-windows.bat`
   - Or use the desktop shortcut created during setup

### Method 2: Using PowerShell Script (Advanced)

1. **Open PowerShell as Administrator**:
   - Right-click Windows Start button
   - Select "Windows PowerShell (Admin)"

2. **Navigate to project directory**:
   ```powershell
   cd C:\path\to\WhatsSelf
   ```

3. **Run the setup script**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup-windows.ps1
   ```

4. **Start the application**:
   ```powershell
   .\start-windows.bat
   ```

## Manual Installation

If the automated scripts don't work, follow these steps:

### 1. Install Prerequisites

1. **Node.js**: Download from [nodejs.org](https://nodejs.org/)
   - Choose Node.js 20 LTS or newer
   - Run the installer with default settings

2. **Chrome or Edge**:
   - Chrome: [google.com/chrome](https://www.google.com/chrome/)
   - Edge: Usually pre-installed on Windows

### 2. Setup Project

1. **Open Command Prompt** (Win+R, type `cmd`, press Enter)

2. **Navigate to project**:
   ```cmd
   cd C:\path\to\WhatsSelf
   ```

3. **Create required directories**:
   ```cmd
   mkdir data
   mkdir data\whatsapp_session
   mkdir logs
   mkdir prisma
   ```

4. **Install backend dependencies**:
   ```cmd
   cd apps\backend
   npm install
   cd ..\..
   ```

5. **Generate Prisma client**:
   ```cmd
   cd apps\backend
   npx prisma generate
   cd ..\..
   ```

6. **Setup database**:
   ```cmd
   cd apps\backend
   npx prisma db push
   cd ..\..
   ```

### 3. Configure Environment

1. **Copy environment template**:
   ```cmd
   cd apps\backend
   copy .env.windows .env
   ```

2. **Edit `.env` file** with Notepad or your preferred editor:
   ```cmd
   notepad .env
   ```

3. **Update these critical settings**:
   ```env
   # CHANGE THESE VALUES!
   JWT_SECRET=generate-a-random-64-character-string-here
   DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!

   # Adjust for your timezone
   TIMEZONE=America/Sao_Paulo
   BUSINESS_HOURS=09:00-18:00
   ```

### 4. Start the Application

```cmd
cd apps\backend
npm run dev
```

## Configuration

### Environment Variables

The `.env` file in `apps\backend\` contains all configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `JWT_SECRET` | Authentication secret (CHANGE THIS!) | Random 64-char string |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | Strong password |
| `CONFIG_CRYPTO_KEY` | Encrypts secrets stored in DB | Base64 (32 bytes) |
| `BUSINESS_HOURS` | Operating hours | `09:00-18:00` |
| `TIMEZONE` | Your timezone | `America/Sao_Paulo` |
| `SKIP_WHATSAPP` | Disable WhatsApp for testing | `false` |
| `WHATS_SESSION_PATH` | Session folder (auto-created) | `../../data/whatsapp_session` |

> ⚠️ Sempre deixe `DATABASE_URL=file:./dev.db`. O backend resolve esse caminho relativo para `apps/backend/prisma/dev.db`; adicionar `prisma/` no valor criará um banco duplicado em `prisma/prisma/dev.db`.

After editing `.env`, run:

```cmd
cd apps\backend
npm run config:init
```

This command ensures the `SystemConfig` table is created and encrypted with your `CONFIG_CRYPTO_KEY`.

### Configure in the UI

1. Start backend (`npm run dev`) and frontend (`npm run dev` in `WhatsSelf/`).
2. Access `http://localhost:5173`, login with the admin credentials printed in the backend console.
3. Open the **Configurações** page to adjust:
   - Segurança (JWT, senha do admin) com botões de revelar/regenerar.
   - Integração WhatsApp, detecção/validação do navegador.
   - Limites, humanização, circuit breaker e horários.
   - Parâmetros do WebSocket.
4. Salve as alterações e consulte o histórico de auditoria ao final da página.

### Chrome/Edge Configuration

If Chrome/Edge is not detected automatically:

1. Find your Chrome/Edge installation:
   - Chrome: Usually `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - Edge: Usually `C:\Program Files\Microsoft\Edge\Application\msedge.exe`

2. Add to `.env`:
   ```env
   PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
   ```

## Troubleshooting

### Run Diagnostic Tool

```cmd
troubleshoot-windows.bat
```

This will check:
- Node.js installation
- Browser availability
- Port conflicts
- Database status
- Configuration issues

### Common Issues

#### Issue: "Node.js is not installed"
**Solution**: Download and install Node.js from [nodejs.org](https://nodejs.org/)

#### Issue: "Port 3001 is already in use"
**Solution**:
1. Change port in `.env`: `PORT=3002`
2. Or stop the conflicting application

#### Issue: "Chrome not found"
**Solution**:
1. Install Chrome or Edge
2. Or specify path in `.env`: `PUPPETEER_EXECUTABLE_PATH=...`

#### Issue: "Cannot find module"
**Solution**:
```cmd
cd apps\backend
npm install
```

#### Issue: "Database error"
**Solution**:
```cmd
cd apps\backend
npx prisma db push
```

#### Issue: "Access denied" or permission errors
**Solution**:
1. Run Command Prompt as Administrator
2. Or move project to a user directory like `C:\Users\YourName\WhatsSelf`

#### Issue: WhatsApp QR Code not showing
**Solution**:
1. Set `PUPPETEER_HEADLESS=false` in `.env`
2. Check if Chrome/Edge is blocked by antivirus
3. Temporarily disable Windows Defender or add exception

## Windows Firewall

If you need to access the API from other devices on your network:

1. **Open Windows Defender Firewall**
2. **Click "Allow an app"**
3. **Add Node.js** to the exception list
4. Or run PowerShell as Admin:
   ```powershell
   New-NetFirewallRule -DisplayName "WhatsSelf API" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
   ```

## Antivirus Considerations

Some antivirus software may flag Puppeteer/Chrome automation:

1. **Windows Defender**: Usually no issues
2. **Third-party AV**: May need to add exceptions for:
   - Node.js executable
   - Project directory
   - Chrome/Edge executable

## Performance Tips

1. **Use SSD**: SQLite performs better on SSD
2. **Close unnecessary apps**: Free up RAM
3. **Disable Windows Search indexing** for project folder
4. **Use Edge instead of Chrome**: Better Windows integration
5. **Set Node.js priority**: Task Manager → Details → node.exe → Set Priority → High

## Backup and Recovery

### Backup Database
```cmd
copy prisma\dev.db prisma\backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.db
```

### Restore Database
```cmd
copy prisma\backup_YYYYMMDD.db prisma\dev.db
```

### Backup WhatsApp Session
```cmd
xcopy /E /I data\whatsapp_session data\whatsapp_session_backup
```

## Updating

1. **Backup your data** (see above)
2. **Save your `.env` file**
3. **Pull latest changes** or download new version
4. **Restore `.env` file**
5. **Run setup again**:
   ```cmd
   setup-windows.bat
   ```

## Support

For issues specific to Windows:

1. Run `troubleshoot-windows.bat`
2. Check the logs in `logs\` directory
3. Ensure all prerequisites are installed
4. Try running as Administrator
5. Check Windows Event Viewer for system errors

## Security Notes

**IMPORTANT**:
- Change default JWT_SECRET immediately
- Use a strong admin password
- Keep the `.env` file secure
- Don't commit `.env` to version control
- Regularly update Node.js and dependencies
- Enable Windows Firewall
- Use HTTPS in production (requires certificate)

## Production Deployment on Windows

For production use on Windows Server:

1. Use IIS with iisnode or PM2
2. Configure as Windows Service
3. Use PostgreSQL instead of SQLite
4. Implement proper logging
5. Setup automated backups
6. Configure SSL certificate
7. Implement rate limiting
8. Setup monitoring (e.g., Application Insights)

## License

See main LICENSE file in project root.
