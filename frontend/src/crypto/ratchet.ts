/**
 * Double Ratchet Protocol Implementation
 * Based on Signal's Double Ratchet specification
 * Uses Web Crypto API with AES-256-GCM and HMAC-SHA-256
 */

import {
  generateKeyPair,
  deriveSharedSecret,
  hkdf,
  generateId,
  exportPublicKey,
  importPublicKey,
} from './utils';

export interface DoubleRatchetSession {
  sessionId: string;
  contactId: string;
  rootKey: ArrayBuffer;
  sendingChainKey: ArrayBuffer;
  receivingChainKey: ArrayBuffer | null;
  sendingMessageNumber: number;
  receivingMessageNumber: number;
  sendingChainKeyIterations: number;
  receivingChainKeyIterations: number;
  skipCache: Map<string, ArrayBuffer>;
  dhRatchetKeyPair: CryptoKeyPair | null;
  dhRatchetPublicKey: JsonWebKey | null;
}

const CHAIN_KEY_LENGTH = 32;
const MAX_SKIP = 1000;

/**
 * Initialize a new Double Ratchet session
 */
export async function initializeSession(
  sharedSecret: ArrayBuffer,
  contactId: string,
  isInitiator: boolean,
  _identityKey: CryptoKeyPair,
  contactSignedPreKey?: JsonWebKey
): Promise<DoubleRatchetSession> {
  const sessionId = generateId();
  
  // Perform initial DH ratchet step
  const dhRatchetKeyPair = await generateKeyPair();
  let contactPublicKey: CryptoKey | null = null;
  
  if (contactSignedPreKey) {
    contactPublicKey = await importPublicKey(contactSignedPreKey);
  }
  
  let rootKey = sharedSecret;
  let sendingChainKey = new ArrayBuffer(CHAIN_KEY_LENGTH);
  let receivingChainKey: ArrayBuffer | null = null;
  
  if (isInitiator && contactPublicKey) {
    // Alice performs DH with Bob's signed pre-key
    const dhOutput = await deriveSharedSecret(dhRatchetKeyPair.privateKey, contactPublicKey);
    const derived = await hkdf(rootKey, dhOutput, 'DH');
    rootKey = derived.slice(0, CHAIN_KEY_LENGTH);
    sendingChainKey = derived.slice(CHAIN_KEY_LENGTH, CHAIN_KEY_LENGTH * 2);
  } else if (!isInitiator && contactPublicKey) {
    // Bob performs DH with Alice's ephemeral key (received in first message)
    receivingChainKey = new ArrayBuffer(CHAIN_KEY_LENGTH);
  }
  
  return {
    sessionId,
    contactId,
    rootKey,
    sendingChainKey,
    receivingChainKey,
    sendingMessageNumber: 0,
    receivingMessageNumber: 0,
    sendingChainKeyIterations: 0,
    receivingChainKeyIterations: 0,
    skipCache: new Map(),
    dhRatchetKeyPair,
    dhRatchetPublicKey: dhRatchetKeyPair ? await exportPublicKey(dhRatchetKeyPair.publicKey) : null,
  };
}

/**
 * Ratchet the sending chain to produce a message key
 */
export async function ratchetSendingChain(
  session: DoubleRatchetSession
): Promise<{ messageKey: ArrayBuffer; updatedSession: DoubleRatchetSession }> {
  // Derive message key from chain key
  const messageKey = await hkdf(
    new ArrayBuffer(0),
    session.sendingChainKey,
    `message-${session.sendingMessageNumber}`
  );
  
  // Advance chain key
  const newChainKey = await hkdf(
    new ArrayBuffer(0),
    session.sendingChainKey,
    'chain'
  );
  
  const updatedSession: DoubleRatchetSession = {
    ...session,
    sendingChainKey: newChainKey,
    sendingMessageNumber: session.sendingMessageNumber + 1,
    sendingChainKeyIterations: session.sendingChainKeyIterations + 1,
  };
  
  return { messageKey, updatedSession };
}

/**
 * Ratchet the receiving chain to produce a message key
 */
export async function ratchetReceivingChain(
  session: DoubleRatchetSession
): Promise<{ messageKey: ArrayBuffer; updatedSession: DoubleRatchetSession } | null> {
  if (session.receivingChainKey === null) {
    return null;
  }
  
  // Derive message key from chain key
  const messageKey = await hkdf(
    new ArrayBuffer(0),
    session.receivingChainKey,
    `message-${session.receivingMessageNumber}`
  );
  
  // Advance chain key
  const newChainKey = await hkdf(
    new ArrayBuffer(0),
    session.receivingChainKey,
    'chain'
  );
  
  const updatedSession: DoubleRatchetSession = {
    ...session,
    receivingChainKey: newChainKey,
    receivingMessageNumber: session.receivingMessageNumber + 1,
    receivingChainKeyIterations: session.receivingChainKeyIterations + 1,
  };
  
  return { messageKey, updatedSession };
}

/**
 * Perform DH ratchet step (when receiving new DH public key)
 */
