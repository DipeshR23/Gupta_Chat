# Gupta_Chat — Kilo Code Master Agent Instructions

## Mission
Build Gupta_Chat as a small, polished, security-first web application for 1-to-1 end-to-end encrypted messaging and encrypted file sharing.

## Non-negotiable rules
- Never invent cryptographic protocols or primitives.
- Never implement homemade X3DH, Double Ratchet, KDF, key exchange, or encryption when a suitable audited/established implementation is required.
- Private keys and session secrets must never be sent to the server.
- Plaintext messages and plaintext files must never be uploaded to the backend/storage.
- Inspect the repository before modifying it.
- Prefer minimal dependencies and verify maintenance, license, browser compatibility, and security posture.
- Do not expose secrets in logs, errors, source control, or client bundles.
- Do not claim "unhackable", "100% secure", "anonymous", or "zero metadata".
- If a security-critical requirement cannot be implemented safely, stop and explain the blocker.
- Do not add non-V1 features unless explicitly approved.

## Required workflow
Work in phases. Do not implement the whole application in one pass.

1. Phase 0 — feasibility, repository inspection, dependency/crypto research
2. Phase 1 — architecture and technical design
3. Phase 2 — cryptographic proof of concept
4. Phase 3 — identity and key management
5. Phase 4 — secure messaging
6. Phase 5 — encrypted file sharing
7. Phase 6 — verification and security hardening
8. Phase 7 — UI/UX polish and accessibility
9. Phase 8 — cross-browser and end-to-end testing
10. Phase 9 — deployment and production verification
11. Phase 10 — documentation and release checklist

At the end of each phase:
- run relevant tests/checks
- review security impact
- update documentation
- report completed work, risks, and remaining work
- do not silently skip failed checks

## Before implementation
Read:
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/SECURITY.md
- docs/CRYPTOGRAPHY.md
- docs/THREAT_MODEL.md
- docs/DATABASE.md
- docs/API.md
- docs/FILE_STORAGE.md
- docs/UI_UX.md
- docs/TESTING.md
- docs/BROWSER_COMPATIBILITY.md
- docs/DEPLOYMENT.md
- docs/ROADMAP.md
- docs/LIMITATIONS.md

Then inspect the actual repository and reconcile the documentation with existing code.

## Definition of done
A feature is done only when implementation, types, tests, security review, browser considerations, error handling, and documentation are complete.

## V1 scope
V1 includes:
- username-based identity
- local cryptographic identity
- 1-to-1 E2EE text messaging
- delivery/read status
- disappearing messages
- encrypted file sharing for normal document/media types
- safety-number/QR verification
- local encrypted storage
- storage cleanup and full local-data deletion
- responsive web UI
- Cloudflare deployment architecture

V1 excludes:
- voice/video calls
- group messaging
- social feed/stories
- AI chatbot
- ads
- cloud plaintext backup
- server-side plaintext search
- onion routing
- payments/crypto
- phone/email authentication
- unnecessary profile customization

## Stop conditions
Stop and request review if:
- the chosen crypto library/protocol is unsuitable for browser use
- a dependency is abandoned or insecure
- a requirement forces plaintext server access
- a browser limitation materially changes the security model
- a free-tier assumption is invalid
- a migration could destroy user data
- an implementation would weaken the stated threat model
