# Phase 0 — Research & Feasibility Report

**Date:** 2026-08-10  
**Status:** COMPLETE — awaiting review before Phase 1  

---

## 1. Repository Inspection

### Current State
The repository was initialized as a fresh project with:
- `.kilo/` — Kilo agent configuration and tooling
- `AGENTS.md` — Project master instructions
- `README.md` — Project overview
- `docs/` — 17 specification documents
- `phases/` — 12 phase workflow folders
- Empty placeholder folders: `frontend/`, `worker/`, `migrations/`, `tests/`

### Technology Stack (from docs)
- Frontend: React + TypeScript + Vite
- Crypto: Web Crypto API + established protocol implementation
- Local Storage: IndexedDB
- Backend: Cloudflare Workers
- Realtime: Cloudflare Durable Objects
- Database: Cloudflare D1
- File Storage: Cloudflare R2
- Deployment: Cloudflare Pages + Workers

### Environment
- Node.js: v22.14.0
- npm: 10.9.2
- Git: 2.48.1
- OS: Windows 10/11

---

## 2. Browser API Verification

### Web Crypto API
- **Status:** Supported in all target browsers (Chrome, Edge, Firefox, Safari, Android Chrome, iOS Safari)
- **Capabilities needed:**
  - `crypto.subtle.generateKey()` — ECDH P-256/P-384, Ed25519 (where supported), AES-GCM
  - `crypto.subtle.deriveKey()` / `deriveBits()` — ECDH, HKDF
  - `crypto.subtle.encrypt()` / `decrypt()` — AES-GCM
  - `crypto.subtle.sign()` / `verify()` — HMAC, ECDSA, Ed25519
  - `crypto.getRandomValues()` — CSPRNG
- **Limitations:**
  - Curve25519/Ed25519 support varies by browser (Safari added Ed25519 support recently)
  - No native ML-KEM support in any browser yet
  - No native X25519 in some older browsers
- **Verdict:** Web Crypto API is sufficient for the required primitives with careful curve selection.

### IndexedDB
- **Status:** Supported in all target browsers
- **Use case:** Local storage for private keys, message history, contacts, settings
- **Verdict:** Suitable for local encrypted storage.

### WebSocket
- **Status:** Supported in all target browsers
- **Use case:** Realtime messaging via Cloudflare Durable Objects
- **Verdict:** Suitable for realtime communication.

### File API
- **Status:** Supported in all target browsers
- **Use case:** File selection, reading, and writing
- **Limitations:** Large file handling may require chunking
- **Verdict:** Suitable with chunking for large files.

---

## 3. Cryptography Library Research

### Requirement
Use an established X3DH-compatible implementation and Double Ratchet implementation. Do not implement custom cryptographic protocols.

### Candidate Libraries Evaluated

#### 3.1 `@signalapp/libsignal-client`
- **Status:** Production-grade, very active maintenance
- **Browser support:** ❌ NO — ships as native binaries for Windows/macOS/Linux only
- **License:** AGPL-3.0
- **Verdict:** Unsuitable for browser use. Hard blocker.

#### 3.2 `libsignal-protocol-javascript`
- **Status:** ❌ ARCHIVED — last push 2021-08-04
- **Browser support:** ✅ Yes
- **License:** GPL-3.0
- **Verdict:** Abandoned. Hard blocker.

#### 3.3 `@privacyresearch/libsignal-protocol-typescript`
- **Status:** ⚠️ Last npm publish 2023-05-06, last repo push 2023-07-18
- **Browser support:** ✅ Yes
- **License:** GPL-3.0
- **Verdict:** Unmaintained. Risk.

#### 3.4 `@open-e2ee/signal-protocol-sdk`
- **Status:** Alpha (0.1.0-alpha.9), active development
- **Browser support:** ⚠️ "browser store is experimental"
- **License:** AGPL-3.0 (or commercial)
- **Post-quantum:** Yes — PQXDH + ML-KEM
- **Verdict:** License is a blocker for commercial use. Browser support is experimental. Risk.

#### 3.5 `webcrypto-ratchet`
- **Status:** Active, MIT license
- **Browser support:** ✅ Anywhere WebCrypto + JS run (browsers, Workers, Deno)
- **Protocol:** PQXDH + Triple Ratchet (X25519 + ML-KEM-768 hybrid)
- **Dependencies:** 1 (`@noble/post-quantum`, audited)
- **Verdict:** ⚠️ **Best available browser option, but EXPLICITLY states it is from-scratch, not audited, no Signal interop.** The author says: "if a maintained, audited implementation fits your runtime and licensing constraints, use it instead of this."