export async function performDHRatchetStep(
  session: DoubleRatchetSession,
  newPublicKey: JsonWebKey
): Promise<DoubleRatchetSession> {
  const importedPublicKey = await importPublicKey(newPublicKey);
  
  // DH calculation for new root key
  const dhOutput = await deriveSharedSecret(
    session.dhRatchetKeyPair!.privateKey,
    importedPublicKey
  );
  
  const derived = await hkdf(session.rootKey, dhOutput, 'DH');
  const newRootKey = derived.slice(0, CHAIN_KEY_LENGTH);
  const newSendingChainKey = derived.slice(CHAIN_KEY_LENGTH, CHAIN_KEY_LENGTH * 2);
  
  // Generate new DH key pair
  const newKeyPair = await generateKeyPair();
  
  // DH calculation for new receiving chain
  const dhOutput2 = await deriveSharedSecret(
    newKeyPair.privateKey,
    importedPublicKey
  );
  const derived2 = await hkdf(newRootKey, dhOutput2, 'DH');
  const newRootKey2 = derived2.slice(0, CHAIN_KEY_LENGTH);
  const newReceivingChainKey = derived2.slice(CHAIN_KEY_LENGTH, CHAIN_KEY_LENGTH * 2);
  
  return {
    ...session,
    rootKey: newRootKey2,
    sendingChainKey: newSendingChainKey,
    receivingChainKey: newReceivingChainKey,
    sendingMessageNumber: 0,
    receivingMessageNumber: 0,
    sendingChainKeyIterations: 0,
    receivingChainKeyIterations: 0,
    dhRatchetKeyPair: newKeyPair,
    dhRatchetPublicKey: await exportPublicKey(newKeyPair.publicKey),
  };
}

/**
 * Skip message keys for out-of-order messages
 */
export async function skipMessageKeys(
  session: DoubleRatchetSession,
  until: number
): Promise<DoubleRatchetSession> {
  let updatedSession = session;
  
  if (session.receivingChainKey === null) {
    return session;
  }
  
  for (let i = session.receivingMessageNumber; i < until; i++) {
    if (updatedSession.skipCache.size >= MAX_SKIP) {
      throw new Error('Skip cache overflow');
    }
    
    const messageKey = await hkdf(
      new ArrayBuffer(0),
      updatedSession.receivingChainKey!,
      `message-${i}`
    );
    
    const cacheKey = `${session.contactId}-${i}`;
    updatedSession.skipCache.set(cacheKey, messageKey);
    
    const newChainKey = await hkdf(
      new ArrayBuffer(0),
      updatedSession.receivingChainKey!,
      'chain'
    );
    
    updatedSession = {
      ...updatedSession,
      receivingChainKey: newChainKey,
      receivingMessageNumber: i + 1,
      receivingChainKeyIterations: updatedSession.receivingChainKeyIterations + 1,
    };
  }
  
  return updatedSession;
}

/**
 * Encrypt a message
 */
export async function encryptMessage(
  session: DoubleRatchetSession,
  plaintext: ArrayBuffer,
  associatedData?: ArrayBuffer
): Promise<{ ciphertext: ArrayBuffer; nonce: ArrayBuffer; updatedSession: DoubleRatchetSession }> {
  const { messageKey, updatedSession } = await ratchetSendingChain(session);
  
  // Generate random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  
  // Import message key as AES-GCM key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    messageKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: associatedData || new ArrayBuffer(0),
    },
    aesKey,
    plaintext
  );
  
  return {
    ciphertext,
    nonce: nonce.buffer,
    updatedSession,
  };
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
  session: DoubleRatchetSession,
  ciphertext: ArrayBuffer,
  nonce: ArrayBuffer,
  messageNumber: number,
  associatedData?: ArrayBuffer
): Promise<{ plaintext: ArrayBuffer; updatedSession: DoubleRatchetSession }> {
  // Check skip cache first
  const cacheKey = `${session.contactId}-${messageNumber}`;
  if (session.skipCache.has(cacheKey)) {
    const messageKey = session.skipCache.get(cacheKey)!;
    session.skipCache.delete(cacheKey);
    
    const aesKey = await crypto.subtle.importKey(
      'raw',
      messageKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(nonce),
        additionalData: associatedData || new ArrayBuffer(0),
      },
      aesKey,
      ciphertext
    );
    
    return { plaintext, updatedSession: session };
  }
  
  // Ratchet receiving chain if needed
  let updatedSession = session;
  if (messageNumber > session.receivingMessageNumber) {
    updatedSession = await skipMessageKeys(session, messageNumber);
  }
  
  const result = await ratchetReceivingChain(updatedSession);
  if (!result) {
    throw new Error('No receiving chain');
  }
  
  const { messageKey } = result;
  
  // Import message key as AES-GCM key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    messageKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(nonce),
      additionalData: associatedData || new ArrayBuffer(0),
    },
    aesKey,
    ciphertext
  );
  
  return {
    plaintext,
    updatedSession: result.updatedSession,
  };
}
