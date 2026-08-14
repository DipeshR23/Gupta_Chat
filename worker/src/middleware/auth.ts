/**
 * Authentication middleware for Gupta_Chat worker
 * Validates Bearer tokens and session tokens
 */

import { Env } from '../durable-objects/types';
import { createErrorResponse } from '../utils/errors';

export interface AuthResult {
  userId: string;
  username: string;
}

const BEARER_PREFIX = 'Bearer ';

/**
 * Extract and validate Bearer token from Authorization header
 */
export async function authenticateRequest(request: Request, env: Env): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  
  if (!token) {
    throw new Error('Empty token');
  }

  // Look up session by token
  const session = await env.DB.prepare(
    'SELECT s.user_id, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, new Date().toISOString()).first<{ user_id: string; username: string }>();

  if (!session) {
    throw new Error('Invalid or expired session');
  }

  return {
    userId: session.user_id,
    username: session.username,
  };
}

/**
 * Create a new session token for a user
 */
export async function createSession(userId: string, env: Env): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, expiresAt, new Date().toISOString()).run();

  return token;
}

/**
 * Revoke a session token
 */
export async function revokeSession(token: string, env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
