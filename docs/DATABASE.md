# Database Design

D1 stores minimal metadata only.

## users
- id
- username
- username_normalized
- created_at
- status

## identity_keys
- user_id
- public_identity_key
- key_version
- created_at

## signed_prekeys
- id
- user_id
- public_key
- signature
- created_at
- expires_at
- status

## one_time_prekeys
- id
- user_id
- public_key
- status
- created_at
- used_at

## file_records
- id
- sender_id
- recipient_id
- storage_object_id
- size
- created_at
- expires_at
- status

## Design rules
- no plaintext message-history table
- no private keys
- no session secrets
- minimize metadata
- use migrations
- define indexes and uniqueness before production
