# Phase 1 — Architecture & Technical Design

**Status:** COMPLETE  
**Date:** 2026-08-10  

---

## 1. High-Level Architecture

```text
Browser (React + Vite + TypeScript)
  |
  | HTTPS / WSS
  v
Cloudflare Edge
  |
  +--> Pages (static frontend assets)
  |
  +--> Workers (API + WebSocket server)
         |
         +--> Durable Objects (realtime chat state)
         +--> D1 (minimal metadata: users, keys, file records)
         +--> R2 (encrypted file ciphertext only)
```

### Trust Boundary
- **Client:** All cryptographic operations, plaintext never leaves device unencrypted
- **Server/Storage:** Untrusted for plaintext; only sees ciphertext and public key material
- **Private keys:** Never transmitted; stored only in IndexedDB

---

## 2. Frontend Architecture

### Directory Structure
```
frontend/
├── src/
│   ├── app/
│   │   └── App.tsx                 # Root component
│   │   └── routes.tsx              # Route definitions
│   ├── components/
│   │   ├── ui/                     # Shared UI primitives
│   │   └── layout/                 # Layout components
│   ├── pages/
│   │   ├── WelcomePage.tsx
│   │   ├── IdentitySetupPage.tsx
│   │   ├── ContactsPage.tsx
│   │   ├── ConversationPage.tsx
│   │   ├── VerificationPage.tsx
│   │   └── SecurityCenterPage.tsx
│   ├── features/
│   │   ├── auth/                   # Authentication flow
│   │   ├── identity/               # Identity management
│   │   ├── contacts/               # Contact discovery
│   │   ├── messaging/              # Messaging logic
│   │   ├── files/                  # File sharing
│   │   ├── verification/           # Safety numbers, QR
│   │   └── settings/               # Storage, cleanup
│   ├── crypto/
│   │   ├── x3dh.ts                # X3DH key agreement
│   │   ├── ratchet.ts             # Double Ratchet
│   │   ├── keys.ts                # Key generation, storage
│   │   ├── file-crypto.ts         # AES-256-GCM file encryption
│   │   └── index.ts               # Public API
│   ├── storage/
│   │   ├── db.ts                  # IndexedDB setup
│   │   ├── identity-store.ts      # Identity persistence
│   │   ├── message-store.ts       # Message history
│   │   ├── contact-store.ts       # Contact cache
│   │   └── file-store.ts          # File metadata cache
│   ├── websocket/
│   │   ├── client.ts              # WebSocket connection
│   │   ├── protocol.ts            # Message framing
│   │   └── types.ts               # WebSocket event types
│   ├── api/
│   │   ├── client.ts              # Fetch API wrapper
│   │   ├── users.ts               # User endpoints
│   │   ├── keys.ts                # Key endpoints
│   │   ├── messages.ts            # Message endpoints
│   │   └── files.ts               # File endpoints
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useIdentity.ts
│   │   └── useMessaging.ts
│   ├── types/
│   │   ├── identity.ts
│   │   ├── messaging.ts
│   │   ├── files.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── bytes.ts               # Byte array utilities
│   │   ├── base64.ts              # Base64 encoding
│   │   ├── time.ts                # Time formatting
│   │   └── validation.ts          # Input validation
│   └── styles/
│       ├── global.css
│       └── variables.css
├── public/
│   └── vite.svg
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── .env.example
```

### Key Principles
- **Crypto isolation:** `src/crypto/` is pure TypeScript with no UI dependencies
- **Feature modules:** `src/features/` contains feature-specific logic and components
- **Type safety:** All API contracts defined in `src/types/`
- **No plaintext logs:** Logging utilities must redact sensitive data

---

## 3. Worker / Backend Architecture

### Directory Structure
```
worker/
├── src/
│   ├── index.ts                   # Entry point
│   ├── routes/
│   │   ├── api.ts                 # REST API router
│   │   └── websocket.ts           # WebSocket upgrade handler
│   ├── auth/
│   │   ├── middleware.ts          # Authorization checks
│   │   └── session.ts             # Session validation
│   ├── users/
│   │   ├── create.ts
│   │   ├── lookup.ts
│   │   └── validate.ts
│   ├── keys/
│   │   ├── publish.ts
│   │   ├── fetch.ts
│   │   └── consume.ts             # One-time prekey consumption
│   ├── messages/
│   │   ├── send.ts
│   │   ├── receive.ts
│   │   ├── ack.ts
│   │   └── pending.ts
│   ├── files/
│   │   ├── authorize-upload.ts
│   │   ├── complete.ts
│   │   ├── download.ts
│   │   └── ack.ts
│   ├── durable-objects/
│   │   ├── ChatRoom.ts            # Main DO class
│   │   └── types.ts
│   ├── websocket/
│   │   ├── handler.ts             # WebSocket message handler
│   │   └── broadcast.ts           # Message broadcasting
│   ├── validation/
│   │   ├── username.ts
│   │   ├── message.ts
│   │   └── file.ts
│   ├── security/
│   │   ├── rate-limit.ts
│   │   ├── sanitize.ts
│   │   └── headers.ts
│   └── utils/
│       ├── env.ts
│       ├── errors.ts
│       └── logger.ts
├── package.json
├── tsconfig.json
├── wrangler.toml
├── .env.example
└── migrations/
    └── 0001_initial.sql
```

