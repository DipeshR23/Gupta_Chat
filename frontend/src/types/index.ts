export interface Identity {
  userId: string;
  username: string;
  publicIdentityKey: JsonWebKey;
  signedPreKey: {
    keyId: string;
    publicKey: JsonWebKey;
  };
  oneTimePreKeys: {
    keyId: string;
    publicKey: JsonWebKey;
    consumed: boolean;
  }[];
}

export interface Contact {
  id: string;
  username: string;
  publicIdentityKey: JsonWebKey;
  signedPreKey: {
    keyId: string;
    publicKey: JsonWebKey;
    signature: string;
  };
  oneTimePreKeys: {
    id: string;
    publicKey: JsonWebKey;
  }[];
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: ArrayBuffer;
  nonce: ArrayBuffer;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  plaintext?: string;
  disappearingTtl?: number;
}

export interface SessionState {
  sessionId: string;
  contactId: string;
  rootKey: ArrayBuffer;
  sendingChainKey: ArrayBuffer;
  receivingChainKey: ArrayBuffer;
  sendingMessageNumber: number;
  receivingMessageNumber: number;
}

export interface UserPublic {
  id: string;
  username: string;
  publicIdentityKey: JsonWebKey;
  signedPreKey: {
    keyId: string;
    publicKey: JsonWebKey;
    signature: string;
  };
  oneTimePreKeys: {
    keyId: string;
    publicKey: JsonWebKey;
  }[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface EncryptedFile {
  fileId: string;
  senderId: string;
  recipientId: string;
  encryptedKey: ArrayBuffer;
  nonce: ArrayBuffer;
  ciphertext: ArrayBuffer;
  originalSize: number;
  mimeType: string;
  filename: string;
  expiresAt: string;
  status: 'pending' | 'uploaded' | 'delivered' | 'expired';
}
