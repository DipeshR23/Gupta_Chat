/**
 * File encryption utilities using AES-256-GCM
 * All file encryption is done client-side
 */

import { generateId } from './utils';

export interface EncryptedFile {
  fileId: string;
  encryptedKey: ArrayBuffer;
  nonce: ArrayBuffer;
  ciphertext: ArrayBuffer;
  originalSize: number;
  mimeType: string;
}

/**
 * Encrypt a file with AES-256-GCM
 * @param fileBuffer - Raw file data
 * @returns Encrypted file with random key
 */
export async function encryptFile(
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<EncryptedFile> {
  // Generate random file encryption key
  const fileKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Generate random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt file
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    fileKey,
    fileBuffer
  );
  
  // Export the key (in real usage, this would be encrypted for the recipient)
  const exportedKey = await crypto.subtle.exportKey('raw', fileKey);
  
  return {
    fileId: generateId(),
    encryptedKey: exportedKey,
    nonce: nonce.buffer,
    ciphertext,
    originalSize: fileBuffer.byteLength,
    mimeType,
  };
}

/**
 * Decrypt a file with AES-256-GCM
 */
export async function decryptFile(
  encryptedKey: ArrayBuffer,
  nonce: ArrayBuffer,
  ciphertext: ArrayBuffer
): Promise<ArrayBuffer> {
  // Import the key
  const key = await crypto.subtle.importKey(
    'raw',
    encryptedKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(nonce),
    },
    key,
    ciphertext
  );
  
  return plaintext;
}

/**
 * Validate file type
 */
export function isSupportedFileType(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
  ];
  
  return supportedTypes.includes(mimeType);
}

/**
 * Validate file size (max 50MB for V1)
 */
export function isSupportedFileSize(size: number): boolean {
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  return size <= MAX_SIZE;
}
