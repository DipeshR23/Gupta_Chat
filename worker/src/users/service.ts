import { Env } from '../durable-objects/types';

export interface User {
  id: string;
  username: string;
  username_normalized: string;
  status: string;
  created_at: string;
}

export interface PublicKeyBundle {
  identity_key: JsonWebKey;
  signed_prekey: {
    public_key: JsonWebKey;
    signature: string;
  };
  one_time_prekeys: Array<{
    id: string;
    public_key: JsonWebKey;
  }>;
}

export class UserService {
  async createUser(data: {
    username: string;
    publicIdentityKey: JsonWebKey;
    signedPreKey: { keyId: string; publicKey: JsonWebKey; signature: string };
    oneTimePreKeys: Array<{ keyId: string; publicKey: JsonWebKey }>;
  }, env: Env): Promise<{ id: string; username: string }> {
    const usernameNormalized = data.username.toLowerCase();
    
    // Check if username exists
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE username_normalized = ?'
    ).bind(usernameNormalized).first<User>();
    
    if (existing) {
      throw new Error('Username already taken');
    }

    const userId = generateUserId();
    const now = new Date().toISOString();

    // Create user
    await env.DB.prepare(
      'INSERT INTO users (id, username, username_normalized, status, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, data.username, usernameNormalized, 'active', now).run();

    // Store identity key
    await env.DB.prepare(
      'INSERT INTO identity_keys (user_id, public_key, key_version, created_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, JSON.stringify(data.publicIdentityKey), 1, now).run();

    // Store signed pre-key
    await env.DB.prepare(
      'INSERT INTO signed_prekeys (id, user_id, public_key, signature, created_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      data.signedPreKey.keyId,
      userId,
      JSON.stringify(data.signedPreKey.publicKey),
      data.signedPreKey.signature,
      now,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      'active'
    ).run();

    // Store one-time pre-keys
    for (const preKey of data.oneTimePreKeys) {
      await env.DB.prepare(
        'INSERT INTO one_time_prekeys (id, user_id, public_key, status, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(preKey.keyId, userId, JSON.stringify(preKey.publicKey), 'available', now).run();
    }

    return { id: userId, username: data.username };
  }

  async getUser(username: string, env: Env): Promise<User | null> {
    const normalized = username.toLowerCase();
    const user = await env.DB.prepare(
      'SELECT id, username, username_normalized, status, created_at FROM users WHERE username_normalized = ?'
    ).bind(normalized).first<User>();
    
    return user || null;
  }

  async getPublicKeyBundle(username: string, env: Env): Promise<PublicKeyBundle | null> {
    const user = await this.getUser(username, env);
    if (!user) return null;

    // Get identity key
    const identityKey = await env.DB.prepare(
      'SELECT public_key FROM identity_keys WHERE user_id = ? ORDER BY key_version DESC LIMIT 1'
    ).bind(user.id).first<{ public_key: string }>();

    // Get active signed pre-key
    const signedPreKey = await env.DB.prepare(
      'SELECT public_key, signature FROM signed_prekeys WHERE user_id = ? AND status = ? LIMIT 1'
    ).bind(user.id, 'active').first<{ public_key: string; signature: string }>();

    // Get available one-time pre-keys
      const oneTimePreKeys = await env.DB.prepare(
        'SELECT id, public_key FROM one_time_prekeys WHERE user_id = ? AND status = ? LIMIT 10'
      ).bind(user.id, 'available').all<{ id: string; public_key: string }>();

      if (!identityKey || !signedPreKey) {
        return null;
      }

      return {
        identity_key: JSON.parse(identityKey.public_key),
        signed_prekey: {
          public_key: JSON.parse(signedPreKey.public_key),
          signature: signedPreKey.signature,
        },
        one_time_prekeys: oneTimePreKeys.results.map((key) => ({
          id: key.id,
          public_key: JSON.parse(key.public_key),
        })),
      };
  }
}

function generateUserId(): string {
  return crypto.randomUUID();
}
