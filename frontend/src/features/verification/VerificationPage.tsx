import { useState, useEffect } from 'react';
import { generateSafetyNumber, generateQRCode } from './verification';
import { loadIdentity } from '../../storage/identity-store';
import { getDb } from '../../storage/db';
import type { Contact } from '../../types';
import './verification.css';

export function VerificationPage({ contact, onNavigate }: { contact: Contact; onNavigate?: (screen: string) => void }) {
  const [safetyNumber, setSafetyNumber] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<'compare' | 'confirm'>('compare');

  useEffect(() => {
    loadVerification();
  }, [contact]);

  const loadVerification = async () => {
    try {
      setLoading(true);
      const identity = await loadIdentity();
      if (!identity) {
        setError('No identity found');
        return;
      }

      const safety = await generateSafetyNumber(
        {
          userId: identity.id,
          username: identity.username,
          publicIdentityKey: identity.publicIdentityKey,
          signedPreKey: identity.signedPreKey,
          oneTimePreKeys: identity.oneTimePreKeys,
        },
        contact
      );

      setSafetyNumber(safety);
      
      const qr = await generateQRCode(safety);
      setQrCode(qr);

      // Check if already verified
      const verified = await checkVerificationStatus(contact.id);
      setIsVerified(verified);
      setVerificationStep(verified ? 'confirm' : 'compare');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification');
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async (contactId: string): Promise<boolean> => {
    try {
      const db = await getDb();
      const record = await db.get('verifiedContacts', contactId);
      return !!record?.verified;
    } catch {
      return false;
    }
  };

  const handleMarkAsVerified = async () => {
    try {
      const db = await getDb();
      await db.put('verifiedContacts', {
        id: contact.id,
        verified: true,
        verifiedAt: new Date().toISOString(),
        safetyNumber,
      });
      setIsVerified(true);
      setVerificationStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save verification');
    }
  };

  const handleResetVerification = async () => {
    try {
      const db = await getDb();
      await db.delete('verifiedContacts', contact.id);
      setIsVerified(false);
      setVerificationStep('compare');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset verification');
    }
  };

  const formatSafetyNumber = (number: string): string => {
    const groups = number.split('  ');
    const formatted = [];
    for (let i = 0; i < groups.length; i += 3) {
      formatted.push(groups.slice(i, i + 3).join('  '));
    }
    return formatted.join('\n');
  };

  if (loading) {
    return (
      <div className="screen">
        <div className="card">
          <p>Loading verification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen">
        <div className="card">
          <div className="error-message" role="alert">{error}</div>
          {onNavigate && (
            <button className="btn btn-secondary" onClick={() => { onNavigate('contacts'); }} style={{ marginTop: 'var(--space-3)' }}>
              ← Back to Contacts
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h1 style={{ margin: 0 }}>Verify Identity</h1>
          {onNavigate && (
            <button className="btn btn-secondary" onClick={() => { onNavigate('contacts'); }} aria-label="Back to contacts">
              ← Back
            </button>
          )}
        </div>
        <p className="subtitle">
          Verify that your conversation with <strong>{contact.username}</strong> is secure.
        </p>

        <div className="verification-status">
          {isVerified ? (
            <div className="verified">
              <span className="verified-icon">✓</span>
              <span>Verified</span>
            </div>
          ) : (
            <div className="unverified">
              <span className="unverified-icon">⚠</span>
              <span>Not Verified</span>
            </div>
          )}
        </div>

        {verificationStep === 'compare' && (
          <div className="verification-compare">
            <div className="safety-number-section">
              <h2>Step 1: Compare Safety Number</h2>
              <p className="hint">
                Compare this number with your contact in person or through a trusted channel. 
                Both of you should see the same number.
              </p>
              <div className="safety-number">
                {formatSafetyNumber(safetyNumber)}
              </div>
            </div>

            <div className="qr-code-section">
              <h2>Step 2: Scan QR Code</h2>
              <p className="hint">
                Have your contact scan this QR code with their device, or scan theirs.
              </p>
              {qrCode && (
                <div className="qr-code">
                  <img src={qrCode} alt="Verification QR Code" />
                </div>
              )}
            </div>

            <div className="verification-actions">
              <button className="btn" onClick={handleMarkAsVerified}>
                ✓ I have verified the safety number
              </button>
            </div>
          </div>
        )}

        {verificationStep === 'confirm' && (
          <div className="verification-confirmed">
            <div className="safety-number-section">
              <h2>Verified Safety Number</h2>
              <p className="hint">
                You have verified this contact. The safety number below should match on both devices.
              </p>
              <div className="safety-number verified">
                {formatSafetyNumber(safetyNumber)}
              </div>
            </div>

            <div className="verification-actions">
              <button className="btn btn-secondary" onClick={loadVerification}>
                Refresh Verification
              </button>
              <button className="btn btn-danger" onClick={handleResetVerification}>
                Reset Verification
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
