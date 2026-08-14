import { useState, useEffect } from 'react';
import { IdentitySetupPage } from './features/identity';
import { ContactsPage } from './features/contacts';
import { MessagingPage } from './features/messaging';
import { FileSharingPage } from './features/files';
import { SecurityCenterPage } from './features/settings';
import { VerificationPage } from './features/verification';
import { loadIdentity } from './storage/identity-store';
import { useIdentity } from './features/identity/useIdentity';
import type { Contact } from './features/contacts';
import './App.css';
import './styles/primitives.css';

type Screen = 'identity-setup' | 'login' | 'contacts' | 'messaging' | 'files' | 'settings' | 'verification';

function App() {
  const [screen, setScreen] = useState<Screen>('identity-setup');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { isAuthenticated, login, logout } = useIdentity();

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await loadIdentity();
        if (stored) {
          // Identity exists; if already authenticated via session, go to contacts
          if (isAuthenticated) {
            setScreen('contacts');
          } else {
            setScreen('login');
          }
        }
      } catch (err) {
        console.error('Failed to load identity:', err);
      }
    };
    init();
  }, [isAuthenticated]);

  const handleIdentityCreated = () => {
    setScreen('contacts');
  };

  const handleLogin = async (username: string): Promise<boolean> => {
    const success = await login(username);
    if (success) {
      setScreen('contacts');
    }
    return success;
  };

  const handleLogout = async () => {
    await logout();
    setScreen('login');
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setScreen('messaging');
  };

  const handleNavigate = (newScreen: string) => {
    setScreen(newScreen as Screen);
  };

  const handleVerifyContact = (contact: Contact) => {
    setSelectedContact(contact);
    setScreen('verification');
  };

  return (
    <div className="app" role="application" aria-label="Gupta Chat">
      <a href="#main-content" className="sr-only">Skip to main content</a>
      <main id="main-content">
        {screen === 'identity-setup' && (
          <IdentitySetupPage onIdentityCreated={handleIdentityCreated} />
        )}

        {screen === 'login' && (
          <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />
        )}
        
        {screen === 'contacts' && (
          <ContactsPage
            onContactSelect={handleContactSelect}
            onNavigate={handleNavigate}
            onVerifyContact={handleVerifyContact}
            onLogout={handleLogout}
          />
        )}
        
        {screen === 'messaging' && (
          <MessagingPage
            contact={selectedContact}
            onNavigate={handleNavigate}
            onVerifyContact={handleVerifyContact}
          />
        )}
        
        {screen === 'files' && (
          <FileSharingPage
            contact={selectedContact}
            onNavigate={handleNavigate}
          />
        )}
        
        {screen === 'settings' && (
          <SecurityCenterPage onNavigate={handleNavigate} />
        )}

        {screen === 'verification' && selectedContact && (
          <VerificationPage contact={selectedContact} onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}

function LoginPage({ onLogin, onNavigate }: { onLogin: (username: string) => Promise<boolean>; onNavigate?: (screen: string) => void }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setError(null);
    const success = await onLogin(username.trim());
    setLoading(false);
    
    if (!success) {
      setError('Login failed. Please check your username.');
    }
  };

  return (
    <div className="screen">
      <div className="card" role="region" aria-labelledby="login-title">
        <h1 id="login-title">Welcome Back</h1>
        <p className="subtitle">
          Enter your username to sign in.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); }}
              placeholder="Enter your username"
              required
              minLength={3}
              maxLength={30}
              className="input"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !username.trim()}
            className="btn"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </form>

        {onNavigate && (
          <button 
            className="btn btn-secondary" 
            onClick={() => { onNavigate('identity-setup'); }}
            style={{ marginTop: 'var(--space-3)' }}
          >
            Create New Identity
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