### Durable Object Responsibilities
- **ChatRoom:** Manages WebSocket connections for a conversation
  - Tracks connected clients
  - Routes ciphertext messages between participants
  - Manages delivery/read acknowledgments
  - Handles disappearing message timers
  - Maintains message queue for offline recipients

### Worker Responsibilities
- REST API for user registration, key publication, file authorization
- WebSocket upgrade and routing to Durable Objects
- Input validation and authorization
- Rate limiting
- No message decryption or plaintext access

---

## 4. D1 Schema

### migrations/0001_initial.sql
```sql
-- Users table: minimal identity metadata
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  username_normalized TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users(username_normalized);
CREATE INDEX idx_users_status ON users(status);

-- Identity keys: public keys only
CREATE TABLE identity_keys (
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key_version),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_identity_keys_user ON identity_keys(user_id);

-- Signed pre-keys: for session establishment
CREATE TABLE signed_prekeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_signed_prekeys_user ON signed_prekeys(user_id);
CREATE INDEX idx_signed_prekeys_status ON signed_prekeys(status);

-- One-time pre-keys: consumed during X3DH
CREATE TABLE one_time_prekeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_one_time_prekeys_user ON one_time_prekeys(user_id);
CREATE INDEX idx_one_time_prekeys_status ON one_time_prekeys(status);

-- File records: minimal metadata for encrypted files
CREATE TABLE file_records (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  storage_object_id TEXT NOT NULL UNIQUE,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_file_records_recipient ON file_records(recipient_id);
CREATE INDEX idx_file_records_status ON file_records(status);
CREATE INDEX idx_file_records_expires ON file_records(expires_at);
```

### Design Rules
- No plaintext message history
- No private keys or session secrets
- Minimal metadata only
- All timestamps in ISO 8601 UTC
- Foreign keys with CASCADE delete

---

## 5. R2 Storage Model

### Bucket Structure
```
gupta-chat-files/
├── {random-uuid}              # Encrypted file object
│   └── (AES-256-GCM ciphertext)
```

### Rules
- **Object IDs:** Random UUIDs, never original filenames
- **Content:** Ciphertext only
- **Metadata:** Minimal; encrypt sensitive metadata if needed
- **Lifecycle:** Configure expiration policies
- **Access:** Only through authorized Worker endpoints

### File Upload Flow
1. Client requests upload authorization from Worker
2. Worker validates user and generates presigned URL
3. Client encrypts file locally (AES-256-GCM)
4. Client uploads ciphertext to R2
5. Client notifies Worker of completion
6. Worker creates file record in D1
7. Client sends encrypted file reference to recipient via messaging

### File Download Flow
1. Recipient requests file via Worker
2. Worker validates authorization
3. Worker streams ciphertext from R2
4. Recipient decrypts locally

---

## 6. WebSocket Protocol

### Connection
```
wss://api.example.com/ws
```

### Authentication
- WebSocket upgrade includes authorization header
- Worker validates session before upgrading
- Connection bound to authenticated user

### Message Format (JSON)
```typescript
interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
  id: string;
}
```

### Events

#### Client → Server
| Event | Description |
|-------|-------------|
| `message.send` | Send encrypted message to contact |
| `message.ack` | Acknowledge message delivery |
| `message.read` | Mark message as read |
| `presence.update` | Update online status |
| `typing.start` | Start typing indicator |
| `typing.stop` | Stop typing indicator |

#### Server → Client
| Event | Description |
|-------|-------------|
| `message.ciphertext` | Receive encrypted message |
| `message.delivered` | Message delivered to recipient |
| `message.read` | Message read by recipient |
| `message.failed` | Message delivery failed |
| `file.available` | Encrypted file available for download |
| `file.expired` | File has expired |
| `identity.changed` | Contact identity changed |
| `system.error` | System error notification |

### Security
- All messages authenticated
- Replay protection via timestamps and nonces
- Rate limiting on message send

---

## 7. REST API Contracts

### Base URL
```
https://api.example.com/api
```

### Authentication
- Bearer token in Authorization header
- Token derived from identity key pair
- Short-lived tokens with refresh

### Endpoints

#### Users
```
POST /users
  Body: { username: string }
  Returns: { id: string, username: string }
  
GET /users/:username
  Returns: { id: string, username: string, public_key: string }
```

