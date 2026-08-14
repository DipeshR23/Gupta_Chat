import { describe, it, expect } from 'vitest';
import { generateIdentityKeys, getNextAvailablePreKey, replenishPreKeys } from '../keys';

describe('Key Generation', () => {
  describe('generateIdentityKeys', () => {
    it('should generate a complete identity', async () => {
      const identity = await generateIdentityKeys();
      
      expect(identity.identityKey).toBeDefined();
      expect(identity.signedPreKey).toBeDefined();
      expect(identity.signedPreKey.keyId).toBeDefined();
      expect(identity.signedPreKey.publicKey).toBeDefined();
      expect(identity.oneTimePreKeys).toHaveLength(20);
    });

    it('should generate unique one-time pre-keys', async () => {
      const identity = await generateIdentityKeys();
      const keyIds = identity.oneTimePreKeys.map(k => k.keyId);
      const uniqueIds = new Set(keyIds);
      expect(uniqueIds.size).toBe(20);
    });

    it('should mark all one-time pre-keys as not consumed', async () => {
      const identity = await generateIdentityKeys();
      const consumed = identity.oneTimePreKeys.filter(k => k.consumed);
      expect(consumed).toHaveLength(0);
    });
  });

  describe('getNextAvailablePreKey', () => {
    it('should return the first available pre-key', async () => {
      const identity = await generateIdentityKeys();
      const preKey = getNextAvailablePreKey(identity.oneTimePreKeys);
      
      expect(preKey).not.toBeNull();
      expect(preKey?.keyId).toBe(identity.oneTimePreKeys[0].keyId);
    });

    it('should mark the pre-key as consumed', async () => {
      const identity = await generateIdentityKeys();
      const firstKeyId = identity.oneTimePreKeys[0].keyId;
      
      getNextAvailablePreKey(identity.oneTimePreKeys);
      
      const key = identity.oneTimePreKeys.find(k => k.keyId === firstKeyId);
      expect(key?.consumed).toBe(true);
    });

    it('should return null when no pre-keys available', async () => {
      const identity = await generateIdentityKeys();
      // Consume all pre-keys
      for (let i = 0; i < 20; i++) {
        getNextAvailablePreKey(identity.oneTimePreKeys);
      }
      
      const preKey = getNextAvailablePreKey(identity.oneTimePreKeys);
      expect(preKey).toBeNull();
    });
  });

  describe('replenishPreKeys', () => {
    it('should not add keys when above threshold', async () => {
      const identity = await generateIdentityKeys();
      const originalCount = identity.oneTimePreKeys.length;
      
      const replenished = await replenishPreKeys(identity.oneTimePreKeys, 20);
      expect(replenished.length).toBe(originalCount);
    });

    it('should add keys when below threshold', async () => {
      const identity = await generateIdentityKeys();
      
      // Consume 15 keys
      for (let i = 0; i < 15; i++) {
        getNextAvailablePreKey(identity.oneTimePreKeys);
      }
      
      const replenished = await replenishPreKeys(identity.oneTimePreKeys, 20);
      const available = replenished.filter(k => !k.consumed);
      expect(available.length).toBeGreaterThanOrEqual(20);
    });
  });
});
