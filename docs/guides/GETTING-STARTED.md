# Getting Started with WhatsSelf on Windows

**⚡ Quick start guide for Windows users - from zero to running in 5 minutes!**

---

## 📋 Pre-Flight Checklist

Before starting, make sure you have:

- [ ] Windows 10 (version 1903+) or Windows 11
- [ ] 4 GB RAM available
- [ ] 500 MB free disk space
- [ ] Internet connection

**Don't have Node.js or Chrome?** No problem! We'll install them.

---

## 🚀 Step-by-Step Installation

### Step 1: Install Prerequisites (if needed)

#### Install Node.js

1. **Download**: Go to [nodejs.org](https://nodejs.org/)
2. **Click**: "Download LTS" (green button)
3. **Run**: Downloaded installer
4. **Click**: "Next" → "Next" → "Install"
5. **Verify**: Open Command Prompt and type:
   ```cmd
   node --version
   ```
   Should show `v18.x.x` or higher ✅

#### Install Chrome (if needed)

1. **Download**: Go to [google.com/chrome](https://www.google.com/chrome/)
2. **Click**: "Download Chrome"
3. **Run**: Installer
4. **Done**: Chrome is ready ✅

---

### Step 2: Download WhatsSelf

1. **Download** this repository as ZIP
2. **Extract** to a simple folder path:
   - ✅ Good: `C:\WhatsSelf`
   - ❌ Bad: `C:\Program Files\WhatsSelf` (has spaces)

---

### Step 3: Run Setup

**Option A: Simple (Recommended)**

1. **Open** the folder `C:\WhatsSelf`
2. **Double-click** `setup-windows.bat`
3. **Wait** for setup to complete (2-5 minutes)
4. **Read** the generated credentials carefully!

**Option B: Advanced (PowerShell)**

1. **Right-click** Windows Start button
2. **Select** "Windows PowerShell (Admin)"
3. **Run**:
   ```powershell
   cd C:\WhatsSelf
   powershell -ExecutionPolicy Bypass -File setup-windows.ps1
   ```
4. **Save** the auto-generated credentials!

---

### Step 4: Configure Your Settings

1. **Open** file: `C:\WhatsSelf\apps\backend\.env` in Notepad
2. **Change** these lines:

```env
# IMPORTANT: Change these!
JWT_SECRET=REPLACE_WITH_RANDOM_64_CHARACTER_STRING
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!

# Optional: Adjust timezone
TIMEZONE=America/Sao_Paulo
BUSINESS_HOURS=09:00-18:00
```

**💡 Tip**: PowerShell setup auto-generates secure values for you!

---

### Step 5: Start the Application

1. **Double-click** `start-windows.bat`
2. **Wait** for server to start (~5 seconds)
3. **Look** for this message:
   ```
   🚀 WhatsSelf Backend is running!
   📡 API: http://localhost:3001
   ```

---

## 🎉 You're Running!

### What Now?

#### Test the API

Open browser and go to:
```
http://localhost:3001
```

You should see a welcome message ✅

#### Connect WhatsApp

1. **Open** browser to: `http://localhost:3001/whatsapp/qr`
2. **Scan** the QR code with WhatsApp on your phone:
   - Open WhatsApp
   - Tap ⋮ (menu) → "Linked Devices"
   - Tap "Link a Device"
   - Scan the QR code

#### Check Logs

Logs are in: `C:\WhatsSelf\logs\`

---

## ❓ Troubleshooting

### Something Wrong?

**Run the diagnostic tool**:
```cmd
troubleshoot-windows.bat
```

This will check everything and tell you what's wrong!

---

### Common Issues

#### "Port 3001 is already in use"

**Solution 1**: Stop other application using port 3001
```cmd
netstat -ano | findstr :3001
taskkill /F /PID [PID_NUMBER]
```

**Solution 2**: Change port in `.env`:
```env
PORT=3002
```

---

#### "Chrome not found"

**Solution**: Install Chrome or tell WhatsSelf where it is:

1. **Find** Chrome path:
   - Usually: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - Or: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

2. **Add** to `.env`:
   ```env
   PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
   ```

---

#### "Database error"

**Solution**: Reset database:
```cmd
cd C:\WhatsSelf\apps\backend
npm run db:push
```

---

#### "npm not found" or "node not found"

**Solution**: Node.js not installed or not in PATH

1. **Reinstall** Node.js from [nodejs.org](https://nodejs.org/)
2. **Make sure** to check "Add to PATH" during installation
3. **Restart** Command Prompt after installing

---

## 📚 Next Steps

### Learn the Basics

1. **Read**: [README.md](README.md) - Feature overview
2. **Read**: [docs/technical/API.md](docs/technical/API.md) - API endpoints
3. **Read**: [docs/technical/SECURITY.md](docs/technical/SECURITY.md) - Security setup

### Create Your First Automation

#### 1. Create a Template

```http
POST http://localhost:3001/templates
Content-Type: application/json

{
  "key": "welcome",
  "content": "Olá {{name}}! Bem-vindo ao nosso atendimento."
}
```

#### 2. Create a Trigger

```http
POST http://localhost:3001/triggers
Content-Type: application/json

{
  "type": "contains",
  "pattern": "oi",
  "templateId": "[TEMPLATE_ID]",
  "active": true
}
```

#### 3. Test It!

Send "oi" to your WhatsApp number and get the automated response!

---

### Create Your First Flow

Flows allow multi-step conversations:

```http
POST http://localhost:3001/flows
Content-Type: application/json

{
  "name": "Atendimento Inicial",
  "steps": [
    {
      "key": "start",
      "type": "send_template",
      "templateId": "[TEMPLATE_ID]",
      "waitInput": true
    }
  ]
}
```

---

## 🛠️ Developer Tools

### Useful Commands

```cmd
# Start development server
cd apps\backend
npm run dev

# Open Prisma Studio (database GUI)
npm run db:studio

# Generate Prisma client after schema change
npm run db:generate

# Run tests (when implemented)
npm run test

# Build for production
npm run build

# Start production server
npm run start:prod
```

---

## 🔐 Security Reminders

Before going to production:

- [ ] Change `JWT_SECRET` to a random 64-character string
- [ ] Set strong `DEFAULT_ADMIN_PASSWORD`
- [ ] Review `API_CORS_ORIGIN` settings
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure Windows Firewall
- [ ] Setup monitoring and backups
- [ ] Read [docs/technical/SECURITY.md](docs/technical/SECURITY.md)

---

## 📞 Get Help

### Resources

- **Diagnostic Tool**: Run `troubleshoot-windows.bat`
- **Windows Guide**: [docs/windows/installation.md](docs/windows/installation.md)
- **Setup Details**: [docs/windows/setup.md](docs/windows/setup.md)
- **Project Status**: [docs/reports/PROJECT-STATUS.md](docs/reports/PROJECT-STATUS.md)

### Community

- **Issues**: Report bugs on GitHub
- **Discussions**: Ask questions on GitHub Discussions
- **Documentation**: Check the `docs/` folder

---

## 🎓 Learning Path

### Beginner

1. ✅ Complete this getting started guide
2. ✅ Create a simple template
3. ✅ Create a basic trigger
4. ✅ Test with your WhatsApp

### Intermediate

1. ✅ Create multi-step flows
2. ✅ Use template variables
3. ✅ Configure business hours
4. ✅ Setup circuit breaker limits

### Advanced

1. ✅ Deploy to production
2. ✅ Setup PostgreSQL database
3. ✅ Configure HTTPS/SSL
4. ✅ Implement monitoring
5. ✅ Create custom integrations

---

## 📊 Success Checklist

After completing this guide, you should have:

- [x] Node.js installed
- [x] Chrome/Edge installed
- [x] WhatsSelf installed
- [x] Server running
- [x] WhatsApp connected
- [x] First template created
- [x] First trigger tested

**🎉 Congratulations! You're ready to automate!**

---

**Need more help?** Read the [full documentation](README.md) or run `troubleshoot-windows.bat`

**Ready for production?** Read [docs/technical/DEPLOYMENT.md](docs/technical/DEPLOYMENT.md)

---

<div align="center">

**Happy Automating! 🤖**

[⬆ Back to top](#getting-started-with-whatsself-on-windows)

</div>
