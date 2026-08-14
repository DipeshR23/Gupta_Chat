import { useState, useEffect } from 'react';
import { getStorageUsage, formatStorageSize, clearCache, deleteAllLocalData } from '../security-center';
import '../settings.css';

interface SecurityCenterPageProps {
  onNavigate?: (screen: string) => void;
}

export function SecurityCenterPage({ onNavigate }: SecurityCenterPageProps) {
  const [storageUsage, setStorageUsage] = useState<{ total: number; identity: number; messages: number; files: number; contacts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadStorageUsage();
  }, []);

  const loadStorageUsage = async () => {
    try {
      setLoading(true);
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage usage');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('This will clear all cached messages and files. Your identity will be preserved. Continue?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await clearCache();
      setSuccess('Cache cleared successfully');
      await loadStorageUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteIdentity = async () => {
    if (!confirm('This will delete your identity and all associated data. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteAllLocalData();
      setSuccess('All data deleted successfully. Redirecting to setup...');
      
      // Redirect to setup after delay
      setTimeout(() => {
        onNavigate?.('identity-setup');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    onNavigate?.('contacts');
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Security Center</h1>
          <button className="btn btn-secondary back-button" onClick={handleBack} aria-label="Back to contacts">
            ← Back
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status" aria-live="polite">
            {success}
          </div>
        )}

        {loading ? (
          <div className="loading" role="status" aria-live="polite">Loading...</div>
        ) : (
          <>
            <div className="settings-section">
              <h2>Storage Usage</h2>
              {storageUsage && (
                <div className="storage-usage">
                  <div className="storage-item">
                    <span className="storage-label">Identity</span>
                    <span className="storage-value">{formatStorageSize(storageUsage.identity)}</span>
                  </div>
                  <div className="storage-item">
                    <span className="storage-label">Messages</span>
                    <span className="storage-value">{formatStorageSize(storageUsage.messages)}</span>
                  </div>
                  <div className="storage-item">
                    <span className="storage-label">Files</span>
                    <span className="storage-value">{formatStorageSize(storageUsage.files)}</span>
                  </div>
                  <div className="storage-item">
                    <span className="storage-label">Contacts</span>
                    <span className="storage-value">{formatStorageSize(storageUsage.contacts)}</span>
                  </div>
                  <div className="storage-item total">
                    <span className="storage-label">Total</span>
                    <span className="storage-value">{formatStorageSize(storageUsage.total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-section">
              <h2>Data Management</h2>
              <div className="settings-actions">
                <button
                  className="btn btn-secondary settings-button"
                  onClick={handleClearCache}
                  disabled={isDeleting}
                  aria-label="Clear cached messages and files"
                >
                  {isDeleting ? 'Clearing...' : 'Clear Cache'}
                </button>
                <button
                  className="btn btn-danger settings-button"
                  onClick={handleDeleteIdentity}
                  disabled={isDeleting}
                  aria-label="Delete all local data including identity"
                >
                  {isDeleting ? 'Deleting...' : 'Delete All Data'}
                </button>
              </div>
              <p className="settings-hint">
                Clear Cache: Removes cached messages and files, preserves identity.<br />
                Delete All Data: Permanently deletes your identity and all associated data.
              </p>
            </div>

            <div className="settings-section">
              <h2>Security Information</h2>
              <div className="security-info">
                <div className="info-item">
                  <span className="info-label">Encryption</span>
                  <span className="info-value">End-to-end encrypted</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Private Keys</span>
                  <span className="info-value">Stored locally only</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Server Access</span>
                  <span className="info-value">No plaintext access</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
