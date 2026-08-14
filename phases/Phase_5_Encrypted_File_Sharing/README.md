# Phase 5 — Encrypted File Sharing

Goal: securely send common files using client-side encryption.

Supported examples:
- images
- GIFs
- video clips
- PDF
- DOC/DOCX
- PPT/PPTX
- XLS/XLSX
- TXT
- ZIP
- screenshots

Flow:
Select -> validate -> random file key -> local encryption -> R2 ciphertext -> recipient downloads ciphertext -> local decryption.

Test:
- normal files
- corrupt files
- modified ciphertext
- wrong key
- unsupported type
- large files
- interrupted transfers
- expired files
- authorization failures

R2 must contain ciphertext only.

Gate:
STOP until file security and lifecycle are reviewed.
