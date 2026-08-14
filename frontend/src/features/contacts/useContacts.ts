import { useState } from 'react';
import { lookupUser } from '../../api/client';

export interface Contact {
  id: string;
  username: string;
  publicIdentityKey: JsonWebKey;
  signedPreKey: {
    keyId: string;
    publicKey: JsonWebKey;
    signature: string;
  };
  oneTimePreKeys: {
    id: string;
    publicKey: JsonWebKey;
  }[];
}

function toContact(user: unknown): Contact {
  const record = user as Record<string, unknown>;
  const signedPreKey = (record.signedPreKey || record.signed_prekey || {}) as Record<string, unknown>;
  const oneTimePreKeys = (record.oneTimePreKeys || record.one_time_prekeys || []) as Array<Record<string, unknown>>;

  return {
    id: String(record.id ?? ''),
    username: String(record.username ?? ''),
    publicIdentityKey: (record.publicIdentityKey || record.public_identity_key || {}) as JsonWebKey,
    signedPreKey: {
      keyId: String((signedPreKey.keyId ?? signedPreKey.key_id ?? '') as string),
      publicKey: (signedPreKey.publicKey ?? signedPreKey.public_key ?? {}) as JsonWebKey,
      signature: String((signedPreKey.signature ?? '') as string),
    },
    oneTimePreKeys: oneTimePreKeys.map(key => ({
      id: String((key.id ?? key.keyId ?? '') as string),
      publicKey: (key.publicKey ?? key.public_key ?? {}) as JsonWebKey,
    })),
  };
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchContact = async (username: string): Promise<Contact | null> => {
    setLoading(true);
    setError(null);

    try {
      const user = await lookupUser(username);
      const contact = toContact(user);
      setContacts(prev => {
        const exists = prev.find(c => c.id === contact.id);
        if (exists) return prev;
        return [...prev, contact];
      });
      return contact;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find contact');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const removeContact = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
  };

  return {
    contacts,
    loading,
    error,
    searchContact,
    removeContact,
  };
}
