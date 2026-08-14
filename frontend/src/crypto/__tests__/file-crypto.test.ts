import { describe, it, expect } from 'vitest';
import { encryptFile, decryptFile, isSupportedFileType, isSupportedFileSize } from '../file-crypto';

describe('File Encryption', () => {
  describe('isSupportedFileType', () => {
    it('should accept supported image types', () => {
      expect(isSupportedFileType('image/jpeg')).toBe(true);
      expect(isSupportedFileType('image/png')).toBe(true);
      expect(isSupportedFileType('image/gif')).toBe(true);
    });

    it('should accept supported document types', () => {
      expect(isSupportedFileType('application/pdf')).toBe(true);
      expect(isSupportedFileType('application/msword')).toBe(true);
      expect(isSupportedFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should reject unsupported types', () => {
      expect(isSupportedFileType('application/x-msdos-program')).toBe(false);
      expect(isSupportedFileType('application/octet-stream')).toBe(false);
    });
  });

  describe('isSupportedFileSize', () => {
    it('should accept files under 50MB', () => {
      expect(isSupportedFileSize(10 * 1024 * 1024)).toBe(true); // 10MB
      expect(isSupportedFileSize(49 * 1024 * 1024)).toBe(true); // 49MB
    });

    it('should reject files over 50MB', () => {
      expect(isSupportedFileSize(51 * 1024 * 1024)).toBe(false); // 51MB
      expect(isSupportedFileSize(100 * 1024 * 1024)).toBe(false); // 100MB
    });

    it('should accept empty files', () => {
      expect(isSupportedFileSize(0)).toBe(true);
    });
  });

  describe('encryptFile / decryptFile', () => {
    it('should encrypt and decrypt a file', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const plaintext = testData.buffer;
      
      const encrypted = await encryptFile(plaintext, 'application/octet-stream');
      
      expect(encrypted.fileId).toBeDefined();
      expect(encrypted.encryptedKey.byteLength).toBe(32);
      expect(encrypted.nonce.byteLength).toBe(12);
      expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
      
      const decrypted = await decryptFile(
        encrypted.encryptedKey,
        encrypted.nonce,
        encrypted.ciphertext
      );
      
      expect(new Uint8Array(decrypted)).toEqual(testData);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      
      const encrypted1 = await encryptFile(plaintext, 'application/octet-stream');
      const encrypted2 = await encryptFile(plaintext, 'application/octet-stream');
      
      expect(new Uint8Array(encrypted1.ciphertext)).not.toEqual(new Uint8Array(encrypted2.ciphertext));
      expect(new Uint8Array(encrypted1.nonce)).not.toEqual(new Uint8Array(encrypted2.nonce));
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const encrypted = await encryptFile(plaintext, 'application/octet-stream');
      
      // Generate wrong key
      const wrongKey = crypto.getRandomValues(new Uint8Array(32));
      
      await expect(
        decryptFile(wrongKey.buffer, encrypted.nonce, encrypted.ciphertext)
      ).rejects.toThrow();
    });

    it('should fail to decrypt modified ciphertext', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const encrypted = await encryptFile(plaintext, 'application/octet-stream');
      
      // Modify ciphertext
      const modified = new Uint8Array(encrypted.ciphertext);
      modified[0] = modified[0] ^ 0xFF;
      
      await expect(
        decryptFile(encrypted.encryptedKey, encrypted.nonce, modified.buffer)
      ).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      const plaintext = new ArrayBuffer(0);
      
      const encrypted = await encryptFile(plaintext, 'application/octet-stream');
      const decrypted = await decryptFile(
        encrypted.encryptedKey,
        encrypted.nonce,
        encrypted.ciphertext
      );
      
      expect(decrypted.byteLength).toBe(0);
    });

    it('should handle large files (5MB)', async () => {
      const largeData = crypto.getRandomValues(new Uint8Array(5 * 1024 * 1024));
      
      const encrypted = await encryptFile(largeData.buffer, 'application/octet-stream');
      const decrypted = await decryptFile(
        encrypted.encryptedKey,
        encrypted.nonce,
        encrypted.ciphertext
      );
      
      expect(new Uint8Array(decrypted)).toEqual(largeData);
    }, 30000); // 30 second timeout for large file test
  });
});
