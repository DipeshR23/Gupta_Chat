/**
 * Session storage for Gupta_Chat
 * Manages authentication token in memory and localStorage
 */

const SESSION_TOKEN_KEY = 'gupta_chat_session_token';

export interface Session {
  token: string;
  username: string;
}

let currentSession: Session | null = null;

/**
 * Save session token
 */
export function saveSession(session: Session): void {
  currentSession = session;
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(session));
  }
}

/**
 * Load session token
 */
export function loadSession(): Session | null {
  if (currentSession) {
    return currentSession;
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SESSION_TOKEN_KEY);
    if (stored) {
      try {
        currentSession = JSON.parse(stored) as Session;
        return currentSession;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Get current session token
 */
export function getSessionToken(): string | null {
  const session = loadSession();
  return session?.token || null;
}

/**
 * Clear session
 */
export function clearSession(): void {
  currentSession = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getSessionToken();
}
