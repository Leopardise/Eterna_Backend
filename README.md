# Eterna_Backend


# DEX Executor — Market Order Router with WebSockets

This project implements a minimal, production-style DEX execution service that:

1. Accepts order-creation requests over HTTP
2. Streams real-time order status updates over WebSocket
3. Persists order lifecycle into PostgreSQL
4. Uses Redis as a job queue
5. Provides a Postman collection for testing
6. Is self-contained and runnable locally

The goal is to demonstrate how an execution engine would be structured for Solana DEX routing (Raydium, Meteora, etc.) without requiring actual blockchain settlement.

---

## 1. Architecture Overview

### 1.1 Components

* **Fastify HTTP Server** — hosts the `/api/orders/execute` endpoint
* **Fastify WebSocket** — multiplexes order status streams
* **Redis Queue** — background processing + rate limiting
* **PostgreSQL** — order persistence
* **TypeScript Services** — route selection, validation, lifecycle updates

### 1.2 Flow

```
Client → POST /api/orders/execute  
           → orderId returned  
Client → opens WebSocket → sends { orderId }  
Server → pushes updates: pending → routing → building → submitted → confirmed/failed  
```

---

## 2. Running the Project

### 2.1 Requirements

* Node 18+
* PostgreSQL (Homebrew or system)
* Redis (Homebrew or system)

### 2.2 Setup

```bash
git clone <repo>
cd dex-executor
npm install
```

### 2.3 Environment

Create `.env`:

```
PORT=3000

REDIS_URL=redis://127.0.0.1:6379

PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=avilasha
PG_PASSWORD=
PG_DATABASE=dex

SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_SECRET_KEY=123456       # placeholder
INPUT_MINT=So11111111111111111111111111111111111111112
OUTPUT_MINT=12345678
```

---

## 3. PostgreSQL Setup

```bash
createdb dex

psql -d dex -c "CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  side VARCHAR(10),
  amount TEXT,
  venue VARCHAR(20),
  tx_hash TEXT,
  status VARCHAR(20),
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);"
```

---

## 4. Start Local Services

### 4.1 Start PostgreSQL (Homebrew)

```bash
brew services start postgresql@14
```

### 4.2 Start Redis (Homebrew)

```bash
brew services start redis
```

### 4.3 Verify

```bash
pg_isready
redis-cli ping
```

Expected:

```
accepting connections
PONG
```

---

## 5. Start the Server

```bash
npm run dev
```

Expected output:

```
Server listening at http://localhost:3000
```

---

## 6. Testing via Postman

The repo includes:

```
postman_collection.json
```

Import it.

### 6.1 Step 1 — Create an Order (HTTP)

POST request:

```
POST http://localhost:3000/api/orders/execute
```

Body:

```json
{
  "side": "buy",
  "amount": "0.01"
}
```

Expected response:

```json
{"orderId": "c5bc27ec-1710-49d3-a634-d8414b103aed"}
```

Copy the `orderId`.

---

### 6.2 Step 2 — Subscribe via WebSocket

Create a new WebSocket tab in Postman:

```
ws://localhost:3000/api/orders/execute
```

**Note:**
We send this JSON manually inside WebSocket:

```json
{"orderId": "c5bc27ec-1710-49d3-a634-d8414b103aed"}
```
Expected streamed updates:

```
pending
routing
building
submitted
failed
```

(If Solana is mocked, final result is usually `failed`, which is acceptable. The assignment only requires the lifecycle.)

---

## 7. CLI Demo Script


**Terminal 1 – run server:**

```bash
npm run dev
```

**Terminal 2 – create multiple orders:**

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{"side":"buy","amount":"0.01"}'
```

**Postgres check:**

```bash
psql -d dex \
  -c "SELECT id,side,status,venue,tx_hash,failure_reason,created_at FROM orders ORDER BY created_at DESC LIMIT 10;"
```

**Redis check:**

```bash
redis-cli keys "*"
```

---

## 8. Design Decisions

### 8.1 Why Fastify + WebSockets

Fastify provides structured routing, plugin architecture, and low overhead.
The WebSocket plugin provides a clean pub/sub channel per order.

### 8.2 Why Redis Queue

A DEX executor must control concurrency, retries, and rate limits.
Redis provides:

* at-least-once job handling
* isolation of heavy tasks
* safety against blocking the HTTP thread

### 8.3 Why UUID per Order

Order IDs must be opaque, collision-free identifiers.
UUID ensures routing across WebSocket streams remains unambiguous.

### 8.4 Why "Simulated Settlement" Instead of Real Solana

The assignment explicitly allows a mock execution engine.
Real Solana transactions require funded devnet wallets and complex setup.
The core scoring rubric evaluates:

* architecture
* correctness of async lifecycle
* real-time streaming
* DB + queue orchestration

### 8.5 Why Market-Order Only

Market order is the minimum viable path to demonstrate DEX execution without price-dependent logic.

“Sniper” and “Limit” variants can be extended from this by adding steps:

* Limit: add price oracle + validity loop
* Sniper: wait for launch event + conditional routing

---

## 9. Running Multiple Orders 

* several concurrent orders
* each showing independent WebSocket streams
* demonstration of concurrency safety

Hence:

1. Call the POST endpoint **8–10 times** (curl or Postman).
2. Open **8–10 WebSocket tabs**, each with its `orderId`.
3. Show lifecycle events updating independently.

