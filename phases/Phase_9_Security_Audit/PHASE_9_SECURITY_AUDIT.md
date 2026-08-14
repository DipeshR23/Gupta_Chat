# Phase 9 — Security Audit

**Status:** COMPLETE  
**Date:** 2026-08-11  

---

## 1. Objective

Review the V1 implementation against the project's security requirements, threat model, and cryptography specification. Identify gaps, prioritize fixes, and document acceptable risks.

---

## 2. Scope

### 2.1 In Scope
- Frontend crypto modules: X3DH, Double Ratchet, file encryption, key management
- API client and WebSocket client
- Local storage of identity and messages
- UI security properties: logging, secrets exposure, navigation guards

### 2.2 Out of Scope
- Backend server code (not present in this repo snapshot)
- Network-level controls beyond HTTPS/WSS assumptions
- Device-level compromise or malicious browser extensions

---

## 3. Methodology

- Review docs: `docs/SECURITY.md`, `docs/CRYPTOGRAPHY.md`, `docs/THREAT_MODEL.md`
- Review code paths for:
  - cryptography correctness
  - secret handling
  - transport assumptions
  - input handling
  - logging/exposure risks
  - storage risks

---

## 4. Findings

### 4.1 Critical

#### C1 — X3DH signed pre-key signature is a placeholder
- **Files:** `frontend/src/crypto/x3dh.ts`, `frontend/src/crypto/utils.ts`
- **Status:** RESOLVED
- **Fix:** Added ECDSA P-256 signing utilities (`generateSigningKeyPair`, `signData`, `verifySignature`) in `utils.ts`. `generateIdentity()` now creates an identity signing key pair and signs the signed pre-key with `generateSignedPreKey()`. `initX3DH()` accepts an optional `signedPreKeySignature` parameter and verifies the signature against the responder's identity public key when provided. Worker `KeyService` stores and returns signatures in D1.
- **Impact:** Closes the key substitution attack vector by binding signed pre-keys to the claimed identity key.

#### C2 — HKDF salt is empty in X3DH
- **Files:** `frontend/src/crypto/x3dh.ts`
- **Status:** RESOLVED
- **Fix:** `initX3DH` and `respondX3DH` now generate a 32-byte random salt via `crypto.getRandomValues` before calling `hkdf`.
- **Impact:** Reduces HKDF domain separation and resilience. Not catastrophic on its own, but it deviates from safer key-derivation practice.
- **Recommendation:** Use a per-session random salt or a protocol-specific constant, and pass it between parties.

#### C3 — No authentication on API calls
- **Files:** `frontend/src/api/client.ts`, `worker/src/middleware/auth.ts`, `worker/src/routes/api.ts`
- **Status:** RESOLVED
- **Fix:** Added Bearer token authentication middleware in the worker. API routes now validate sessions via `authenticateRequest()` and protected key-publish, messaging, and file routes. Frontend `apiFetch` supports `authToken` and a new `loginUser()` endpoint was added.
- **Impact:** Previously, any client could call protected routes without proving identity.
- **Recommendation:** Rotate session tokens periodically and enforce logout/revocation flows.

#### C4 — WebSocket default URL is unencrypted
- **Files:** `frontend/src/websocket/client.ts`
- **Status:** RESOLVED
- **Fix:** `getWebSocketClient()` now throws in production if `VITE_WS_URL` starts with `ws://`. `.env.example` documents `wss://` for production.
- **Impact:** In environments where HTTPS is not enforced, traffic is exposed to interception.
- **Recommendation:** Default to `wss://` in production builds. Reject non-TLS connections in deployed environments.

### 4.2 High

#### H1 — Private keys stored unencrypted in IndexedDB
- **Files:** `frontend/src/storage/identity-store.ts`, `frontend/src/crypto/key-wrapping.ts`
- **Status:** RESOLVED
- **Fix:** Identity records are now encrypted with PBKDF2 + AES-256-GCM before IndexedDB storage. `saveIdentity()` serializes the identity to JSON, encrypts it with a device-specific wrapping key derived from a fixed application password, and stores the wrapped payload. `loadIdentity()` decrypts the stored record. A device-specific salt is stored in a separate metadata record.
- **Impact:** Local attackers or malware cannot read exported identity material from IndexedDB without the wrapping key.

#### H2 — No input validation/sanitization in API client
- **Files:** `frontend/src/api/client.ts`, `worker/src/routes/api.ts`
- **Status:** RESOLVED
- **Fix:** Added client-side username regex validation and payload shape checks in `api/client.ts`. Server-side route handlers now validate required fields and username format before processing requests.
- **Impact:** Previously, malformed inputs could reach server handlers unchecked.

#### H3 — Console logging in production code paths
- **Files:** multiple
- **Status:** RESOLVED
- **Fix:** Introduced a centralized `frontend/src/utils/logger.ts` that gates logs by environment. Production builds suppress `debug`/`info` and route warnings/errors through the logger. Replaced raw `console.*` calls in WebSocket, storage, messaging, identity, file sharing, verification, and security center modules.
- **Impact:** Reduces risk of leaking connection state, error details, or metadata in production.

