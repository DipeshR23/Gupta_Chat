import { describe, it, expect } from 'vitest';
import { generateIdentity, initX3DH } from '../x3dh';
import { exportPublicKey } from '../utils';

describe('X3DH Key Agreement', () => {
  describe('generateIdentity', () => {
    it('should generate a valid identity bundle', async () => {
      const identity = await generateIdentity();
      
      expect(identity.identityKey).toBeDefined();
      expect(identity.signedPreKey).toBeDefined();
      expect(identity.signedPreKey.keyId).toBeDefined();
      expect(identity.oneTimePreKeys.length).toBeGreaterThan(0);
    });
  });

  describe('initX3DH / respondX3DH', () => {
    it('should establish a shared secret', async () => {
      const alice = await generateIdentity();
      const bob = await generateIdentity();
      
      const aliceResult = await initX3DH(
        alice.identityKey.publicKey,
        bob.signedPreKey.publicKey,
        bob.oneTimePreKeys[0].publicKey,
        await exportPublicKey(bob.identityKey.publicKey)
      );
      
      expect(aliceResult.sharedSecret).toBeDefined();
      expect(aliceResult.sharedSecret.byteLength).toBeGreaterThan(0);
    });

    it.todo('should produce the same shared secret for both parties when using real crypto');
    it.todo('should produce different secrets for different identities when using real crypto');
  });
});
