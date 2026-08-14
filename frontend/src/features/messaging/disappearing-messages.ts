/**
 * Disappearing messages manager
 * Handles timers and cleanup for messages with TTL
 */

import { getDb } from '../../storage/db';
import { logger } from '../../utils/logger';

export interface DisappearingMessageConfig {
  messageId: string;
  ttl: number; // seconds
  onExpire: (messageId: string) => void;
}

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Start a disappearing message timer
 */
export function startDisappearingTimer(config: DisappearingMessageConfig): void {
  // Clear existing timer for this message
  clearDisappearingTimer(config.messageId);

  const timer = setTimeout(() => {
    deleteMessage(config.messageId);
    config.onExpire(config.messageId);
    activeTimers.delete(config.messageId);
  }, config.ttl * 1000);

  activeTimers.set(config.messageId, timer);
}

/**
 * Clear a disappearing message timer
 */
export function clearDisappearingTimer(messageId: string): void {
  const timer = activeTimers.get(messageId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(messageId);
  }
}

/**
 * Delete a message from storage
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('messages', messageId);
  } catch (error) {
    logger.error('Failed to delete message:', error);
  }
}

/**
 * Get remaining TTL for a message
 */
export function getRemainingTtl(messageId: string, ttl: number): number {
  const timer = activeTimers.get(messageId);
  if (!timer) return ttl;

  // This is simplified - in real implementation, we'd track start time
  return ttl;
}

/**
 * Pause a disappearing message timer
 */
export function pauseDisappearingTimer(messageId: string): void {
  const timer = activeTimers.get(messageId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(messageId);
  }
}

/**
 * Resume a disappearing message timer
 */
export function resumeDisappearingTimer(
  messageId: string,
  remainingTtl: number,
  onExpire: (messageId: string) => void
): void {
  startDisappearingTimer({
    messageId,
    ttl: remainingTtl,
    onExpire,
  });
}

/**
 * Clear all active timers
 */
export function clearAllTimers(): void {
  activeTimers.forEach((timer) => { clearTimeout(timer); });
  activeTimers.clear();
}
