# Cryptography Specification

## Identity
The client generates:
- Identity Key
- Signed Pre-Key
- One-Time Pre-Keys

Only public key material needed for discovery/session setup may reach the server.

## Session establishment
Use an established X3DH-compatible implementation/specification. Do not implement a custom handshake.

## Messaging
Use an established Double Ratchet implementation/specification.
Required properties:
- forward secrecy
- break-in recovery
- message-key evolution
- out-of-order handling
- replay/duplicate handling

## Files
Use AES-256-GCM for file content where appropriate.
For every file:
1. generate a fresh random file key
2. encrypt locally
3. upload ciphertext only
4. transmit the file-key material only through the authenticated encrypted channel
5. decrypt locally

## Key lifecycle
Must define and test:
- signed-pre-key rotation
- one-time pre-key replenishment
- identity-key persistence
- identity-key change warning
- old-session behavior
- session restart

## Library decision gate
Before coding, Kilo Code must verify exact library/version, browser compatibility, license, maintenance, test vectors, security history and runtime requirements.
If no safe browser-compatible implementation is available, stop.

## Web Crypto
Use Web Crypto API where appropriate, but do not substitute it for protocol components it does not safely provide.
