import '@testing-library/jest-dom';

const randomValues = new Uint8Array(16384);
let randomIndex = 0;

function fillRandom() {
  for (let i = 0; i < randomValues.length; i++) {
    randomValues[i] = Math.floor(Math.random() * 256);
  }
  randomIndex = 0;
}
fillRandom();

function consumeRandom(bytes: number): Uint8Array {
  if (randomIndex + bytes > randomValues.length) {
    fillRandom();
  }
  const out = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    out[i] = randomValues[randomIndex++];
  }
  return out;
}

// Track mock crypto state for proper round-trip testing
const encryptionKeyMap = new WeakMap<object, CryptoKey>();
const keyRegistry = new Map<string, CryptoKey>();

function getKeyId(rawBytes: Uint8Array): string {
  return Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function registerKey(rawBytes: Uint8Array, key: CryptoKey): void {
  keyRegistry.set(getKeyId(rawBytes), key);
}

function lookupKey(rawBytes: Uint8Array): CryptoKey | undefined {
  return keyRegistry.get(getKeyId(rawBytes));
}

function getRawKeyBytes(key: CryptoKey): Uint8Array | undefined {
  return (key as unknown as { _rawKey?: Uint8Array })._rawKey;
}

function setRawKeyBytes(key: CryptoKey, raw: Uint8Array): void {
  (key as unknown as { _rawKey?: Uint8Array })._rawKey = raw;
}

const mockSubtleCrypto = {
  generateKey: async (algorithm: unknown, _extractable: boolean, usages: string[]) => {
    const raw = consumeRandom(32);
    const algo = algorithm as { name: string; namedCurve?: string };
    
    if (algo.name === 'ECDH' || algo.name === 'ECDSA') {
      const publicKey = { 
        algorithm: algo, 
        type: 'public', 
        extractable: true, 
        usages: [] 
      } as CryptoKey;
      const privateKey = { 
        algorithm: algo, 
        type: 'private', 
        extractable: true, 
        usages: usages.filter(u => u !== 'encrypt' && u !== 'decrypt') 
      } as CryptoKey;
      setRawKeyBytes(publicKey, raw);
      setRawKeyBytes(privateKey, raw);
      registerKey(raw, publicKey);
      registerKey(raw, privateKey);
      return { publicKey, privateKey };
    }
    
    // Symmetric key (AES-GCM, etc.)
    const key = {
      algorithm: { name: algo.name, length: 256 },
      type: 'secret',
      extractable: true,
      usages,
    } as CryptoKey;
    setRawKeyBytes(key, raw);
    registerKey(raw, key);
    return key;
  },
  exportKey: async (format: string, key: CryptoKey) => {
    const raw = getRawKeyBytes(key);
    if (format === 'raw' && raw) {
      return raw.buffer;
    }
    // Fallback for JWK export
    const keyBytes = raw || consumeRandom(32);
    return {
      kty: 'EC',
      crv: 'P-256',
      x: Array.from(keyBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(''),
      y: Array.from(keyBytes.slice(16, 32)).map(b => b.toString(16).padStart(2, '0')).join(''),
    };
  },
  importKey: async (format: string, keyData: ArrayBuffer | BufferSource) => {
    const keyBytes = ArrayBuffer.isView(keyData) ? new Uint8Array((keyData).buffer) : new Uint8Array(keyData);
    if (format === 'raw') {
      const existing = lookupKey(keyBytes);
      if (existing) {
        return existing;
      }
      const key = { 
        algorithm: { name: 'AES-GCM', length: 256 }, 
        type: 'secret', 
        extractable: true, 
        usages: ['decrypt'] 
      } as CryptoKey;
      setRawKeyBytes(key, new Uint8Array(keyBytes));
      registerKey(keyBytes, key);
      return key;
    }
    return { algorithm: { name: 'HKDF' }, type: 'secret', extractable: true, usages: ['deriveKey'] } as CryptoKey;
  },
  deriveBits: async (_algorithm: unknown, _baseKey: CryptoKey, length: number) => consumeRandom(length / 8).buffer,
  deriveKey: async (_algorithm: unknown, _baseKey: CryptoKey, _derivedKeyType: unknown) => {
    const raw = consumeRandom(32);
    const key = { algorithm: { name: 'AES-GCM', length: 256 }, type: 'secret', extractable: true, usages: ['encrypt', 'decrypt'] } as CryptoKey;
    setRawKeyBytes(key, raw);
    registerKey(raw, key);
    return key;
  },
  encrypt: async (_algorithm: unknown, _key: CryptoKey, data: ArrayBuffer | BufferSource) => {
    const buf = ArrayBuffer.isView(data) ? (data).buffer : (data);
    const nonce = consumeRandom(8);
    const input = new Uint8Array(buf);
    const resultBuffer = new ArrayBuffer(buf.byteLength + 10);
    const resultBytes = new Uint8Array(resultBuffer);
    resultBytes.set(nonce, 0);
    let checksum = 0;
    for (let i = 0; i < input.length; i++) {
      resultBytes[i + 8] = input[i] ^ nonce[i % 8];
      checksum = (checksum + input[i]) & 0xFF;
    }
    resultBytes[resultBytes.length - 2] = checksum;
    resultBytes[resultBytes.length - 1] = 0xAB;
    encryptionKeyMap.set(resultBuffer, _key);
    return resultBuffer;
  },
  decrypt: async (_algorithm: unknown, _key: CryptoKey, data: ArrayBuffer | BufferSource) => {
    const buf = ArrayBuffer.isView(data) ? (data).buffer : (data);
    const encryptionKey = encryptionKeyMap.get(buf);
    if (encryptionKey) {
      const encryptRaw = getRawKeyBytes(encryptionKey);
      const decryptRaw = getRawKeyBytes(_key);
      if (encryptRaw && decryptRaw) {
        if (encryptRaw.length !== decryptRaw.length || !encryptRaw.every((v, i) => v === decryptRaw[i])) {
          throw new Error('Incorrect key for decryption');
        }
      } else if (encryptRaw && !decryptRaw) {
        throw new Error('Incorrect key for decryption');
      } else if (!encryptRaw && decryptRaw) {
        throw new Error('Incorrect key for decryption');
      }
    }
    const input = new Uint8Array(buf);
    const nonce = input.slice(0, 8);
    const body = input.slice(8, input.length - 2);
    const checksum = input[input.length - 2];
    const terminator = input[input.length - 1];

    if (terminator !== 0xAB) {
      throw new Error('Invalid ciphertext');
    }

    let computed = 0;
    const result = new Uint8Array(body.length);
    for (let i = 0; i < body.length; i++) {
      result[i] = body[i] ^ nonce[i % 8];
      computed = (computed + result[i]) & 0xFF;
    }

    if (computed !== checksum) {
      throw new Error('Authentication failed');
    }

    return result.buffer;
  },
  sign: async () => consumeRandom(64).buffer,
  verify: async () => true,
  digest: async (_algorithm: unknown, data: ArrayBuffer | BufferSource) => {
    const buf = ArrayBuffer.isView(data) ? (data).buffer : (data);
    return consumeRandom(Math.min(buf.byteLength, 32)).buffer;
  },
};

if (typeof globalThis !== 'undefined') {
  const originalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...(originalCrypto || {}),
      getRandomValues: (target: unknown) => {
        const view = target as Uint8Array;
        const r = consumeRandom(view.length);
        view.set(r);
        return view;
      },
      subtle: mockSubtleCrypto,
    },
    writable: true,
    configurable: true,
  });
}

if (typeof TextEncoder === 'undefined') {
  (globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
  (globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
}

// Mock IndexedDB for tests
const mockIdb = {
  open: () => ({
    result: {
      createObjectStore: () => ({
        createIndex: () => {},
      }),
      objectStoreNames: [],
      transaction: () => ({
        objectStore: () => ({
          put: async () => {},
          get: async () => undefined,
          delete: async () => {},
        }),
      }),
    },
    upgrade: () => {},
    close: () => {},
  }),
};

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIdb,
  writable: true,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = () => {};

