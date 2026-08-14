/**
 * Message storage operations
 */

import { getDb } from '../storage/db';
import type { EncryptedMessage } from '../types';

/**
 * Save a message to IndexedDB
 */
export async function saveMessage(message: EncryptedMessage): Promise<void> {
  const db = await getDb();
  await db.put('messages', message);
}

/**
 * Load messages for a contact
 */
export async function loadMessages(contactId: string): Promise<EncryptedMessage[]> {
  const db = await getDb();
  const messages = await db.getAllFromIndex('messages', 'contactId', contactId);
  return messages as EncryptedMessage[];
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const db = await getDb();
  await db.delete('messages', messageId);
}

/**
 * Delete all messages for a contact
 */
export async function deleteAllMessages(contactId: string): Promise<void> {
  const db = await getDb();
  const messages = await loadMessages(contactId);
  
  const tx = db.transaction('messages', 'readwrite');
  for (const message of messages) {
    await tx.store.delete(message.id);
  }
  await tx.done;
}

/**
 * Mark message as delivered
 */
export async function markAsDelivered(messageId: string): Promise<void> {
  const db = await getDb();
  const message = await db.get('messages', messageId);
  if (message) {
    message.status = 'delivered';
    await db.put('messages', message);
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  const db = await getDb();
  const message = await db.get('messages', messageId);
  if (message) {
    message.status = 'read';
    await db.put('messages', message);
  }
}

/**
 * Get message by ID
 */
export async function getMessage(messageId: string): Promise<EncryptedMessage | undefined> {
  const db = await getDb();
  return (await db.get('messages', messageId)) as EncryptedMessage | undefined;
}
