# Gupta_Chat — Implementation Master Plan

## Project Overview
Security-first, web-based 1-to-1 end-to-end encrypted messaging and encrypted file sharing system.

**Tech Stack:**
- Frontend: React + TypeScript + Vite
- Crypto: Web Crypto API + established protocol implementation
- Local Storage: IndexedDB
- Backend: Cloudflare Workers
- Realtime: Cloudflare Durable Objects
- Database: Cloudflare D1
- File Storage: Cloudflare R2
- Deployment: Cloudflare Pages + Workers

## Phase Breakdown

### Phase 0 — Research & Feasibility (CURRENT)
**Goal:** Validate project before production coding

**Tasks:**
1. Research browser-compatible X3DH/Double Ratchet implementations
2. Verify Cloudflare Workers, Durable Objects, D1, R2 capabilities and limits
3. Identify technical, security, browser, and cost risks
4. Produce feasibility report
5. Finalize dependency decisions

**Deliverables:**
- `PHASE_0_FEASIBILITY.md`
- Crypto library decision with justification
- Cloudflare capability verification
- Risk register
- Recommended architecture

**Gate:** STOP. Do not implement production crypto until feasibility is reviewed.

---

### Phase 1 — Architecture & Technical Design
**Goal:** Freeze technical design before feature implementation

**Tasks:**
1. Define frontend architecture and folder structure
2. Define Worker/API architecture
3. Define Durable Object responsibilities
4. Define D1 schema with migrations
5. Define R2 storage model
6. Define WebSocket protocol
7. Define API contracts (OpenAPI/schemas)
8. Define trust boundaries and data lifecycle
9. Define error handling strategy
10. Define environment configuration

**Deliverables:**
- Architecture diagrams
- API specification
- Database schema
- File-storage design
- Data-flow diagrams
- Updated threat model

**Gate:** STOP for architecture review.

---

### Phase 2 — Cryptography Proof of Concept
**Goal:** Validate cryptographic foundation in isolation

**Tasks:**
1. Set up crypto module with chosen library
2. Implement identity key generation
3. Implement X3DH session establishment
4. Implement Double Ratchet messaging
5. Test encryption/decryption across browser instances
6. Test security properties (modified ciphertext, wrong keys, replay, duplicates, out-of-order)
7. Test ratchet advancement and session restart
8. Document validation results

**Deliverables:**
- `PHASE_2_CRYPTO_VALIDATION.md`
- Working crypto POC code
- Test suite for crypto operations

**Gate:** SECURITY REVIEW REQUIRED.

---

### Phase 3 — Identity & Key Management
**Goal:** Implement user cryptographic identity safely

**Tasks:**
1. Username registration and uniqueness
2. Identity key generation (Web Crypto API)
3. Signed pre-key generation
4. One-time pre-key generation and management
5. Public key publication to server
6. Local private key storage (IndexedDB, encrypted)
7. Key rotation mechanisms
8. Pre-key replenishment
9. Identity change detection

**Deliverables:**
- Identity management UI
- Key management backend
- Local storage layer
- Tests for identity lifecycle

**Gate:** STOP and verify identity architecture before messaging.

---

### Phase 4 — Secure 1-to-1 Messaging
**Goal:** Implement encrypted messaging on validated crypto foundation

**Tasks:**
1. Contact lookup and discovery
2. Conversation creation
3. Session establishment using X3DH
4. Encrypted message sending/receiving
5. Double Ratchet message processing
6. Sent/delivered/read status tracking
7. Disappearing messages (off, 1h, 1d, 1w, custom)
8. Reconnect and offline recipient handling
9. Duplicate and out-of-order message handling
10. Failed delivery handling

**Deliverables:**
- Messaging UI (conversation view)
- WebSocket realtime layer
- Message queue and retry logic
- Disappearing message timers
- Comprehensive messaging tests

**Gate:** All messaging tests pass before file sharing.

---

### Phase 5 — Encrypted File Sharing
**Goal:** Securely send common files using client-side encryption

**Tasks:**
1. File selection and validation
2. Random file key generation
3. AES-256-GCM encryption (Web Crypto API)
4. R2 ciphertext upload
5. Encrypted file reference transmission
6. Recipient download authorization
7. Local decryption
8. File lifecycle management (expiration, cleanup)
9. Interrupted transfer recovery

**Deliverables:**
- File picker UI
- Encryption/decryption module
- File transfer progress UI
- R2 integration
- File security tests

**Gate:** STOP until file security and lifecycle are reviewed.

---

### Phase 6 — Verification, Local Storage & Cleanup
**Goal:** Complete user trust and local-data controls

**Tasks:**
1. Safety number/fingerprint generation and display
2. QR code generation and scanning
3. Verified/unverified state management
4. Identity change warnings
5. Storage usage estimation
6. Clear cache functionality
7. Delete conversation
8. Delete all local data
9. Identity deletion

**Deliverables:**
- Verification UI (safety number, QR)
- Security center UI
- Settings/storage management UI
- Storage cleanup functionality
- Full deletion tests

