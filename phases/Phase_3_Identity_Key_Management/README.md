# Phase 3 — Identity & Key Management

Goal: implement the user's cryptographic identity safely.

Features:
- username identity
- username uniqueness
- identity-key generation
- signed pre-key
- one-time pre-keys
- public-key publication
- local private-key storage
- key rotation
- pre-key replenishment
- identity-change detection

Test:
- create identity
- reload browser
- close/reopen browser
- use another browser
- delete local data
- verify identity deletion
- test pre-key exhaustion/replenishment
- test key rotation
- test identity change warning

Gate:
STOP and verify the identity architecture before messaging.
