# Phase 9 — Security Audit

Goal: dedicated security verification before deployment.

Check:
- plaintext network leaks
- plaintext file uploads
- private-key exposure
- secret logs
- D1 plaintext
- R2 plaintext
- authorization
- rate limiting
- XSS
- injection
- IDOR
- WebSocket authorization
- file authorization
- replay
- identity changes
- dependency vulnerabilities
- CSP and security headers
- environment secrets

Rule:
Security failures must be fixed and retested. Do not weaken security to make tests pass.

Gate:
FULL SECURITY REVIEW.
