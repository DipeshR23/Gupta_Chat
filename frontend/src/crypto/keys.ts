/**
 * Key generation and management for Gupta_Chat
 * Uses Web Crypto API
 */

import { generateKeyPair, exportPublicKey, generateId } from './utils';

export interface IdentityKeys {
  identityKey: CryptoKeyPair;
  signedPreKey: {
    keyId: string;
    keyPair: CryptoKeyPair;
    publicKey: JsonWebKey;
  };
  oneTimePreKeys: {
    keyId: string;
    publicKey: JsonWebKey;
    consumed: boolean;
  }[];
}

/**
 * Generate a complete identity with all required keys
 */
export async function generateIdentityKeys(): Promise<IdentityKeys> {
  // Generate identity key pair (long-term)
  const identityKey = await generateKeyPair();
  
  // Generate signed pre-key (medium-term, rotated periodically)
  const signedPreKeyPair = await generateKeyPair();
  const signedPreKeyPublic = await exportPublicKey(signedPreKeyPair.publicKey);
  
  // Generate one-time pre-keys (short-term, consumed during X3DH)
  const oneTimePreKeys = [];
  for (let i = 0; i < 20; i++) {
    const keyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    oneTimePreKeys.push({
      keyId: generateId(),
      publicKey,
      consumed: false,
    });
  }
  
  return {
    identityKey,
    signedPreKey: {
      keyId: generateId(),
      keyPair: signedPreKeyPair,
      publicKey: signedPreKeyPublic,
    },
    oneTimePreKeys,
  };
}

/**
 * Get next available one-time pre-key
 */
export function getNextAvailablePreKey(
  oneTimePreKeys: IdentityKeys['oneTimePreKeys']
): { keyId: string; publicKey: JsonWebKey } | null {
  const available = oneTimePreKeys.find(key => !key.consumed);
  if (!available) return null;
  
  available.consumed = true;
  return {
    keyId: available.keyId,
    publicKey: available.publicKey,
  };
}

/**
 * Replenish one-time pre-keys when running low
 */
export async function replenishPreKeys(
  currentPreKeys: IdentityKeys['oneTimePreKeys'],
  targetCount = 20
): Promise<IdentityKeys['oneTimePreKeys']> {
  const availableCount = currentPreKeys.filter(key => !key.consumed).length;
  
  if (availableCount >= targetCount) {
    return currentPreKeys;
  }
  
  const newPreKeys = [...currentPreKeys];
  const toGenerate = targetCount - availableCount;
  
  for (let i = 0; i < toGenerate; i++) {
    const keyPair = await generateKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    newPreKeys.push({
      keyId: generateId(),
      publicKey,
      consumed: false,
    });
  }
  
  return newPreKeys;
}
