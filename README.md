# FinTrack - Real-Time Personal Finance Tracker

A full-stack, real-time MERN personal finance application designed for tracking transactions, visualizing income vs. expenses, and managing financial budgets with instant multi-client synchronization.

---

## 📋 Mini Project Evaluation Checklist & Demonstration Guide

This repository completely implements all requirements for the Mini Project Evaluation:

| Requirement | Implementation Files | How to Demonstrate |
|---|---|---|
| **1. Frontend with Tailwind** | `frontend/src/App.jsx`<br>`frontend/src/index.css`<br>`frontend/vite.config.js` | Show the responsive dashboard UI styled using Tailwind CSS v4 utility classes (charts, modal dialogs, status badges, grid/flex layouts). |
| **2. React & State Management** | `frontend/src/context/AuthContext.jsx`<br>`frontend/src/context/SocketContext.jsx`<br>`frontend/src/context/TransactionContext.jsx` | Open React DevTools or show code: global state is decoupled using React Context API + custom hooks (`useAuth`, `useSocket`, `useTransactions`), eliminating prop-drilling. |
| **3. Backend REST API** | `backend/server.js`<br>`backend/routes/transactionRoutes.js`<br>`backend/routes/authRoutes.js` | Demonstrate full CRUD REST endpoints: `GET`, `POST`, `PUT`, `DELETE` on `/api/transactions`, plus `/api/auth/register`, `/api/auth/login`, and `/api/auth/me`. |
| **4. MongoDB & Mongoose** | `backend/models/transaction.js`<br>`backend/models/User.js` | Show Mongoose schemas, data types, references (`ObjectId` linking transactions to users), pre-save hashing hooks, and MongoDB Atlas connection. |
| **5. Data Validation** | `backend/middleware/validator.js`<br>`frontend/src/components/AuthModal.jsx` | Show `express-validator` rules for registration, login, and transaction payloads with HTTP 400 error responses and client-side form validation. |
| **6. Authentication & Authorization** | `backend/middleware/auth.js`<br>`backend/routes/authRoutes.js`<br>`backend/models/User.js` | Register/Login in the UI. Inspect `localStorage` for JWT `fintrack_token`. Demonstrate protected routes and `Authorization: Bearer <token>` headers. |
| **7. Real-Time Features (Socket.IO)** | `backend/server.js`<br>`frontend/src/context/SocketContext.jsx`<br>`frontend/src/context/TransactionContext.jsx` | **Live Demo:** Open the app in two side-by-side browser tabs. Add or delete a transaction in Tab 1 — Tab 2 updates instantly without page refresh! |
| **8. Docker** | `backend/Dockerfile`<br>`frontend/Dockerfile`<br>`frontend/nginx.conf`<br>`docker-compose.yml` | Run `docker-compose up --build` to launch MongoDB, Node backend, and Nginx React frontend in isolated containers. |
| **9. DevOps & Deployment** | `.github/workflows/ci.yml`<br>`render.yaml`<br>`frontend/vercel.json` | Show GitHub Actions CI pipeline testing backend syntax, building Vite production bundles, and building Docker containers on git push. |

---

## 🛠️ Architecture Overview

```
+-------------------------------------------------------------+
|                      React Frontend (Vite)                  |
|  - Tailwind CSS v4 Styling                                  |
|  - State: AuthContext, SocketContext, TransactionContext    |
|  - Real-Time: Socket.IO Client                              |
+------------------------------+------------------------------+
                               |  HTTP (REST) / WebSockets
                               v
+-------------------------------------------------------------+
|                     Node.js / Express Backend               |
|  - Express REST API (/api/auth, /api/transactions)          |
|  - JWT Authentication & express-validator Middleware        |
|  - Socket.IO Server (event broadcaster)                     |
+------------------------------+------------------------------+
                               |  Mongoose ODM
                               v
+-------------------------------------------------------------+
|                      MongoDB Database                       |
|  - Users Collection                                         |
|  - Transactions Collection (scoped to Users)                |
+-------------------------------------------------------------+
```

---

## 🚀 Quick Start (Running Locally)

### 1. Prerequisites
- Node.js (v18+ or v20+)
- MongoDB Atlas account (or local MongoDB)

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 🐳 Running with Docker

Run the complete multi-container application stack with a single command:

```bash
docker-compose up --build
```

- **Frontend (Nginx + React SPA):** `http://localhost:3000`
- **Backend (Express + Socket.IO):** `http://localhost:5000`
- **MongoDB:** `localhost:27017`

To stop:
```bash
docker-compose down
```

---

## 📡 REST API Reference

### Authentication Endpoints
- `POST /api/auth/register` - Create user account (Body: `name`, `email`, `password`)
- `POST /api/auth/login` - Authenticate user & get JWT token (Body: `email`, `password`)
- `GET /api/auth/me` - Get profile of authenticated user (`Authorization: Bearer <token>`)

### Transaction Endpoints
- `GET /api/transactions` - Get transactions (Supports `?type=`, `?category=`, `?search=`)
- `GET /api/transactions/:id` - Get transaction details by ID
- `POST /api/transactions` - Create transaction (Body: `title`, `amount`, `type`, `category`, `date`)
- `PUT /api/transactions/:id` - Update existing transaction
- `DELETE /api/transactions/:id` - Delete transaction

---

## ⚡ Real-Time Events (Socket.IO)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `transaction:created` | Server -> Client | `transaction` object | Broadcast to all connected clients when a transaction is added |
| `transaction:updated` | Server -> Client | `transaction` object | Broadcast when a transaction is modified |
| `transaction:deleted` | Server -> Client | `{ id }` | Broadcast when a transaction is removed |

---

## 📦 DevOps & CI/CD

- **Continuous Integration (`.github/workflows/ci.yml`):**
  - Linting & syntax checking of Express models, controllers, and middlewares.
  - Production Vite bundle compilation test.
  - Multi-stage Docker build validation.
- **Deployment Manifests:**
  - `render.yaml` - Backend configuration for Render Web Services.
  - `frontend/vercel.json` - SPA rewrite rules for Vercel deployment.
