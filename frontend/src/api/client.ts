/**
 * API client for Gupta_Chat backend
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

function validateUsername(username: string): void {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new Error('Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens');
  }
}

function validateJsonWebKey(key: unknown): void {
  if (!key || typeof key !== 'object') {
    throw new Error('Invalid public key format');
  }
}

function validateUserRegistration(userData: UserRegistration): void {
  validateUsername(userData.username);
  validateJsonWebKey(userData.publicIdentityKey);
  validateJsonWebKey(userData.signedPreKey.publicKey);
  
  if (!userData.signedPreKey.keyId || typeof userData.signedPreKey.keyId !== 'string') {
    throw new Error('Signed pre-key ID is required');
  }
  
  if (!Array.isArray(userData.oneTimePreKeys) || userData.oneTimePreKeys.length === 0) {
    throw new Error('At least one one-time pre-key is required');
  }
  
  for (const key of userData.oneTimePreKeys) {
    validateJsonWebKey(key.publicKey);
    if (!key.keyId || typeof key.keyId !== 'string') {
      throw new Error('One-time pre-key ID is required');
    }
  }
}

export interface UserRegistration {
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

export interface UserLookup {
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

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  authToken?: string
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: {
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      },
    }));
    throw new Error(error.error.message || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Login with username to get session token
 */
export async function loginUser(username: string): Promise<{ token: string; username: string }> {
  validateUsername(username);
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

/**
 * Register a new user
 */
export async function registerUser(userData: UserRegistration): Promise<{ id: string; username: string }> {
  validateUserRegistration(userData);
  return apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Look up a user by username
 */
export async function lookupUser(username: string): Promise<UserLookup> {
  validateUsername(username);
  return apiFetch(`/users/${encodeURIComponent(username)}`);
}

/**
 * Check if username is available
 */
export async function checkUsername(username: string): Promise<{ available: boolean }> {
  try {
    await lookupUser(username);
    return { available: false };
  } catch (error) {
    return { available: true };
  }
}

/**
 * Publish public keys to server
 */
export async function publishKeys(
  userId: string,
  signedPreKey: { keyId: string; publicKey: JsonWebKey; signature: string },
  oneTimePreKeys: { keyId: string; publicKey: JsonWebKey }[],
  authToken?: string
): Promise<{ success: boolean }> {
  return apiFetch('/keys/prekeys', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      signed_prekey: signedPreKey,
      one_time_prekeys: oneTimePreKeys,
    }),
  }, authToken);
}

/**
 * Fetch public keys for a user
 */
export async function fetchKeys(username: string): Promise<{
  identity_key: JsonWebKey;
  signed_prekey: { public_key: JsonWebKey; signature: string };
  one_time_prekeys: { id: string; public_key: JsonWebKey }[];
}> {
  return apiFetch(`/keys/${encodeURIComponent(username)}`);
}

/**
 * Consume a one-time pre-key
 */
export async function consumePreKey(userId: string, preKeyId: string, authToken?: string): Promise<{ public_key: JsonWebKey }> {
  return apiFetch('/keys/prekeys/consume', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      prekey_id: preKeyId,
    }),
  }, authToken);
}

/**
 * Verify a contact's signed pre-key signature using their claimed identity public key
 */
export async function verifyContactSignature(
  contactIdentityPublicKey: JsonWebKey,
  signedPreKeyPublicKey: JsonWebKey,
  signature: string
): Promise<boolean> {
  try {
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0)).buffer;
    const { verifySignature, importPublicKey } = await import('../crypto/utils');
    const identityPublicKey = await importPublicKey(contactIdentityPublicKey);
    const signedPreKey = await importPublicKey(signedPreKeyPublicKey);
    const publicKeyBytes = await crypto.subtle.exportKey('raw', signedPreKey);
    return verifySignature(identityPublicKey, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