**Gate:** Security review required.

---

### Phase 7 — UI/UX Polish & Responsive Design
**Goal:** Polish working system without changing security architecture

**Tasks:**
1. Implement design system (black/off-white/military dark-gray)
2. Sharp corners, no gradients, restrained shadows
3. Monospace technical text, grotesk message text
4. Screen implementations (welcome, identity, contacts, conversation, file transfer, verification, security center, settings)
5. Responsive layouts (mobile, tablet, laptop, desktop)
6. Keyboard navigation and focus states
7. Screen reader labels
8. Reduced motion support
9. Message status indicators
10. File transfer progress UI

**Deliverables:**
- Complete UI for all screens
- Responsive CSS
- Accessibility improvements
- Visual polish

**Gate:** Do not redesign working security/data logic.

---

### Phase 8 — Integration & Cross-Browser Testing
**Goal:** Test entire system as one application

**Tasks:**
1. Test on Chrome, Edge, Firefox, Safari
2. Test on Android Chrome, iOS Safari/PWA
3. End-to-end flow testing
4. Offline/online and reconnect testing
5. Multiple tab testing
6. Browser restart persistence
7. Responsive layout verification
8. Performance testing

**Deliverables:**
- Browser compatibility report
- Fixed bugs
- Performance baseline

**Gate:** All critical integration tests pass.

---

### Phase 9 — Security Audit
**Goal:** Dedicated security verification before deployment

**Tasks:**
1. Network traffic analysis (no plaintext leaks)
2. Server-side data inspection (D1, R2)
3. Authorization and IDOR testing
4. XSS and injection testing
5. WebSocket security review
6. Dependency vulnerability audit
7. CSP and security headers verification
8. Secret exposure audit
9. Rate limiting verification
10. Replay attack testing

**Deliverables:**
- Security audit report
- Fixed vulnerabilities
- Security hardening documentation

**Gate:** FULL SECURITY REVIEW.

---

### Phase 10 — Cloudflare Deployment
**Goal:** Deploy to production Cloudflare infrastructure

**Tasks:**
1. Configure Cloudflare Pages
2. Configure Worker with Durable Objects
3. Configure D1 with migrations
4. Configure R2 bucket
5. Configure environment variables
6. Configure HTTPS/WSS
7. Configure CORS/CSP headers
8. Set up CI/CD pipeline
9. Verify free-tier quotas
10. Production smoke tests

**Deliverables:**
- Deployed application
- CI/CD configuration
- Deployment documentation
- Monitoring setup

**Gate:** Do not call production-ready until real deployment tests pass.

---

### Phase 11 — Final Release
**Goal:** Finalize project for real use/FYP demonstration

**Tasks:**
1. Final security review
2. Final test report compilation
3. Deployment report
4. Release checklist completion
5. Documentation updates
6. Known limitations documentation
7. Future roadmap

**Deliverables:**
- Final security review
- Test report
- Deployment report
- Release checklist
- Updated README
- Architecture documentation
- Known limitations
- Future roadmap

**Final Priority:** Security → correctness → privacy → reliability → compatibility → performance → UX → visual polish.

---

## Implementation Strategy

### Code Organization
```
D:\Gupta_Chat\
├── frontend/                    # React + Vite + TypeScript
│   ├── src/
│   │   ├── app/                 # App configuration
│   │   ├── components/          # Shared UI components
│   │   ├── pages/               # Page components
│   │   ├── features/            # Feature modules
│   │   │   ├── auth/
│   │   │   ├── identity/
│   │   │   ├── contacts/
│   │   │   ├── messaging/
│   │   │   ├── files/
│   │   │   ├── verification/
│   │   │   └── settings/
│   │   ├── crypto/              # Cryptographic operations
│   │   ├── storage/             # IndexedDB layer
│   │   ├── websocket/           # WebSocket client
│   │   ├── api/                 # API client
│   │   ├── hooks/               # React hooks
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Utilities
│   │   └── styles/              # Global styles
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── worker/                      # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── keys/
│   │   ├── messages/
│   │   ├── files/
│   │   ├── websocket/
│   │   ├── durable-objects/
│   │   ├── validation/
│   │   ├── security/
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml
├── migrations/                  # D1 migrations
│   └── 0001_initial.sql
├── tests/                       # Test utilities
├── docs/                        # Documentation (already exists)
├── phases/                      # Phase documentation (already exists)
├── AGENTS.md                    # Project instructions
├── README.md                    # Project overview
└── package.json                 # Root package for scripts
```

### Development Workflow
1. Work phase by phase
2. Inspect before editing
3. Keep changes modular
4. Write tests with each feature
5. Run checks after changes
6. Update documentation
7. Preserve existing working code
8. Do not add V1 non-goals
9. Report security implications honestly

---

## Next Steps
1. Begin Phase 0: Research & Feasibility
2. Research and document crypto library choices
3. Verify Cloudflare capabilities
4. Create feasibility report
5. STOP for review before proceeding to Phase 1
