# Security Requirements

## Core
- E2EE for 1-to-1 messages
- client-side file encryption
- private keys never leave device
- authenticated encryption
- forward secrecy and break-in recovery through an established ratchet protocol
- identity verification
- replay/duplicate/out-of-order handling

## Never
- send plaintext messages to server
- upload plaintext files
- store private keys server-side
- log plaintext or secrets
- invent cryptographic primitives/protocols
- expose secrets in frontend bundles

## Web security
Use:
- HTTPS/WSS
- CSP
- secure HTTP headers
- strict input validation
- authorization
- rate limiting
- dependency auditing
- safe environment variables
- minimal third-party scripts

## Honest claims
Allowed: E2EE, client-side encrypted files, server cannot normally decrypt content, forward-secret architecture when correctly implemented.
Do not claim: unhackable, anonymous, 100% secure, zero metadata, screenshot-proof, malware-proof.

## Logging
Never log plaintext messages/files, private keys, file keys, session secrets or ratchet state.
