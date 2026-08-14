# Phase 2 — Cryptography Proof of Concept

Goal: validate the cryptographic foundation in isolation before building the application around it.

Required:
- browser-compatible established X3DH-compatible implementation
- browser-compatible established Double Ratchet implementation
- Web Crypto where appropriate
- local private-key handling

Test:
1. Generate identities.
2. Publish required public/pre-key material.
3. Establish a session.
4. Encrypt a message.
5. Decrypt on another browser/device.
6. Test modified ciphertext.
7. Test wrong keys.
8. Test replay.
9. Test duplicate messages.
10. Test out-of-order messages.
11. Test ratchet advancement.
12. Test session restart.
13. Test identity change.

Rules:
- No homemade cryptographic protocol.
- No custom primitive.
- No private key sent to server.
- No plaintext sent during the POC.

Deliverable:
PHASE_2_CRYPTO_VALIDATION.md

Gate:
SECURITY REVIEW REQUIRED. Stop on any critical crypto uncertainty.
