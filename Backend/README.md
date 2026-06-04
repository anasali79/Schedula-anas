# 🚀 Schedula Backend

A simple **NestJS** backend server for the Schedula doctor booking app.

---

## 📸 Screenshot

![Hello World Response](../Screenshot/Screenshot 2026-06-04 155720.jpg)

> Server running on `http://localhost:3000` — returns `Hello World!`

---

## 🗂️ ER Diagram

![ER Diagram](../ER-Diagram/ER-diagram.png)

---

## 📁 Project Structure

```
Backend/
└── src/
    ├── main.ts            ← Server entry point (port 3000)
    ├── app.module.ts      ← Root module
    ├── app.controller.ts  ← GET / route
    └── app.service.ts     ← Returns "Hello World!"
```

---

## ⚙️ Setup & Run

### 1. Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org/) (v18 or above)
- [npm](https://www.npmjs.com/)

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run start:dev
```

> Server will start on **http://localhost:3000**  
> Watch mode enabled — auto restarts on file changes ♻️

### 4. Test in Browser or Postman

Open your browser and go to:

```
http://localhost:3000
```

You should see:

```
Hello World!
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start server (production) |
| `npm run start:dev` | Start server (watch mode) |
| `npm run start:prod` | Start compiled production build |
| `npm run build` | Build the project |

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Runtime**: Node.js
