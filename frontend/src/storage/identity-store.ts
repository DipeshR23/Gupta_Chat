/**
 * Identity storage operations
 */

import { getDb, closeDb } from './db';
import { generateIdentity } from '../crypto/x3dh';
import { exportPublicKey, generateId, arrayBufferToBase64 } from '../crypto/utils';
import { deriveWrappingKey, wrapData, unwrapData } from '../crypto/key-wrapping';
import { logger } from '../utils/logger';

export interface StoredIdentity {
  id: string;
  username: string;
  usernameNormalized: string;
  publicIdentityKey: JsonWebKey;
  identitySigningPublicKey?: JsonWebKey;
  signedPreKey: {
    keyId: string;
    publicKey: JsonWebKey;
    signature: string;
  };
  oneTimePreKeys: {
    keyId: string;
    publicKey: JsonWebKey;
    consumed: boolean;
  }[];
  createdAt: string;
}

const DEVICE_WRAPPING_PASSWORD = 'Gupta_Chat_Device_Wrapping_Key_v1';
const DB_KEY_SALT = 'device_wrapping_salt';

/**
 * Get or create device wrapping key for local identity encryption
 */
async function getDeviceWrappingKey(): Promise<CryptoKey> {
  const db = await getDb();
  const saltRecord = await db.get('metadata', DB_KEY_SALT);
  
  let salt: Uint8Array;
  if (!saltRecord) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    await db.put('metadata', { key: DB_KEY_SALT, value: Array.from(salt) });
  } else {
    salt = new Uint8Array(saltRecord.value as number[]);
  }
  
  return deriveWrappingKey(DEVICE_WRAPPING_PASSWORD, salt);
}

/**
 * Serialize identity for encrypted storage
 */
function serializeIdentity(identity: StoredIdentity): string {
  return JSON.stringify(identity);
}

/**
 * Deserialize identity from encrypted storage
 */
function deserializeIdentity(data: string): StoredIdentity {
  return JSON.parse(data) as StoredIdentity;
}

/**
 * Save identity to IndexedDB with encryption
 */
export async function saveIdentity(identity: StoredIdentity): Promise<void> {
  const db = await getDb();
  const wrappingKey = await getDeviceWrappingKey();
  const plaintext = new TextEncoder().encode(serializeIdentity(identity));
  const wrapped = await wrapData(plaintext.buffer, wrappingKey);
  
  await db.put('identity', {
    id: 'encrypted_identity',
    encrypted: wrapped.encrypted,
    iv: wrapped.iv,
    salt: wrapped.salt,
  });
}

/**
 * Load identity from IndexedDB with decryption
 */
export async function loadIdentity(): Promise<StoredIdentity | undefined> {
  const db = await getDb();
  const record = await db.get('identity', 'encrypted_identity');
  
  if (!record?.encrypted) {
    return undefined;
  }
  
  try {
    const wrappingKey = await getDeviceWrappingKey();
    const wrapped = {
      encrypted: record.encrypted as string,
      iv: record.iv as string,
      salt: record.salt as string,
    };
    const plaintext = await unwrapData(wrapped, wrappingKey);
    const decrypted = new TextDecoder().decode(plaintext);
    return deserializeIdentity(decrypted);
  } catch (error) {
    logger.error('Failed to decrypt identity:', error);
    return undefined;
  }
}

/**
 * Delete identity from IndexedDB
 */
export async function deleteIdentity(): Promise<void> {
  const db = await getDb();
  await db.delete('identity', 'encrypted_identity');
  await db.delete('metadata', DB_KEY_SALT);
  await closeDb();
}

/**
 * Check if identity exists
 */
export async function hasIdentity(): Promise<boolean> {
  const db = await getDb();
  const record = await db.get('identity', 'encrypted_identity');
  return !!record && !!record.encrypted;
}

/**
 * Create a new identity with username
 */
export async function createIdentity(username: string): Promise<StoredIdentity> {
  const bundle = await generateIdentity();
  
  const identity: StoredIdentity = {
    id: generateId(),
    username,
    usernameNormalized: username.toLowerCase(),
    publicIdentityKey: await exportPublicKey(bundle.identityKey.publicKey),
    identitySigningPublicKey: bundle.identitySigningKey ? await exportPublicKey(bundle.identitySigningKey.publicKey) : undefined,
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: bundle.signedPreKey.publicKey,
      signature: arrayBufferToBase64(bundle.signedPreKey.signature),
    },
    oneTimePreKeys: bundle.oneTimePreKeys.map(key => ({
      keyId: key.keyId,
      publicKey: key.publicKey,
      consumed: key.consumed,
    })),
    createdAt: new Date().toISOString(),
  };

  await saveIdentity(identity);
  return identity;
}

/**
 * Get available one-time pre-keys for publication
 */
export async function getAvailablePreKeys(): Promise<{ keyId: string; publicKey: JsonWebKey }[]> {
  const identity = await loadIdentity();
  if (!identity) {
    return [];
  }

  return identity.oneTimePreKeys
    .filter(key => !key.consumed)
    .map(key => ({
      keyId: key.keyId,
      publicKey: key.publicKey,
    }));
}

/**
 * Mark pre-keys as consumed
 */
export async function markPreKeysConsumed(keyIds: string[]): Promise<void> {
  const identity = await loadIdentity();
  if (!identity) {
    return;
  }

  for (const keyId of keyIds) {
    const preKey = identity.oneTimePreKeys.find(key => key.keyId === keyId);
    if (preKey) {
      preKey.consumed = true;
    }
  }

  await saveIdentity(identity);
}

/**
 * Replenish one-time pre-keys
 */
export async function replenishPreKeys(): Promise<void> {
  const identity = await loadIdentity();
  if (!identity) {
    return;
  }

  const availableCount = identity.oneTimePreKeys.filter(key => !key.consumed).length;
  
  if (availableCount >= 10) {
    return; // Already have enough
  }

  // Generate new pre-keys
  const newKeys = await generateIdentity();
  
  for (const key of newKeys.oneTimePreKeys) {
    identity.oneTimePreKeys.push({
      keyId: key.keyId,
      publicKey: key.publicKey,
      consumed: false,
    });
  }

  await saveIdentity(identity);
}
