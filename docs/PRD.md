# Product Requirements Document

## Product
Gupta_Chat

## Goal
Create a small, polished, professional web-based secure communication system focused only on:
1. 1-to-1 encrypted text messaging
2. Client-side encrypted file sharing

## Identity
- username only
- no phone number
- no email required
- browser-generated cryptographic identity
- private keys remain client-side

## Messaging
- 1-to-1 E2EE
- X3DH-compatible session establishment using an established implementation
- Double Ratchet using an established implementation
- sent/delivered/read states
- disappearing messages: off, 1 hour, 1 day, 1 week, custom

## Files
Support normal media/documents such as images, video clips, GIFs, PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, ZIP and screenshots.
- encrypt client-side
- AES-256-GCM for file content where appropriate
- random per-file key
- ciphertext only in R2
- opaque storage object IDs
- local decryption
- avoid unnecessary plaintext copies

## Verification
- safety number/fingerprint
- QR comparison
- verified/unverified state
- identity-change warning

## Local data
Use IndexedDB for application data.
Provide:
- storage usage estimate
- clear cache
- delete conversation
- delete all local data

## Server
Server handles routing, key publication, authorization, temporary delivery, metadata and encrypted file objects.
Server must not decrypt messages/files or receive private keys.

## Non-goals
No calls, groups, stories, social feeds, AI, ads, plaintext backups, server-side plaintext search, onion routing, payment features, phone/email login.

## Success criteria
The V1 is small, stable, cross-platform, security-focused, transparent about limitations, and deployable on the chosen Cloudflare architecture.