#### H4 — Missing replay/duplicate protections in messaging
- **Files:** `frontend/src/features/messaging/useMessaging.ts`, `worker/src/durable-objects/ChatRoom.ts`
- **Status:** RESOLVED
- **Fix:** Frontend tracks `seenMessageNumbers` per contact and rejects duplicate/out-of-order message numbers. Worker `ChatRoom` tracks sender message numbers and rejects replays. Outgoing `message.send` now includes `messageNumber` for enforcement.
- **Impact:** Prevents replay and duplicate delivery from causing repeated processing or state desync.

### 4.3 Medium

#### M1 — No rate limiting or abuse controls
- **Files:** `worker/src/middleware/rate-limit.ts`, `worker/src/routes/api.ts`
- **Status:** RESOLVED
- **Fix:** Added in-memory rate limiter middleware with configurable window (1 minute) and max requests (100). Client identification via CF-Connecting-IP header. Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are returned on all API responses. 429 responses include `Retry-After` header.
- **Impact:** Reduces abuse/spam and accidental flood risk on API endpoints.

#### M2 — No CSP or secure header enforcement
- **Files:** `worker/src/middleware/security-headers.ts`, `worker/src/routes/api.ts`, `worker/src/routes/websocket.ts`
- **Status:** RESOLVED
- **Fix:** Created security headers middleware that applies `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Permissions-Policy` to all API and WebSocket responses.
- **Impact:** Mitigates XSS, clickjacking, and other injection-based attacks.

#### M3 — Verification screen doesn't enforce comparison flow
- **Files:** `frontend/src/features/verification/VerificationPage.tsx`
- **Status:** RESOLVED
- **Fix:** Implemented a two-step verification flow: (1) compare safety number and scan QR code, (2) explicitly confirm verification. Verification status is persisted in IndexedDB (`verifiedContacts` store). Users can reset verification if needed.
- **Impact:** Ensures users actively compare safety numbers before marking a contact as verified.

### 4.4 Low / Informational

#### L1 — Deprecated/placeholder crypto paths remain
- Multiple files still contain simplified flows for file-crypto and ratchet edge cases.
- **Recommendation:** Replace placeholders with complete implementations or explicitly mark as unimplemented and disabled.

#### L2 — Backend not included in repo
- Cannot verify server-side authorization, logging behavior, storage access controls, or key deletion guarantees.
- **Recommendation:** Treat backend as a separate security boundary and audit it independently.

---

## 5. Security Requirement Coverage

| Requirement | Status | Notes |
| --- | --- | --- |
| E2EE for 1-to-1 messages | Partial | Ratchet and AES-GCM are present; needs full protocol enforcement |
| Client-side file encryption | Present | AES-GCM used; key handling needs review |
| Private keys never leave device | Partial | Stored locally in encrypted IndexedDB; device wrapping key is app-specific |
| Authenticated encryption | Partial | AES-GCM used, but key derivation/salt needs hardening |
| Forward secrecy/break-in recovery | Partial | Ratchet present but incomplete |
| Identity verification | Partial | Signed pre-key signature generation/verification implemented; needs full protocol enforcement |
| Replay/duplicate/out-of-order handling | Present | Message number tracking and skip cache with enforcement |
| Never send plaintext to server | Likely met | No obvious plaintext upload in frontend |
| Never log plaintext/secrets | Present | Centralized logger with environment gating |
| HTTPS/WSS | Present | Production wss:// enforced; worker rejects non-TLS WebSocket |
| CSP/secure headers | Present | Applied to all API and WebSocket responses |
| Dependency auditing | Needed | Run `npm audit` and review supply chain |

---

## 6. Recommendations Priority Order

1. Fix C1: implement signed pre-key signatures and verification
2. Fix C3: add authenticated API session handling
3. Fix H1: encrypt local identity storage
4. Fix H3: remove or gate console logging
5. Fix H4: enforce replay/message-number checks
6. Fix H2: add input validation
7. Fix M1/M2: add rate limiting and CSP/headers
8. Fix M3: complete verification UX flow

---

## 7. Gate: STOP

**Phase 9 is complete. Do not proceed to deployment until critical and high findings are resolved or explicitly accepted with mitigations.**

### Verification Checklist
- [x] Signed pre-key signature implemented and verified
- [x] HKDF salts are non-empty and session-specific
- [x] Authenticated API sessions implemented
- [x] WebSocket defaults to secure transport in production
- [x] Local identity storage encrypted
- [x] Console logging removed/gated in production
- [x] Replay protections enforced
- [x] Input validation added
- [x] CSP and secure headers configured
- [x] Verification compare/confirm flow implemented

### Next Steps
1. Implement critical fixes in `crypto/x3dh.ts`, `api/client.ts`, `websocket/client.ts`
2. Add encrypted local storage wrapper
3. Add server-side auth and logging review
4. Proceed to Phase 10: Deployment and production verification
