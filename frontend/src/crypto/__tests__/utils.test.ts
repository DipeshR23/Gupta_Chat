import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  hkdf,
  generateId,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  concatBuffers,
} from '../utils';

describe('Crypto Utils', () => {
  describe('generateKeyPair', () => {
    it('should generate a valid ECDH P-256 key pair', async () => {
      const keyPair = await generateKeyPair();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe('exportPublicKey / importPublicKey', () => {
    it('should roundtrip a public key', async () => {
      const keyPair = await generateKeyPair();
      const exported = await exportPublicKey(keyPair.publicKey);
      const imported = await importPublicKey(exported);
      expect(imported).toBeDefined();
    });
  });

  describe('deriveSharedSecret', () => {
    it('should derive the same shared secret for both parties', async () => {
      const alice = await generateKeyPair();
      const bob = await generateKeyPair();
      
      const aliceSecret = await deriveSharedSecret(alice.privateKey, bob.publicKey);
      const bobSecret = await deriveSharedSecret(bob.privateKey, alice.publicKey);
      
      expect(aliceSecret).toEqual(bobSecret);
    });
  });

  describe('hkdf', () => {
    it('should return a key when called', async () => {
      const inputKey = crypto.getRandomValues(new Uint8Array(32));
      const key = await hkdf(new ArrayBuffer(0), inputKey.buffer, 'test');
      expect(key).toBeDefined();
      expect(key.byteLength).toBeGreaterThan(0);
    });

    it.todo('should produce different keys for different info when using real crypto');
  });

  describe('arrayBufferToBase64 / base64ToArrayBuffer', () => {
    it('should roundtrip an ArrayBuffer', () => {
      const original = crypto.getRandomValues(new Uint8Array(32));
      const base64 = arrayBufferToBase64(original.buffer);
      const decoded = base64ToArrayBuffer(base64);
      expect(new Uint8Array(decoded)).toEqual(original);
    });
  });

  describe('concatBuffers', () => {
    it('should concatenate buffers correctly', () => {
      const buf1 = new Uint8Array([1, 2, 3]).buffer;
      const buf2 = new Uint8Array([4, 5, 6]).buffer;
      const result = concatBuffers(buf1, buf2);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });
  });
});
