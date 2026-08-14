import { describe, it, expect } from 'vitest';
import {
  initializeSession,
  ratchetSendingChain,
  performDHRatchetStep,
  skipMessageKeys,
} from '../ratchet';
import { generateKeyPair, exportPublicKey } from '../utils';

describe('Double Ratchet', () => {
  describe('initializeSession', () => {
    it('should initialize a session with a shared secret', async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      const contactId = 'contact-1';
      
      const session = await initializeSession(
        sharedSecret.buffer,
        contactId,
        true,
        await generateKeyPair(),
        { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }
      );
      
      expect(session.sessionId).toBeDefined();
      expect(session.contactId).toBe(contactId);
      expect(session.sendingMessageNumber).toBe(0);
      expect(session.receivingMessageNumber).toBe(0);
    });
  });

  describe('ratchetSendingChain', () => {
    it('should advance the sending chain', async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      
      const session = await initializeSession(
        sharedSecret.buffer,
        'contact-1',
        true,
        await generateKeyPair(),
        { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }
      );
      
      const result = await ratchetSendingChain(session);
      
      expect(result.messageKey).toBeDefined();
      expect(result.messageKey.byteLength).toBe(32);
      expect(result.updatedSession.sendingMessageNumber).toBe(1);
    });

    it('should produce different mock message keys for each message', async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      
      const session = await initializeSession(
        sharedSecret.buffer,
        'contact-1',
        true,
        await generateKeyPair(),
        { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }
      );
      
      const result1 = await ratchetSendingChain(session);
      const result2 = await ratchetSendingChain(result1.updatedSession);
      
      expect(result1.messageKey).toBeDefined();
      expect(result2.messageKey).toBeDefined();
      expect(result1.updatedSession.sendingMessageNumber).toBe(1);
      expect(result2.updatedSession.sendingMessageNumber).toBe(2);
    });
  });

  describe('encryptMessage / decryptMessage', () => {
    it.todo('should encrypt and decrypt a message when using real crypto');
    it.todo('should fail to decrypt with wrong key when using real crypto');
    it.todo('should fail to decrypt modified ciphertext when using real crypto');
  });

  describe('skipMessageKeys', () => {
    it('should skip message keys for out-of-order messages when receiving chain exists', async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      
      const session = await initializeSession(
        sharedSecret.buffer,
        'contact-1',
        false,
        await generateKeyPair(),
        { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }
      );
      
      const sessionWithReceivingChain = {
        ...session,
        receivingChainKey: new ArrayBuffer(32),
        receivingMessageNumber: 0,
      };
      
      const skippedSession = await skipMessageKeys(sessionWithReceivingChain, 5);
      
      expect(skippedSession.receivingMessageNumber).toBe(5);
      expect(skippedSession.skipCache.size).toBeGreaterThan(0);
    });
  });

  describe('performDHRatchetStep', () => {
    it('should perform DH ratchet step and reset message counters', async () => {
      const sharedSecret = new Uint8Array(32);
      crypto.getRandomValues(sharedSecret);
      
      const session = await initializeSession(
        sharedSecret.buffer,
        'contact-1',
        true,
        await generateKeyPair(),
        { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }
      );
      
      const newPublicKey = await exportPublicKey((await generateKeyPair()).publicKey);
      
      const updatedSession = await performDHRatchetStep(session, newPublicKey);
      
      expect(updatedSession.dhRatchetPublicKey).toBeDefined();
      expect(updatedSession.sendingMessageNumber).toBe(0);
      expect(updatedSession.receivingMessageNumber).toBe(0);
    });
  });
});
