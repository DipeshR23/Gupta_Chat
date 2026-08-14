/**
 * Key wrapping utilities for encrypted local storage
 * Uses PBKDF2 + AES-GCM to encrypt sensitive key material before IndexedDB storage
 */

export interface WrappedData {
  encrypted: string;
  iv: string;
  salt: string;
}

/**
 * Derive a wrapping key from a password using PBKDF2
 */
export async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with a wrapping key
 */
export async function wrapData(data: ArrayBuffer, wrappingKey: CryptoKey): Promise<WrappedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    data
  );

  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt data with a wrapping key
 */
export async function unwrapData(wrapped: WrappedData, wrappingKey: CryptoKey): Promise<ArrayBuffer> {
  const iv = base64ToArrayBuffer(wrapped.iv);
  const encrypted = base64ToArrayBuffer(wrapped.encrypted);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    wrappingKey,
    encrypted
  );
}

/**
 * Generate a device-specific wrapping key from a password
 */
export async function generateDeviceKey(password: string): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveWrappingKey(password, salt);
  return { key, salt };
}

/**
 * Helper: ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
