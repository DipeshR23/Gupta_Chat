# Threat Model

## Assets
- plaintext messages
- plaintext files
- private identity keys
- session/ratchet state
- file encryption keys
- contact identity information

## Threats
- server compromise
- D1 compromise
- R2 compromise
- network interception
- key substitution
- replay
- duplicate/out-of-order delivery
- malicious file requests
- spam/abuse
- compromised device
- malicious browser extension

## Expected protections
Server/D1/R2 compromise should not normally expose message/file plaintext or private keys.
Network interception is mitigated by HTTPS/WSS plus application E2EE.
Key substitution is mitigated by identity verification and change warnings.
Replay/order issues are handled by the established messaging protocol.

## Out of scope / limitations
A compromised endpoint can access plaintext.
Browser extensions can potentially observe the page.
Screenshots and external recording cannot be prevented reliably.
Metadata is not automatically hidden by E2EE.
