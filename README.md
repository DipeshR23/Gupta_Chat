# Gupta_Chat

Security-first, web-based 1-to-1 end-to-end encrypted messaging and encrypted file sharing.

## Core principle

Plaintext remains on the user's device whenever possible.

```text
User A -> client-side encryption -> ciphertext -> server/storage -> ciphertext -> client-side decryption -> User B
```

## Tech stack

- Frontend: React + TypeScript + Vite
- Crypto: Web Crypto API
- Storage: IndexedDB
- Backend: Cloudflare Workers
- Realtime: Cloudflare Durable Objects + WebSocket
- Database: Cloudflare D1
- File storage: Cloudflare R2
- Hosting: Cloudflare Pages
- CI/CD: GitHub Actions

## Repository structure

- `frontend/` — React app, UI, crypto, storage, tests
- `worker/` — Cloudflare Worker, Durable Objects, routes, services
- `docs/` — product, security, architecture, and testing docs
- `phases/` — phase completion notes and checklists

## Development

See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed local development setup.

```bash
# install
npm run install:all

# dev
npm run dev

# build
npm run build

# test
npm run test

# lint
npm run lint
```

## Production deployment

See `docs/DEPLOYMENT.md` and `phases/Phase_10_Cloudflare_Deployment/PHASE_10_CLOUDFLARE_DEPLOYMENT.md`.

## Status

See `phases/Phase_11_Final_Release/PHASE_11_RELEASE.md` and `phases/Phase_11_Final_Release/PHASE_11_CHECKLIST.md`.

## Local Development

See [LOCAL_SETUP.md](LOCAL_SETUP.md) for step-by-step local setup instructions.

Quick start:
```bash
npm run install:all
npm run dev
```

## Security

See `docs/SECURITY.md`, `docs/CRYPTOGRAPHY.md`, and `docs/THREAT_MODEL.md`.

## Important

This repo includes implementation scaffolding and documentation. Some protocol pieces are still placeholders pending Phase 9 security fixes. Do not treat the system as production-ready until the release checklist is completed.
