import { Env } from '../durable-objects/types';

export class KeyService {
  async getKeys(username: string, env: Env): Promise<{
    identity_key: JsonWebKey;
    signed_prekey: { public_key: JsonWebKey; signature: string };
    one_time_prekeys: Array<{ id: string; public_key: JsonWebKey }>;
  }> {
    // Get user by username
    const user = await env.DB.prepare(
      'SELECT id, public_identity_key FROM users WHERE username = ?'
    ).bind(username).first<{ id: string; public_identity_key: string }>();

    if (!user) {
      throw new Error('User not found');
    }

    // Get signed pre-key
    const signedPreKey = await env.DB.prepare(
      'SELECT public_key, signature FROM signed_prekeys WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(user.id).first<{ public_key: string; signature: string }>();

    if (!signedPreKey) {
      throw new Error('No signed pre-key found');
    }

    // Get available one-time pre-keys
    const oneTimePreKeys = await env.DB.prepare(
      'SELECT id, public_key FROM one_time_prekeys WHERE user_id = ? AND consumed = 0 LIMIT 10'
    ).bind(user.id).all<{ id: string; public_key: string }>();

    return {
      identity_key: JSON.parse(user.public_identity_key),
      signed_prekey: {
        public_key: JSON.parse(signedPreKey.public_key),
        signature: signedPreKey.signature,
      },
      one_time_prekeys: oneTimePreKeys.results.map(key => ({
        id: key.id,
        public_key: JSON.parse(key.public_key),
      })),
    };
  }

  async publishPreKeys(
    data: {
      user_id: string;
      signed_prekey: { keyId: string; publicKey: JsonWebKey; signature: string };
      one_time_prekeys: Array<{ keyId: string; publicKey: JsonWebKey }>;
    },
    env: Env
  ): Promise<{ success: boolean }> {
    // Store signed pre-key
    const signedPreKeyId = `spk-${data.user_id}-${data.signed_prekey.keyId}`;
    await env.DB.prepare(
      'INSERT OR REPLACE INTO signed_prekeys (id, user_id, key_id, public_key, signature, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
    ).bind(
      signedPreKeyId,
      data.user_id,
      data.signed_prekey.keyId,
      JSON.stringify(data.signed_prekey.publicKey),
      data.signed_prekey.signature,
    ).run();

    // Store one-time pre-keys
    for (const preKey of data.one_time_prekeys) {
      const preKeyId = `otk-${data.user_id}-${preKey.keyId}`;
      await env.DB.prepare(
        'INSERT OR REPLACE INTO one_time_prekeys (id, user_id, key_id, public_key, consumed, created_at) VALUES (?, ?, ?, ?, 0, datetime("now"))'
      ).bind(
        preKeyId,
        data.user_id,
        preKey.keyId,
        JSON.stringify(preKey.publicKey)
      ).run();
    }

    return { success: true };
  }

  async consumePreKey(
    data: { user_id: string; prekey_id: string },
    env: Env
  ): Promise<{ public_key: JsonWebKey }> {
    // Find and consume a one-time pre-key
    const preKey = await env.DB.prepare(
      'SELECT id, public_key FROM one_time_prekeys WHERE user_id = ? AND consumed = 0 LIMIT 1'
    ).bind(data.user_id).first<{ id: string; public_key: string }>();

    if (!preKey) {
      throw new Error('No one-time pre-keys available');
    }

    // Mark as consumed
    await env.DB.prepare(
      'UPDATE one_time_prekeys SET consumed = 1 WHERE id = ?'
    ).bind(preKey.id).run();

    return {
      public_key: JSON.parse(preKey.public_key),
    };
  }
}
