# Testing Strategy

## Layers
- unit
- cryptographic
- integration
- API
- WebSocket
- file
- browser
- security
- end-to-end

## Crypto
Test key generation, session establishment, encryption/decryption, wrong keys, modified ciphertext, replay, duplicates, out-of-order delivery, ratchet advancement, session restart and identity changes.

## Files
Test images, video, GIF, PDF, DOCX, PPTX, XLSX, ZIP, empty/corrupt files, unsupported types, large files and interrupted transfers.

## Messaging
Test online/offline recipient, reconnect, duplicates, ordering, delivery/read states and disappearing messages.

## Storage
Test reload, browser restart, cache clear, conversation deletion, full local deletion, quota limits and private browsing.

## Security
Check for plaintext network traffic, secrets in requests/logs, plaintext R2 objects, authorization bypass, IDOR, XSS, injection, rate-limit bypass, malicious file handling and vulnerable dependencies.

## Acceptance flow
A creates identity -> B creates identity -> contact lookup -> verification -> secure session -> text message -> encrypted file -> disconnect/reconnect -> continue messaging -> delete local data.
