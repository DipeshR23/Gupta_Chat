import { useState } from 'react';
import { useContacts, type Contact } from '../useContacts';
import '../contacts.css';

interface ContactsPageProps {
  onContactSelect?: (contact: Contact) => void;
  onNavigate?: (screen: string) => void;
  onVerifyContact?: (contact: Contact) => void;
  onLogout?: () => void;
}

export function ContactsPage({ onContactSelect, onNavigate, onVerifyContact, onLogout }: ContactsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { contacts, loading, error, searchContact, removeContact } = useContacts();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    await searchContact(searchQuery.trim());
  };

  const handleContactClick = (contact: Contact) => {
    onContactSelect?.(contact);
    onNavigate?.('messaging');
  };

  const handleSettingsClick = () => {
    onNavigate?.('settings');
  };

  const handleLogoutClick = async () => {
    await onLogout?.();
  };

  return (
    <div className="contacts-page">
      <div className="contacts-sidebar">
        <div className="contacts-header">
          <h1>Contacts</h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {onLogout && (
              <button className="btn btn-secondary" onClick={handleLogoutClick} aria-label="Sign out">
                Sign Out
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleSettingsClick} aria-label="Open settings">
              Settings
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="search-form" aria-label="Search contacts">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); }}
            placeholder="Search by username..."
            className="input search-input"
            aria-label="Username search"
          />
          <button type="submit" disabled={loading} className="btn">
            {loading ? 'Searching...' : 'Add'}
          </button>
        </form>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="contacts-list" role="list" aria-label="Contacts list">
          {contacts.length === 0 ? (
            <div className="empty-state">
              <p>No contacts yet</p>
              <p className="hint">Search for a username to add a contact</p>
            </div>
          ) : (
            contacts.map(contact => (
              <div
                key={contact.id}
                className="contact-item"
                onClick={() => { handleContactClick(contact); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleContactClick(contact);
                  }
                }}
                tabIndex={0}
                role="listitem"
                aria-label={`${contact.username}, click to open conversation`}
              >
                <div className="contact-avatar">
                  {contact.username.charAt(0).toUpperCase()}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{contact.username}</div>
                  <div className="contact-status">Online</div>
                </div>
                <button
                  className="remove-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeContact(contact.id);
                  }}
                  aria-label={`Remove ${contact.username}`}
                >
                  ×
                </button>
                {onVerifyContact && (
                  <button
                    className="remove-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerifyContact(contact);
                    }}
                    aria-label={`Verify identity with ${contact.username}`}
                    title="Verify identity"
                  >
                    ✓
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="contacts-main">
        <div className="empty-state">
          <h2>Welcome to Gupta_Chat</h2>
          <p>Select a contact to start a secure conversation</p>
        </div>
      </div>
    </div>
  );
}
