# Local Development Setup

## Prerequisites

- Node.js >= 18
- npm >= 9
- Cloudflare Wrangler CLI (installed as dev dependency)
- Git

## Quick Start

```bash
# 1. Install dependencies
npm run install:all

# 2. Start local development (frontend + worker)
npm run dev

# 3. In another terminal, run tests
npm run test
```

## Detailed Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd Gupta_Chat
npm run install:all
```

### 2. Environment Variables

#### Frontend (`.env` in `frontend/`)

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8787/api
VITE_WS_URL=ws://localhost:8787/ws
```

#### Worker (`.env` in `worker/`)

Create `worker/.env`:

```bash
ENVIRONMENT=development
```

**Never commit `.env` files.** Use `.env.example` as a template.

### 3. Start Local Development

The `npm run dev` command starts both frontend and worker concurrently:

- Frontend: http://localhost:5173
- Worker: http://localhost:8787

### 4. Local Wrangler Setup

The worker uses Cloudflare Wrangler for local development. Bindings are simulated locally.

To create a local D1 database (if needed):

```bash
cd worker
npx wrangler d1 create gupta-chat-db
```

Note: Wrangler v3 may prompt for a Cloudflare API token for remote operations. Local development does not require a token.

### 5. Apply Migrations

```bash
cd worker
npx wrangler d1 migrations apply gupta-chat-db --local
```

### 6. Run Tests

```bash
# Run all tests
npm run test

# Run frontend tests only
npm run test --workspace=frontend

# Run worker tests only
npm run test --workspace=worker
```

## Project Structure

```
Gupta_Chat/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── crypto/          # Encryption utilities
│   │   ├── features/        # React features/pages
│   │   ├── storage/         # IndexedDB storage
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utilities
│   │   └── websocket/       # WebSocket client
│   ├── package.json
│   └── vite.config.ts
├── worker/                   # Cloudflare Worker
│   ├── src/
│   │   ├── durable-objects/ # ChatRoom DO
│   │   ├── keys/             # Key management service
│   │   ├── messages/         # Messaging routes
│   │   ├── middleware/       # Auth, rate-limit, security headers
│   │   ├── routes/           # API and WebSocket routes
│   │   ├── users/            # User service
│   │   └── utils/            # Utilities
│   ├── migrations/           # D1 SQL migrations
│   ├── wrangler.toml
│   └── package.json
├── docs/                     # Documentation
├── phases/                   # Phase completion notes
└── package.json              # Root workspace package.json
```

## Troubleshooting

### Wrangler "No bindings found"

This is expected in local mode without a Cloudflare account. The worker will still start, but D1/R2 operations will fail. To fully test locally, configure Wrangler with a `CLOUDFLARE_API_TOKEN` and create the D1 database.

### Port Already in Use

If port 5173 (frontend) or 8787 (worker) is in use, you can specify different ports:

```bash
# Frontend
npm run dev --workspace=frontend -- --port 5174

# Worker
npm run dev --workspace=worker -- --port 8789
```

### Test Failures on Windows

If tests fail with memory errors, increase Node.js memory:

```bash
set NODE_OPTIONS=--max-old-space-size=4096
npm run test
```

## Next Steps

After local verification, see `docs/DEPLOYMENT.md` for production deployment instructions.