#### Keys
```
GET /keys/:username
  Returns: {
    identity_key: string,
    signed_prekey: { public_key: string, signature: string },
    one_time_prekeys: [{ id: string, public_key: string }]
  }

POST /keys/prekeys
  Body: { signed_prekey: {...}, one_time_prekeys: [...] }
  Returns: { success: boolean }

POST /keys/prekeys/consume
  Body: { user_id: string, prekey_id: string }
  Returns: { public_key: string }
```

#### Messages
```
POST /messages
  Body: { recipient: string, ciphertext: string, nonce: string, ... }
  Returns: { id: string, timestamp: string }

GET /messages/pending
  Returns: [{ id: string, sender: string, ciphertext: string, ... }]

POST /messages/:id/ack
  Returns: { success: boolean }
```

#### Files
```
POST /files/upload-authorize
  Body: { filename: string, size: number, mime_type: string }
  Returns: { upload_url: string, file_id: string }

POST /files/complete
  Body: { file_id: string, encrypted_key: string }
  Returns: { success: boolean }

GET /files/:id
  Returns: { download_url: string, expires_at: string }

POST /files/:id/ack
  Returns: { success: boolean }
```

---

## 8. Data Lifecycle

### Message Lifecycle
1. Client encrypts message with Double Ratchet
2. Ciphertext sent via WebSocket to Worker
3. Worker routes to recipient's Durable Object
4. Recipient's DO stores in queue
5. Recipient online: DO delivers ciphertext
6. Recipient acknowledges delivery
7. Acknowledgment sent back to sender
8. Recipient marks as read
9. Disappearing message timer (if enabled) starts
10. Message deleted from DO after TTL or manual deletion

### File Lifecycle
1. Client encrypts file with AES-256-GCM
2. Client uploads ciphertext to R2
3. Client sends encrypted file reference via WebSocket
4. Recipient receives reference
5. Recipient downloads ciphertext from R2
6. Recipient decrypts locally
7. File record marked as delivered
8. File expires after configured TTL
9. R2 object deleted by lifecycle policy

### Key Lifecycle
- **Identity key:** Long-lived, stored in IndexedDB, change triggers warning
- **Signed pre-key:** Rotated periodically (e.g., weekly), published to server
- **One-time pre-keys:** Replenished when low (e.g., < 10 remaining)

---

## 9. Error Handling Strategy

### Frontend
- User-friendly error messages
- Retry with exponential backoff for network errors
- Graceful degradation for offline mode
- Clear indication of sync status

### Backend
- Consistent error response format:
  ```json
  {
    "error": {
      "code": "string",
      "message": "string",
      "details": {}
    }
  }
  ```
- HTTP status codes:
  - 400: Bad request (validation error)
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not found
  - 409: Conflict (username taken)
  - 429: Rate limited
  - 500: Internal error
  - 503: Service unavailable

### WebSocket
- Error events sent to client
- Auto-reconnect with backoff
- Message queue preserved during disconnection

---

## 10. Security Boundaries

### Client-Side
- All crypto operations in dedicated module
- Private keys never leave IndexedDB unencrypted
- No plaintext in localStorage
- No secrets in URL parameters
- CSP headers to prevent XSS

### Server-Side
- No access to plaintext messages
- No access to private keys
- No access to file encryption keys
- No decryption capabilities
- Input validation on all endpoints
- Authorization checks on all protected resources
- Rate limiting to prevent abuse

### Network
- HTTPS/WSS only
- No mixed content
- Secure WebSocket connections only
- Certificate pinning (future consideration)

---

## 11. Environment Configuration

### Frontend (.env)
```
VITE_API_URL=https://api.example.com/api
VITE_WS_URL=wss://api.example.com/ws
```

### Worker (.env)
```
# D1 binding
DB=
# R2 bucket binding
FILE_STORE=
# Session secret
SESSION_SECRET=
# Rate limit config
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Wrangler (wrangler.toml)
```toml
name = "gupta-chat-worker"
main = "src/index.ts"
compatibility_date = "2025-01-15"

[[d1_databases]]
binding = "DB"
database_name = "gupta-chat-db"
database_id = ""

[[r2_buckets]]
binding = "FILE_STORE"
bucket_name = "gupta-chat-files"

[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"
script_name = "gupta-chat-worker"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ChatRoom"]
```

---

## 12. TypeScript Types (Shared)

### Identity Types
```typescript
export interface Identity {
  userId: string;
  username: string;
  identityKey: CryptoKey;        // Private - never sent to server
  publicIdentityKey: JsonWebKey;  // Public - published to server
  signedPreKey: {
    keyId: string;
    publicKey: CryptoKey;
    signature: ArrayBuffer;
  };
  oneTimePreKeys: Array<{
    keyId: string;
    publicKey: CryptoKey;
    consumed: boolean;
  }>;
}
```

### Messaging Types
```typescript
export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: ArrayBuffer;
  nonce: ArrayBuffer;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  disappearingTtl?: number;  // seconds
}

