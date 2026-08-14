# Phase 10 — Cloudflare Deployment

Architecture:
GitHub -> Cloudflare Pages -> Workers -> Durable Objects -> D1 + R2

Tasks:
- configure Pages
- configure Worker
- configure Durable Objects
- configure D1
- configure R2
- configure environment variables
- configure HTTPS/WSS
- configure CORS/CSP
- configure migrations
- configure rate limits
- configure CI/CD
- verify current Cloudflare quotas/free limits

Production test:
- identity
- messaging
- files
- verification
- reconnect
- storage cleanup

Gate:
Do not call the system production-ready until real deployment tests pass.
