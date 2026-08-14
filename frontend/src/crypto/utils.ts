/**
 * Web Crypto API utilities for Gupta_Chat
 * Uses ECDH P-256 for key agreement (widely supported in browsers)
 */

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
}

export async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    data
  );
}

export async function verifySignature(
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: ArrayBuffer
): Promise<boolean> {
  try {
    return crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256',
      },
      publicKey,
      signature,
      data
    );
  } catch {
    return false;
  }
}

export async function generateSignedPreKey(
  identityPrivateKey: CryptoKey,
  keyPair: CryptoKeyPair
): Promise<{
  keyId: string;
  publicKey: JsonWebKey;
  signature: ArrayBuffer;
}> {
  const keyId = generateId();
  const publicKey = await exportPublicKey(keyPair.publicKey);
  
  // Sign the raw public key bytes
  const publicKeyBytes = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const signature = await signData(identityPrivateKey, publicKeyBytes);
  
  return {
    keyId,
    publicKey,
    signature,
  };
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    256
  );
}

export async function hkdf(
  salt: ArrayBuffer,
  inputKeyMaterial: ArrayBuffer,
  info: string,
  keyLength = 256
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    inputKeyMaterial,
    'HKDF',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: salt,
      info: encoder.encode(info),
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: keyLength },
    false,
    ['encrypt', 'decrypt']
  ).then(key => crypto.subtle.exportKey('raw', key));
}

export function generateId(): string {
  return crypto.getRandomValues(new Uint8Array(16)).reduce(
    (acc, byte) => acc + byte.toString(16).padStart(2, '0'),
    ''
  );
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}
