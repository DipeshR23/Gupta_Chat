/**
 * Crypto module - Public API
 * All cryptographic operations for Gupta_Chat
 */

export { generateIdentityKeys, getNextAvailablePreKey, replenishPreKeys } from './keys';
export { generateIdentity, initX3DH, respondX3DH } from './x3dh';
export {
  initializeSession,
  ratchetSendingChain,
  ratchetReceivingChain,
  performDHRatchetStep,
  skipMessageKeys,
  encryptMessage,
  decryptMessage,
} from './ratchet';
export {
  encryptFile,
  decryptFile,
  isSupportedFileType,
  isSupportedFileSize,
} from './file-crypto';
export {
  generateKeyPair,
  generateId,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  hkdf,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  concatBuffers,
} from './utils';

export type { IdentityKeys } from './keys';
export type { DoubleRatchetSession } from './ratchet';
export type { EncryptedFile } from './file-crypto';
export type { X3DHKeyBundle, X3DHResult } from './x3dh';