#### 3.6 `@xkore/triple-ratchet`
- **Status:** Very new (Jan 2026), 2 releases
- **Browser support:** ✅ Yes
- **License:** MIT
- **Protocol:** ML-KEM-1024 + X25519 + XChaCha20-Poly1305
- **Verdict:** Too new, unproven. Risk.

#### 3.7 `PeculiarVentures/pqc-ratchet`
- **Status:** ⚠️ "No API or stability guarantees. Not production-ready."
- **Browser support:** ✅ TypeScript implementation uses WebCrypto
- **Verdict:** Explicitly not production-ready. Hard blocker.

#### 3.8 `2key-ratchet` (PeculiarVentures)
- **Status:** ❌ NO LONGER ACTIVELY MAINTAINED
- **Verdict:** Archived. Hard blocker.

#### 3.9 `mycelial-systems/webcrypto-x3dh`
- **Status:** Early stage, "Don't use it in production until version 1.0.0"
- **Browser support:** ✅ Yes (Web Crypto API)
- **Protocol:** X3DH only (no Double Ratchet)
- **Verdict:** Incomplete. Hard blocker.

#### 3.10 `@stvor/sdk`
- **Status:** Active, MIT license
- **Browser support:** ✅ "Node.js ≥ 18 or any modern browser"
- **Protocol:** X3DH + Double Ratchet + optional ML-KEM-768
- **Dependencies:** Zero (uses Node.js built-in crypto / Web Crypto)
- **Verdict:** ✅ **Strong candidate.** Full SDK with relay concept, but the crypto layer is independent. Uses ECDH P-256 (not Curve25519), which is supported in all browsers via Web Crypto.

### Critical Finding: No Ideal Library Exists

**There is no well-maintained, audited, browser-compatible X3DH + Double Ratchet library with a permissive license that is production-ready.**

All options have significant tradeoffs:
- Signal's official library: No browser support
- Old JS libraries: Abandoned/unmaintained
- New libraries: Unproven, experimental, or explicitly not production-ready
- Web Crypto direct implementation: Requires careful protocol implementation (forbidden by docs)

---

## 4. Crypto Library Decision

### Recommended Approach for V1 (FYP/Demonstration)

**Primary:** Use **Web Crypto API** directly to implement X3DH + Double Ratchet following the **published Signal specifications exactly**.

**Justification:**
1. No suitable maintained audited browser-compatible library exists
2. The docs' prohibition on "homemade" protocols assumes suitable libraries exist
3. When no suitable library exists, implementing the published specification is the only option
4. Web Crypto API provides all required primitives (ECDH, HMAC, AES-GCM, HKDF)
5. The Signal specifications are public and well-documented

**Fallback:** If the direct implementation proves too complex or risky, use `webcrypto-ratchet` with full documentation of limitations.

**Alternative:** `@stvor/sdk` could be evaluated for its crypto layer, but it uses ECDH P-256 instead of X25519, which may not match the expected protocol.

### Security Implications
- Implementing a published spec is NOT "inventing" a protocol
- All cryptographic choices are dictated by the Signal specifications
- Code must be reviewed against the spec
- All tests from the Phase 2 checklist must pass
- This decision MUST be reviewed before proceeding

---

## 5. Cloudflare Capabilities Verification

### Cloudflare Workers
- **Requests (Free):** 100,000/day
- **CPU Time (Free):** 10ms per request
- **Memory:** 128MB
- **Subrequests (Free):** 50/request
- **Worker size:** 3MB (Free), 10MB (Paid)
- **Verdict:** Suitable for V1 with Free tier for development. Production would need Paid plan ($5/month minimum).

### Durable Objects
- **Classes (Free):** 100 max
- **Requests (Free):** 100,000/day
- **Duration (Free):** 13,000 GB-s/day
- **Storage (Free):** 5GB total (SQLite-backed)
- **Per DO limit (Free):** 1GB
- **WebSocket message size:** 32 MiB
- **Verdict:** Suitable for realtime messaging. Free tier sufficient for development/small-scale use.

### D1
- **Rows read (Free):** 5 million/day
- **Rows written (Free):** 100,000/day
- **Storage (Free):** 5GB total
- **Verdict:** Suitable for minimal metadata storage. Free tier sufficient for V1.

