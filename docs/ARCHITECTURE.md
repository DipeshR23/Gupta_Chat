# Architecture

## High-level

```text
Browser
  |
  | HTTPS / WSS
  v
Cloudflare Edge
  |
  +--> Pages (frontend)
  |
  +--> Workers (API/auth/routing)
         |
         +--> Durable Objects (realtime WebSocket state)
         +--> D1 (minimal metadata)
         +--> R2 (encrypted file ciphertext)
```

## Client responsibilities
- identity generation
- session establishment
- message encryption/decryption
- file encryption/decryption
- local persistence
- verification
- storage cleanup

## Server responsibilities
- username lookup/registration
- public key/pre-key publication
- authorization
- ciphertext routing
- temporary delivery coordination
- file upload/download authorization
- rate limiting
- minimal operational metadata

## Trust boundary
Treat backend/storage as untrusted for message/file plaintext.

## Frontend structure

```text
frontend/src/
  app/
  components/
  pages/
  features/
    auth/
    identity/
    contacts/
    messaging/
    files/
    verification/
    settings/
  crypto/
  storage/
  websocket/
  api/
  hooks/
  types/
  utils/
  styles/
```

## Worker structure

```text
worker/src/
  index.ts
  routes/
  auth/
  users/
  keys/
  messages/
  files/
  websocket/
  durable-objects/
  validation/
  security/
  utils/
```

## Design rule
Cryptographic code must be isolated from UI components.
