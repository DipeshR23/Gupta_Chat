# File Storage

## Supported examples
Images, videos, GIFs, PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, ZIP and screenshots.

## Flow

```text
Select -> validate -> generate random key -> AES-256-GCM encrypt -> R2 ciphertext -> encrypted file reference -> recipient downloads -> local decrypt
```

## Storage
R2 contains ciphertext only.
Use random/opaque object IDs, never original filenames as object paths.

## Metadata
Minimize or encrypt sensitive metadata where practical.

## Lifecycle
Define:
- maximum file size
- allowed types
- upload expiration
- download authorization
- object expiration
- cleanup policy
- interrupted transfer recovery

## Memory
Avoid loading unnecessarily large files entirely into memory. Design for future chunked/streaming encryption.
