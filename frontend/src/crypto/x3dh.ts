/**
 * X3DH Key Agreement Protocol Implementation
 * Based on Signal's X3DH specification
 * Uses Web Crypto API with ECDH P-256 and ECDSA P-256
 */

import {
  generateKeyPair,
  generateSigningKeyPair,
  generateSignedPreKey,
  deriveSharedSecret,
  hkdf,
  generateId,
  exportPublicKey,
  importPublicKey,
  concatBuffers,
  verifySignature,
} from './utils';

export interface X3DHKeyBundle {
  identityKey: CryptoKeyPair;
  identitySigningKey: CryptoKeyPair;
  signedPreKey: {
    keyId: string;
    keyPair: CryptoKeyPair;
    publicKey: JsonWebKey;
    signature: ArrayBuffer;
  };
  oneTimePreKeys: {
    keyId: string;
    publicKey: JsonWebKey;
    consumed: boolean;
  }[];
}

export interface X3DHResult {
  sharedSecret: ArrayBuffer;
  associatedData: ArrayBuffer;
}

/**
 * Generate a new X3DH identity
 */
export async function generateIdentity(): Promise<X3DHKeyBundle> {
  const identityKey = await generateKeyPair();
  const identitySigningKey = await generateSigningKeyPair();
  
  // Generate signed pre-key
  const signedPreKeyPair = await generateKeyPair();
  
  // Sign the signed pre-key with identity signing key
  const signedPreKey = await generateSignedPreKey(identitySigningKey.privateKey, signedPreKeyPair);
  
  // Generate one-time pre-keys
  const oneTimePreKeys = [];
  for (let i = 0; i < 10; i++) {
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
    identitySigningKey,
    signedPreKey: {
      ...signedPreKey,
      keyPair: signedPreKeyPair,
    },
    oneTimePreKeys,
  };
}

/**
 * Verify a signed pre-key signature using the claimed identity public key
 */
export async function verifySignedPreKey(
  identityPublicKey: CryptoKey,
  signedPreKeyPublicKey: JsonWebKey,
  signature: ArrayBuffer
): Promise<boolean> {
  const publicKey = await importPublicKey(signedPreKeyPublicKey);
  const publicKeyBytes = await crypto.subtle.exportKey('raw', publicKey);
  return verifySignature(identityPublicKey, signature, publicKeyBytes);
}

/**
 * Initialize X3DH as initiator (Alice)
 */
export async function initX3DH(
  identityKey: CryptoKey,
  signedPreKey: JsonWebKey,
  oneTimePreKey?: JsonWebKey,
  responderIdentityKey?: JsonWebKey,
  signedPreKeySignature?: ArrayBuffer
): Promise<X3DHResult> {
  // Generate ephemeral key pair
  const ephemeralKey = await generateKeyPair();
  
  // Import public keys
  const signedPreKeyPublic = await importPublicKey(signedPreKey);
  const responderIdentityPublic = responderIdentityKey 
    ? await importPublicKey(responderIdentityKey) 
    : null;
  const oneTimePreKeyPublic = oneTimePreKey 
    ? await importPublicKey(oneTimePreKey) 
    : null;
  
  // Verify signed pre-key signature if provided
  if (signedPreKeySignature && responderIdentityPublic) {
    const signatureValid = await verifySignedPreKey(
      responderIdentityPublic,
      signedPreKey,
      signedPreKeySignature
    );
    if (!signatureValid) {
      throw new Error('Signed pre-key signature verification failed');
    }
  }
  
  // Perform DH calculations
  const dh1 = responderIdentityPublic
    ? await deriveSharedSecret(identityKey, responderIdentityPublic)
    : new ArrayBuffer(0);
  
  const dh2 = await deriveSharedSecret(ephemeralKey.privateKey, signedPreKeyPublic);
  
  const dh3 = responderIdentityPublic
    ? await deriveSharedSecret(ephemeralKey.privateKey, responderIdentityPublic)
    : new ArrayBuffer(0);
  
  const dh4 = oneTimePreKeyPublic
    ? await deriveSharedSecret(ephemeralKey.privateKey, oneTimePreKeyPublic)
    : new ArrayBuffer(0);
  
  // Concatenate DH outputs
  const dhOutput = concatBuffers(dh1, dh2, dh3, dh4);
  
  // Derive shared secret via HKDF with random salt
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  const associatedData = concatBuffers(
    await exportPublicKey(identityKey).then(() => {
      // Convert JWK to raw bytes for associated data
      return new ArrayBuffer(0);
    }),
    responderIdentityPublic 
      ? new ArrayBuffer(0) // Placeholder
      : new ArrayBuffer(0)
  );
  
  const sharedSecret = await hkdf(salt.buffer, dhOutput, 'X3DH');
  
  return {
    sharedSecret,
    associatedData,
  };
}

/**
 * Initialize X3DH as responder (Bob)
 */
export async function respondX3DH(
  identityKey: CryptoKey,
  signedPreKeyPrivateKey: CryptoKey,
  oneTimePreKeyPrivateKey?: CryptoKey,
  initiatorIdentityKey?: JsonWebKey,
  initiatorEphemeralKey?: JsonWebKey
): Promise<X3DHResult> {
  // Import initiator's public keys
  const initiatorIdentityPublic = initiatorIdentityKey
    ? await importPublicKey(initiatorIdentityKey)
    : null;
  const initiatorEphemeralPublic = initiatorEphemeralKey
    ? await importPublicKey(initiatorEphemeralKey)
    : null;
  
  // Perform DH calculations (reverse of initiator)
  const dh1 = initiatorIdentityPublic
    ? await deriveSharedSecret(signedPreKeyPrivateKey, initiatorIdentityPublic)
    : new ArrayBuffer(0);
  
  const dh2 = initiatorIdentityPublic
    ? await deriveSharedSecret(identityKey, initiatorIdentityPublic)
    : new ArrayBuffer(0);
  
  const dh3 = initiatorEphemeralPublic
    ? await deriveSharedSecret(signedPreKeyPrivateKey, initiatorEphemeralPublic)
    : new ArrayBuffer(0);
  
  const dh4 = oneTimePreKeyPrivateKey && initiatorEphemeralPublic
    ? await deriveSharedSecret(oneTimePreKeyPrivateKey, initiatorEphemeralPublic)
    : new ArrayBuffer(0);
  
  // Concatenate DH outputs
  const dhOutput = concatBuffers(dh1, dh2, dh3, dh4);
  
  // Derive shared secret via HKDF with random salt
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  const sharedSecret = await hkdf(salt.buffer, dhOutput, 'X3DH');
  
  return {
    sharedSecret,
    associatedData: new ArrayBuffer(0),
  };
}
