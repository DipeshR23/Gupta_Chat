import { useState } from 'react';
import { useIdentity } from '../useIdentity';
import '../identity.css';

interface IdentitySetupPageProps {
  onIdentityCreated?: () => void;
}

export function IdentitySetupPage({ onIdentityCreated }: IdentitySetupPageProps) {
  const [username, setUsername] = useState('');
  const { createNewIdentity, loading, error } = useIdentity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    const success = await createNewIdentity(username.trim());
    if (success) {
      onIdentityCreated?.();
    }
  };

  return (
    <div className="screen">
      <div className="card" role="region" aria-labelledby="identity-title">
        <h1 id="identity-title">Create Your Identity</h1>
        <p className="subtitle">
          Your cryptographic identity will be generated locally. 
          Your private keys never leave this device.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); }}
              placeholder="Choose a unique username"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, underscores, and hyphens"
              className="input"
            />
            <span className="hint">
              3-30 characters, letters, numbers, underscores, hyphens
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading || !username.trim()}
            className="btn"
          >
            {loading ? 'Creating Identity...' : 'Create Identity'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </form>

        <div className="security-info">
          <h3>Security Information</h3>
          <ul>
            <li>✅ Identity keys generated on your device</li>
            <li>✅ Private keys never sent to server</li>
            <li>✅ End-to-end encryption enabled</li>
            <li>✅ Forward secrecy through Double Ratchet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