export interface SessionState {
  sessionId: string;
  contactId: string;
  rootKey: ArrayBuffer;
  sendingChainKey: ArrayBuffer;
  receivingChainKey: ArrayBuffer;
  sendingMessageNumber: number;
  receivingMessageNumber: number;
  skipCache: Map<string, ArrayBuffer>;
}
```

### File Types
```typescript
export interface EncryptedFile {
  fileId: string;
  senderId: string;
  recipientId: string;
  storageObjectId: string;
  encryptedKey: ArrayBuffer;  // File encryption key, encrypted for recipient
  nonce: ArrayBuffer;
  size: number;
  mimeType: string;
  filename: string;  // Original filename (client-only)
  expiresAt: string;
  status: 'pending' | 'uploaded' | 'delivered' | 'expired';
}
```

---

## 13. Data Flow Diagrams

### Message Send Flow
```text
1. User A types message
2. Frontend encrypts with Double Ratchet (sending chain)
3. Frontend sends via WebSocket:
   { type: 'message.send', payload: { recipient, ciphertext, nonce, timestamp } }
4. Worker receives, validates auth
5. Worker routes to ChatRoom DO for recipient
6. DO stores in recipient's message queue
7. If recipient online: DO sends via WebSocket:
   { type: 'message.ciphertext', payload: { sender, ciphertext, nonce, timestamp } }
8. Recipient's frontend decrypts with Double Ratchet (receiving chain)
9. Recipient's frontend sends ack:
   { type: 'message.ack', payload: { message_id } }
10. DO sends delivery receipt to sender:
    { type: 'message.delivered', payload: { message_id, timestamp } }
```

### File Transfer Flow
```text
1. User A selects file
2. Frontend validates file type/size
3. Frontend generates random AES-256-GCM key
4. Frontend encrypts file locally
5. Frontend requests upload authorization from Worker
6. Worker validates, returns presigned R2 URL
7. Frontend uploads ciphertext to R2
8. Frontend encrypts file key with recipient's public key (X3DH-derived)
9. Frontend sends encrypted file reference via WebSocket:
   { type: 'file.available', payload: { file_id, encrypted_key, nonce, size, mime_type } }
10. Recipient's DO delivers message
11. Recipient decrypts file key, downloads ciphertext from R2
12. Recipient decrypts file locally
```

---

## 14. Updated Threat Model

### Assets
- Plaintext messages (client-side only)
- Plaintext files (client-side only)
- Private identity keys (IndexedDB only)
- Session/ratchet state (IndexedDB only)
- File encryption keys (transmitted only encrypted)
- Contact identity information

### Threats & Mitigations
| Threat | Mitigation |
|--------|------------|
| Server compromise | No plaintext or private keys stored server-side |
| D1 compromise | No plaintext messages; only public keys and metadata |
| R2 compromise | Ciphertext only; file keys never stored in R2 |
| Network interception | HTTPS/WSS + application E2EE |
| Key substitution | Identity verification and change warnings |
| Replay | Timestamps, nonces, message numbers in Double Ratchet |
| Duplicate/out-of-order | Double Ratchet message numbers and skip cache |
| Malicious file requests | Authorization checks, file type validation |
| Spam/abuse | Rate limiting, username uniqueness |
| Compromised device | Plaintext exposure possible; documented limitation |
| Malicious extension | Cannot be fully prevented; documented limitation |

---

## 15. Phase 1 Checklist

- [x] Frontend architecture defined
- [x] Worker/backend architecture defined
- [x] Durable Object responsibilities defined
- [x] D1 schema defined with migrations
- [x] R2 storage model defined
- [x] WebSocket protocol defined
- [x] REST API contracts defined
- [x] Trust boundaries documented
- [x] Data lifecycle documented
- [x] Error handling strategy defined
- [x] Security boundaries documented
- [x] Environment configuration documented
- [x] TypeScript types defined
- [x] Data flow diagrams documented
- [x] Threat model updated

---

## 16. Gate: STOP

**Phase 1 is complete. Do not proceed to Phase 2 until this architecture document is reviewed and approved.**

### Key Decisions to Review
1. ECDH P-256 for X3DH (no Curve25519 browser polyfill)
2. Classical X3DH + Double Ratchet (no post-quantum in V1)
3. Durable Objects for WebSocket state management
4. D1 for minimal metadata only (no plaintext messages)
5. R2 for encrypted file storage only
6. IndexedDB for all client-side persistence
7. WebSocket event schema as defined

### Questions for Review
1. Is the frontend feature-based architecture acceptable?
2. Are the D1 table schemas sufficient for V1?
3. Is the WebSocket event schema complete?
4. Should we add any additional security boundaries?
