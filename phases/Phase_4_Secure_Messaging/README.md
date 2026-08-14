# Phase 4 — Secure 1-to-1 Messaging

Goal: implement encrypted messaging on the validated crypto foundation.

Features:
- contact lookup
- conversation creation
- session establishment
- encrypted messages
- sent/delivered/read states
- disappearing messages
- reconnect
- offline recipient handling
- duplicate handling
- out-of-order handling
- failed delivery handling

Data rule:
Plaintext message content remains client-side. Server routes ciphertext only.

Test with multiple browsers and separate identities.

Gate:
All messaging tests must pass before file sharing.
