import { useState, useEffect } from 'react';
import { createIdentity, loadIdentity, saveIdentity, deleteIdentity } from '../../storage/identity-store';
import { registerUser, loginUser } from '../../api/client';
import { saveSession, clearSession } from '../../storage/session-storage';
import { logger } from '../../utils/logger';
import { setWebSocketAuthToken } from '../../websocket/client';

export function useIdentity() {
  const [identity, setIdentity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkExistingIdentity();
  }, []);

  const checkExistingIdentity = async () => {
    try {
      const existing = await loadIdentity();
      if (existing) {
        setIdentity(existing);
        // Try to restore session if token exists
        const token = await restoreSessionIfExists(existing.username);
        if (token) {
          setIsAuthenticated(true);
          setWebSocketAuthToken(token);
        }
      }
    } catch (err) {
      logger.error('Failed to load identity:', err);
    } finally {
      setLoading(false);
    }
  };

  const restoreSessionIfExists = async (username: string): Promise<string | null> => {
    try {
      const { loadSession } = await import('../../storage/session-storage');
      const session = loadSession();
      if (session && session.username === username) {
        return session.token;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const createNewIdentity = async (username: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const identityData = await createIdentity(username);
      
      const registrationResult = await registerUser({
        username: identityData.username,
        publicIdentityKey: identityData.publicIdentityKey,
        signedPreKey: {
          keyId: identityData.signedPreKey.keyId,
          publicKey: identityData.signedPreKey.publicKey,
          signature: identityData.signedPreKey.signature,
        },
        oneTimePreKeys: identityData.oneTimePreKeys
          .filter(key => !key.consumed)
          .map(key => ({
            keyId: key.keyId,
            publicKey: key.publicKey,
          })),
      });

      identityData.id = registrationResult.id;
      await saveIdentity(identityData);

      // Login to get session token
      const loginResult = await loginUser(identityData.username);
      saveSession({
        token: loginResult.token,
        username: loginResult.username,
      });
      setWebSocketAuthToken(loginResult.token);
      setIsAuthenticated(true);

      setIdentity(identityData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create identity');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteUserIdentity = async (): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      await deleteIdentity();
      clearSession();
      setIdentity(null);
      setIsAuthenticated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete identity');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string): Promise<boolean> => {
    setError(null);
    try {
      const result = await loginUser(username);
      saveSession({
        token: result.token,
        username: result.username,
      });
      setWebSocketAuthToken(result.token);
      setIsAuthenticated(true);
      
      // Update identity with user id if needed
      const existing = await loadIdentity();
      if (existing && existing.username === username) {
        setIdentity(existing);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    clearSession();
    setIsAuthenticated(false);
    setIdentity(null);
  };

  return {
    identity,
    loading,
    error,
    hasIdentity: !!identity,
    isAuthenticated,
    createNewIdentity,
    deleteUserIdentity,
    login,
    logout,
    refreshIdentity: checkExistingIdentity,
  };
}
