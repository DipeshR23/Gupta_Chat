# Deployment

## Local Development

See [LOCAL_SETUP.md](../LOCAL_SETUP.md) for detailed local development setup.

Quick start:
```bash
npm run install:all
npm run dev
```

This starts:
- Frontend: http://localhost:5173
- Worker: http://localhost:8787

## Architecture

```text
GitHub -> Cloudflare Pages -> Cloudflare Workers -> Durable Objects -> D1 + R2
```

## Prerequisites

- Cloudflare account with Workers, D1, R2, and Pages enabled
- Wrangler CLI v4+ (`npm install -g wrangler`)
- Node.js 18+ and npm

## Environment Variables

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=https://gupta-chat-worker.your-account.workers.dev/api
VITE_WS_URL=wss://gupta-chat-worker.your-account.workers.dev/ws
```

### Worker (`worker/.env`)

```bash
ENVIRONMENT=production
```

Never commit `.env` files. Use `.env.example` as a template.

## Frontend

Build with:
```bash
npm run build
```

Deploy static frontend through Cloudflare Pages, connecting to your Git repository.

## Worker

### Local Development

```bash
cd worker
npm install
npx wrangler dev --port 8787
```

The worker expects the following local bindings in `wrangler.toml`:
- `DB`: D1 database `gupta-chat-db`
- `FILE_STORE`: R2 bucket `gupta-chat-files-dev`
- `CHAT_ROOM`: Durable Object `ChatRoom`

Apply local D1 migrations:
```bash
npx wrangler d1 migrations apply gupta-chat-db --local
```

### Production Deployment

1. Create production D1 database:
```bash
npx wrangler d1 create gupta-chat-db
```

2. Create production R2 bucket:
```bash
npx wrangler r2 bucket create gupta-chat-files
```

3. Update `worker/wrangler.toml` with the production `database_id` from step 1.

4. Apply migrations:
```bash
npx wrangler d1 migrations apply gupta-chat-db --remote
```

5. Deploy worker:
```bash
cd worker
npm run build
npx wrangler deploy
```

## D1

Schema migrations are versioned under `worker/migrations/`. Never make unsafe manual production schema changes.

Current tables:
- `users`
- `identity_keys`
- `signed_prekeys`
- `one_time_prekeys`
- `sessions`
- `messages`
- `file_records`

## R2

Dedicated bucket `gupta-chat-files` for encrypted file ciphertext. Configure lifecycle/expiration policies in the Cloudflare dashboard.

## WebSocket

Worker enforces `wss://` for all WebSocket upgrades. Frontend must use `VITE_WS_URL` with `wss://` in production.

WebSocket authentication uses Bearer tokens:
- Pass `?token=<session_token>` as a query parameter, or
- Include `Authorization: Bearer <token>` header

## Security

Worker applies the following headers to all responses:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

Rate limiting is enforced in-memory per client IP (100 requests/minute).

## CI/CD

Recommended pipeline:
1. Install dependencies
2. Typecheck (`tsc --noEmit`)
3. Lint
4. Tests (`vitest run`)
5. Security/dependency checks (`npm audit`)
6. Build frontend and worker
7. Deploy worker with `wrangler deploy`
8. Deploy frontend to Cloudflare Pages

## Free-tier Reality

The architecture is suitable for development, FYP demonstration, and small-scale use, but free limits are quotas, not unlimited capacity. Verify current Cloudflare limits/pricing before production. Monitor requests, D1, R2 storage/operations, bandwidth, and Durable Object usage.