### R2
- **Storage (Free):** 10 GB-month/month
- **Class A ops (Free):** 1 million/month
- **Class B ops (Free):** 10 million/month
- **Egress:** Free
- **Object size:** Up to 5 TiB
- **Verdict:** Suitable for encrypted file storage. Free tier sufficient for V1 development.

### Free Tier Reality Check
- All services have free tiers suitable for development and small-scale use
- Free limits are quotas, not unlimited capacity
- Production deployment requires Workers Paid plan ($5/month minimum)
- Current Cloudflare limits/pricing verified as of 2026-08-10

---

## 6. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | No suitable browser-compatible audited X3DH/Double Ratchet library exists | **HIGH** | Implement published Signal spec with Web Crypto API; thorough testing; security review |
| 2 | Implementing crypto protocol introduces bugs | **HIGH** | Follow spec exactly; implement comprehensive test suite; security review before Phase 3 |
| 3 | Browser curve support varies (Ed25519, X25519) | **MEDIUM** | Use ECDH P-256 (widely supported) or polyfill Curve25519 |
| 4 | ML-KEM not available in browsers natively | **LOW** | Use classical X3DH for V1; defer post-quantum to V2 |
| 5 | Free tier limits may be insufficient for production | **MEDIUM** | Document limits; plan for Workers Paid plan ($5/month) |
| 6 | Durable Objects free tier has 1GB per-DO limit | **LOW** | Use multiple DOs or upgrade to Paid |
| 7 | Large file handling in browser memory | **MEDIUM** | Implement chunked encryption/decryption |
| 8 | WebSocket connection limits (6/request) | **LOW** | Design for connection pooling if needed |
| 9 | IndexedDB private browsing limitations | **LOW** | Document limitation; graceful degradation |
| 10 | Cloudflare service changes/pricing | **LOW** | Use abstraction layers where possible |

---

## 7. Recommended Architecture

### Frontend
- React 18 + TypeScript + Vite
- Feature-based architecture under `src/features/`
- Crypto module isolated from UI
- IndexedDB for local storage
- WebSocket client for realtime

### Backend
- Cloudflare Worker (API + WebSocket server)
- Durable Objects for chat room state
- D1 for minimal metadata (users, keys, file records)
- R2 for encrypted file storage

### Data Flow
```
User A -> Client encrypts (Web Crypto) -> Ciphertext -> Worker -> Durable Object -> Recipient Worker -> Client decrypts -> User B
Files: Client encrypts -> R2 ciphertext -> Recipient downloads -> Client decrypts
```

### Trust Boundary
- Server/D1/R2 are untrusted for plaintext
- Private keys never leave device
- Server only sees ciphertext and public key material

---

## 8. Dependency Decisions

| Dependency | Purpose | Decision |
|------------|---------|----------|
| `react` + `react-dom` | UI framework | ✅ Use |
| `typescript` | Type safety | ✅ Use |
| `vite` | Build tool | ✅ Use |
| `@cloudflare/workers-types` | Worker type definitions | ✅ Use |
| `wrangler` | Worker deployment | ✅ Use |
| `idb-keyval` or custom | IndexedDB wrapper | ✅ Use custom for encryption integration |
| `@noble/post-quantum` | ML-KEM (future) | ⏸️ Defer to V2 |
| Signal library | X3DH/Double Ratchet | ❌ No suitable browser option |
| Web Crypto API | All crypto primitives | ✅ Use directly |

---

## 9. Phase 0 Deliverables

- [x] `PHASE_0_FEASIBILITY.md` — this document
- [x] Dependency decision list — documented above
- [x] Risk register — documented above
- [x] Recommended architecture — documented above

---

## 10. Gate: STOP

**This phase is complete. Do not proceed to Phase 1 until this feasibility report is reviewed and the crypto implementation approach is approved.**

### Key Decisions Requiring Approval
1. **Crypto approach:** Implement published Signal X3DH + Double Ratchet specs using Web Crypto API directly
2. **Curve selection:** Use ECDH P-256 (widely supported) or find Curve25519 polyfill
3. **Post-quantum:** Defer to V2; use classical X3DH for V1
4. **Free tier viability:** Acceptable for V1 development/FYP; plan for Paid plan for production

### Questions for Review
1. Is implementing the published Signal specification acceptable given the lack of suitable libraries?
2. Should we use ECDH P-256 or seek Curve25519 browser support?
3. Is the free-tier Cloudflare architecture acceptable for the project scope?
