/**
 * IndexedDB setup for Gupta_Chat
 * Uses idb library for promise-based IndexedDB access
 */

import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'gupta-chat-db';
export const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Identity store
      if (!db.objectStoreNames.contains('identity')) {
        const identityStore = db.createObjectStore('identity', { keyPath: 'id' });
        identityStore.createIndex('username', 'username', { unique: true });
      }

      // Keys store
      if (!db.objectStoreNames.contains('keys')) {
        const keysStore = db.createObjectStore('keys', { keyPath: 'id' });
        keysStore.createIndex('type', 'type', { unique: false });
      }

      // Contacts store
      if (!db.objectStoreNames.contains('contacts')) {
        const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' });
        contactsStore.createIndex('username', 'username', { unique: true });
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('contactId', 'contactId', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Files store
      if (!db.objectStoreNames.contains('files')) {
        const filesStore = db.createObjectStore('files', { keyPath: 'fileId' });
        filesStore.createIndex('contactId', 'contactId', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
