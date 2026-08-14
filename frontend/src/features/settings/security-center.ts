/**
 * Security center and storage management
 * Handles storage usage, cache clearing, data deletion
 */

import { getDb, closeDb } from '../../storage/db';
import { deleteIdentity } from '../../storage/identity-store';
import { clearAllTimers } from '../messaging/disappearing-messages';
import { logger } from '../../utils/logger';

export interface StorageUsage {
  identity: number;
  messages: number;
  files: number;
  contacts: number;
  total: number;
}

export interface SecurityCenterState {
  storageUsage: StorageUsage | null;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Calculate storage usage
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  const db = await getDb();
  
  const identityCount = await db.count('identity');
  const messageCount = await db.count('messages');
  const fileCount = await db.count('files');
  const contactCount = await db.count('contacts');

  // Estimate storage size (simplified)
  const identitySize = identityCount * 2048; // ~2KB per identity
  const messageSize = messageCount * 1024; // ~1KB per message
  const fileSize = fileCount * 10240; // ~10KB per file record
  const contactSize = contactCount * 1024; // ~1KB per contact

  return {
    identity: identitySize,
    messages: messageSize,
    files: fileSize,
    contacts: contactSize,
    total: identitySize + messageSize + fileSize + contactSize,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await getDb();
    
    // Clear all object stores except identity
    const stores = ['messages', 'files', 'contacts', 'settings'];
    for (const store of stores) {
      await db.clear(store);
    }

    // Clear any active timers
    clearAllTimers();
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Delete all local data including identity
 */
export async function deleteAllLocalData(): Promise<void> {
  try {
    // Clear all timers
    clearAllTimers();

    // Delete identity
    await deleteIdentity();

    // Clear all other data
    await clearCache();

    // Close database
    await closeDb();
  } catch (error) {
    logger.error('Failed to delete all local data:', error);
    throw error;
  }
}

/**
 * Delete a specific conversation
 */
export async function deleteConversation(contactId: string): Promise<void> {
  try {
    const db = await getDb();
    
    // Delete all messages for this contact
    const messages = await db.getAllFromIndex('messages', 'contactId', contactId);
    const tx = db.transaction('messages', 'readwrite');
    for (const message of messages) {
      await tx.store.delete(message.id);
    }
    await tx.done;

    // Delete file references for this contact
    const files = await db.getAllFromIndex('files', 'contactId', contactId);
    const fileTx = db.transaction('files', 'readwrite');
    for (const file of files) {
      await fileTx.store.delete(file.fileId);
    }
    await fileTx.done;

    // Remove contact
    await db.delete('contacts', contactId);
  } catch (error) {
    logger.error('Failed to delete conversation:', error);
    throw error;
  }
}
