# Public Deployment Checklist

## Pre-Deployment Verification

- [ ] All tests pass: `npm run test`
- [ ] Frontend build passes: `npm run build --workspace=frontend`
- [ ] Worker build passes: `npm run build --workspace=worker`
- [ ] No TypeScript errors: `tsc --noEmit`
- [ ] Security audit complete: see `phases/Phase_9_Security_Audit/PHASE_9_SECURITY_AUDIT.md`
- [ ] Dependency audit reviewed: `npm audit`

## Cloudflare Account Setup

- [ ] Cloudflare account created and verified
- [ ] Workers, D1, R2, and Pages enabled
- [ ] API token created with appropriate permissions:
  - Account: Cloudflare Workers:Edit
  - Account: Cloudflare D1:Edit
  - Account: Cloudflare R2:Edit
  - Account: Cloudflare Pages:Edit

## Production Resource Provisioning

- [ ] Production D1 database created: `gupta-chat-db`
- [ ] Production R2 bucket created: `gupta-chat-files`
- [ ] `worker/wrangler.toml` updated with production `database_id`
- [ ] D1 migrations applied: `wrangler d1 migrations apply gupta-chat-db --remote`

## Frontend Deployment

- [ ] `frontend/.env` configured with production worker URL
- [ ] Frontend built: `npm run build --workspace=frontend`
- [ ] Deployed to Cloudflare Pages
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS verified

## Worker Deployment

- [ ] Worker built: `npm run build --workspace=worker`
- [ ] Worker deployed: `wrangler deploy`
- [ ] Worker URL verified
- [ ] WebSocket endpoint accessible via `wss://`
- [ ] Health check endpoint responds

## Post-Deployment Verification

- [ ] Create test user account
- [ ] Verify user registration flow
- [ ] Verify login/session token flow
- [ ] Verify contact search
- [ ] Verify message send/receive
- [ ] Verify file upload/download
- [ ] Verify identity verification flow
- [ ] Verify security headers present in responses
- [ ] Verify rate limiting responds with 429 when exceeded
- [ ] Verify WebSocket connection with token auth

## Security Hardening

- [ ] Review and remove any debug logging
- [ ] Verify CSP headers are not too permissive
- [ ] Verify HTTPS/WSS enforced
- [ ] Verify authentication required for protected routes
- [ ] Verify replay protection active
- [ ] Verify input validation on all endpoints

## Monitoring & Observability

- [ ] Enable Cloudflare Analytics
- [ ] Set up error tracking (if applicable)
- [ ] Configure rate limit alerts
- [ ] Set up uptime monitoring

## Documentation

- [ ] Update README with production URLs
- [ ] Update `docs/DEPLOYMENT.md` with final production details
- [ ] Document incident response plan
- [ ] Document backup/restore procedures

## Launch

- [ ] Final security review
- [ ] Stakeholder approval
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Announce deployment
