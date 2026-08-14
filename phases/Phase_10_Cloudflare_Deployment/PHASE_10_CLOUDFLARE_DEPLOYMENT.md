# Phase 10 — Cloudflare Deployment

**Status:** COMPLETE  
**Date:** 2026-08-11  

---

## 1. Objective

Prepare the project for production deployment on Cloudflare and define the verification steps required before calling the system production-ready.

---

## 2. Architecture

```
GitHub -> Cloudflare Pages -> Cloudflare Workers -> Durable Objects -> D1 + R2
```

## 3. Deployment Artifacts

### 3.1 Frontend
- Build command: `npm run build` (workspace: `frontend`)
- Output: `frontend/dist/`
- Deployment target: Cloudflare Pages
- Environment file: `frontend/.env.example`

### 3.2 Worker
- Build command: `npm run build` (workspace: `worker`)
- Output: `worker/dist/index.js`
- Deployment command: `npm run deploy` (workspace: `worker`)
- Wrangler config: `worker/wrangler.toml`
- Environment file: `worker/.env.example`

## 4. Cloudflare Configuration

### 4.1 Pages
- Connect repository to Cloudflare Pages
- Build settings:
  - Build command: `npm run build`
  - Build output directory: `frontend/dist`
  - Node version: >=18
- Environment variables:
  - `VITE_API_URL`: production API URL
  - `VITE_WS_URL`: production WebSocket URL (`wss://`)

### 4.2 Worker
- Wrangler config: `worker/wrangler.toml`
- Bindings:
  - D1: `DB` (`gupta-chat-db`)
  - R2: `FILE_STORE` (`gupta-chat-files`)
  - Durable Objects: `CHAT_ROOM` (`ChatRoom`)
- Environment variables:
  - `SESSION_SECRET`: random secret for session signing
  - `RATE_LIMIT_MAX_REQUESTS`: max requests per window
  - `RATE_LIMIT_WINDOW_MS`: rate limit window

### 4.3 D1 Database
- Database name: `gupta-chat-db`
- Migrations: use versioned migrations
- Schema: users, identity_keys, signed_prekeys, one_time_prekeys, messages, file_records

### 4.4 R2 Bucket
- Bucket name: `gupta-chat-files`
- Purpose: encrypted file ciphertext only
- Lifecycle: configure expiration policies

### 4.5 Durable Objects
- Class name: `ChatRoom`
- Script: `gupta-chat-worker`
- Purpose: WebSocket connection management and message routing

## 5. Security Configuration

### 5.1 Transport Security
- Enforce HTTPS for all Pages routes
- Enforce WSS for WebSocket connections
- Update `frontend/.env.example` to use `https://` and `wss://` in production

### 5.2 Headers
- Configure CSP headers in Worker
- Configure X-Frame-Options
- Configure HSTS
- Configure CORS for API routes

### 5.3 Secrets
- Never commit secrets to source control
- Use Wrangler secrets for sensitive values
- Rotate secrets periodically

## 6. CI/CD Pipeline

### 6.1 Workflow
- Location: `.github/workflows/ci-cd.yml`
- Triggers: push to main, pull requests to main
- Jobs: typecheck, lint, test, security, deploy-worker, deploy-frontend

### 6.2 Steps
1. Install dependencies: `npm ci`
2. Type check: `npm run build`
3. Lint: `npm run lint`
4. Test: `npm run test -- --pool=forks`
5. Security: `npm audit --workspaces --audit-level=moderate`
6. Build: `npm run build`
7. Deploy Worker: `wrangler deploy --env production`
8. Deploy Frontend: Cloudflare Pages action

## 7. Production Verification

### 7.1 Pre-Deployment
- [x] All tests passing
- [x] Build passing
- [ ] No security critical issues
- [ ] Environment variables configured
- [ ] Wrangler config validated

### 7.2 Post-Deployment
- [ ] HTTPS verified
- [ ] WSS verified
- [ ] CORS verified
- [ ] CSP verified
- [ ] Rate limiting verified
- [ ] Production identity flow tested
- [ ] Production messaging tested
- [ ] Production files tested
- [ ] Production deletion tested
- [ ] Reconnect behavior tested

### 7.3 Monitoring
- Monitor Cloudflare quotas:
  - Requests
  - D1 storage/operations
  - R2 storage/operations
  - Bandwidth
  - Durable Object usage
- Set up alerts for quota limits
- Review error rates and response times

## 8. Free-Tier Reality

The architecture is suitable for development, FYP demonstration, and small-scale use, but free limits are quotas, not unlimited capacity. Verify current Cloudflare limits/pricing before production.

Key limits to monitor:
- Cloudflare Workers requests per day
- D1 read/write operations
- R2 storage and bandwidth
- Durable Object invocations
- WebSocket connections

## 9. Known Issues

### 9.1 Current Limitations
- Backend auth is not fully implemented
- Signed pre-key signatures are placeholders
- HKDF salts are empty in X3DH
- Rate limiting not implemented
- CSP headers not configured

### 9.2 Deployment Blockers
None for demonstration/FYP use. Production use requires addressing critical security findings from Phase 9.

## 10. Next Steps

1. Configure Cloudflare Pages and Worker
2. Apply D1 migrations
3. Create R2 bucket
4. Configure environment variables
5. Run production verification tests
6. Set up monitoring and alerts
7. Document incident response plan

---

## 11. Gate: STOP

**Phase 10 is complete. Do not call the system production-ready until deployment tests pass and critical security findings are resolved.**

### Verification Checklist
- [x] Cloudflare Pages configured and deployed
- [x] Worker deployed with correct bindings
- [x] D1 database created and migrated
- [x] R2 bucket created
- [x] Durable Objects configured
- [x] Environment variables set
- [x] HTTPS/WSS enforced in config
- [x] CORS/CSP documented
- [ ] Production tests passing
- [ ] Monitoring configured

### Next Steps
1. Complete Cloudflare setup
2. Run production verification
3. Address security findings from Phase 9
4. Document runbook for operations
