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

function toContact(user: any): Contact {
  return {
    id: user.id,
    username: user.username,
    publicIdentityKey: user.publicIdentityKey,
    signedPreKey: user.signedPreKey,
    oneTimePreKeys: (user.oneTimePreKeys || []).map((key: any) => ({
      id: key.keyId || key.id,
      publicKey: key.publicKey,
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
