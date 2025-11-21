# 🚀 Guia de Uso - WhatsSelf (PostgreSQL + Docker)

Este guia explica como iniciar e utilizar o sistema WhatsSelf agora que ele foi migrado para usar **PostgreSQL** via Docker.

## 📋 Pré-requisitos

1.  **Docker Desktop**: Deve estar instalado e rodando (ícone da baleia na barra de tarefas).
2.  **Node.js**: Versão 20 ou superior.

---

## 🛠️ 1. Iniciando o Banco de Dados

Antes de rodar o sistema, você precisa garantir que o banco de dados PostgreSQL esteja ativo.

1.  Abra um terminal na pasta raiz do projeto (`WhatsSelf`).
2.  Execute o comando:
    ```powershell
    docker-compose up -d
    ```
    *Isso baixará e iniciará o container do PostgreSQL em segundo plano.*

---

## 🖥️ 2. Iniciando o Backend

1.  Abra um novo terminal.
2.  Navegue até a pasta do backend:
    ```powershell
    cd apps/backend
    ```
3.  (Apenas na primeira vez) Instale as dependências e crie as tabelas:
    ```powershell
    npm install
    npx prisma migrate dev
    ```
4.  Inicie o servidor:
    ```powershell
    npm run dev
    ```
    *Você verá logs indicando que o servidor rodou na porta 3001 e conectou ao banco.*

---

## 🎨 3. Iniciando o Frontend

1.  Abra **outro** terminal.
2.  Navegue até a pasta raiz (`WhatsSelf`).
3.  Inicie o frontend:
    ```powershell
    npm run dev
    ```
4.  O sistema estará acessível em: **http://localhost:5173**

---

## 🔑 4. Acessando o Sistema

1.  Abra seu navegador em **http://localhost:5173**.
2.  Faça login com as credenciais padrão (definidas no `.env`):
    *   **Email:** `admin@whatself.local`
    *   **Senha:** `admin`

> **⚠️ Importante:** Altere sua senha imediatamente após o primeiro login no menu de configurações ou perfil.

---

## 📱 5. Conectando o WhatsApp

1.  No painel lateral, clique em **Conexão** ou vá para a página inicial do Dashboard.
2.  Um **QR Code** será gerado.
3.  Abra o WhatsApp no seu celular, vá em **Aparelhos Conectados > Conectar Aparelho**.
4.  Escaneie o QR Code na tela.
5.  Aguarde o status mudar para "Conectado".

---

## 🛑 Parando o Sistema

Para parar tudo e economizar recursos:

1.  Nos terminais do Backend e Frontend, pressione `Ctrl + C`.
2.  Para parar o banco de dados:
    ```powershell
    docker-compose down
    ```

---

## 🆘 Solução de Problemas Comuns

*   **Erro de conexão com o banco:** Verifique se o Docker Desktop está rodando e se você executou `docker-compose up -d`.
*   **QR Code não aparece:** Verifique os logs do terminal do Backend. Se houver erros de "Puppeteer", certifique-se de ter o Google Chrome instalado.
