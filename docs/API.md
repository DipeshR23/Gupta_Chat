# API and WebSocket Specification

## Conceptual REST endpoints

### Users
POST /api/users
GET /api/users/:username

### Keys
GET /api/keys/:username
POST /api/keys/prekeys
POST /api/keys/prekeys/consume

### Messages
POST /api/messages
GET /api/messages/pending
POST /api/messages/:id/ack

### Files
POST /api/files/upload-authorize
POST /api/files/complete
GET /api/files/:id
POST /api/files/:id/ack

Exact schemas must be finalized before implementation.

## WebSocket
wss://api.example.com/ws

Possible events:
- message.ciphertext
- message.delivered
- message.read
- message.failed
- file.available
- file.expired
- identity.changed
- system.error

## Rules
- strongly typed payloads
- validate every input
- authorize every protected resource
- never expose secrets
- use safe, stable error codes
