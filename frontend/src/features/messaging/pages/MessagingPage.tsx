import { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../useMessaging';
import type { Contact } from '../../contacts';
import '../messaging.css';

interface MessagingPageProps {
  contact: Contact | null;
  onNavigate?: (screen: string) => void;
  onVerifyContact?: (contact: Contact) => void;
}

export function MessagingPage({ contact, onNavigate, onVerifyContact }: MessagingPageProps) {
  const [messageText, setMessageText] = useState('');
  const [disappearingTtl, setDisappearingTtl] = useState<number | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    markAsRead,
    selectContact,
  } = useMessaging();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (contact) {
      markAsRead('');
    }
  }, [contact, markAsRead]);

  useEffect(() => {
    if (contact) {
      selectContact(contact);
    }
  }, [contact, selectContact]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigate?.('contacts');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => { window.removeEventListener('keydown', handleEscape); };
  }, [onNavigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    const success = await sendMessage(messageText.trim());
    if (success) {
      setMessageText('');
    }
  };

  const handleBackToContacts = () => {
    onNavigate?.('contacts');
  };

  if (!contact) {
    return (
      <div className="messaging-page">
        <div className="messaging-sidebar">
          <div className="messaging-header">
            <h1>Messages</h1>
            <button className="btn btn-secondary back-button" onClick={handleBackToContacts}>
              ← Back
            </button>
          </div>
          <div className="contacts-list">
            <div className="empty-state">
              <p>No conversation selected</p>
              <p className="hint">Select a contact to start messaging</p>
            </div>
          </div>
        </div>
        <div className="messaging-main">
          <div className="empty-state">
            <h2>Select a conversation</h2>
            <p>Choose a contact from the sidebar to start a secure conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messaging-page">
      <div className="messaging-sidebar">
        <div className="messaging-header">
          <h1>Messages</h1>
          <button className="btn btn-secondary back-button" onClick={handleBackToContacts}>
            ← Back
          </button>
        </div>
        <div className="contacts-list">
          <div className="empty-state">
            <p>No other contacts</p>
          </div>
        </div>
      </div>

      <div className="messaging-main">
        <div className="conversation-header">
          <div className="contact-info">
            <div className="contact-avatar">
              {contact.username.charAt(0).toUpperCase()}
            </div>
            <div className="contact-details">
              <div className="contact-name">{contact.username}</div>
              <div className="contact-status">Online</div>
            </div>
          </div>
          <div className="disappearing-message-selector">
            <label htmlFor="disappearing">Disappearing messages:</label>
            <select
              id="disappearing"
              value={disappearingTtl ?? 'off'}
              onChange={(e) => {
                const value = e.target.value;
                setDisappearingTtl(value === 'off' ? undefined : parseInt(value));
              }}
            >
              <option value="off">Off</option>
              <option value="3600">1 hour</option>
              <option value="86400">1 day</option>
              <option value="604800">1 week</option>
            </select>
          </div>
          {onVerifyContact && (
            <button
              className="btn btn-secondary"
              onClick={() => { onVerifyContact(contact); }}
              aria-label={`Verify identity with ${contact.username}`}
            >
              Verify
            </button>
          )}
        </div>

        <div className="messages-container" aria-live="polite" aria-label="Messages">
          {loading && (
            <div className="loading-indicator" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" style={{ margin: '0 auto var(--space-2)' }} />
              Loading messages...
            </div>
          )}
          {error && <div className="error-message" role="alert">{error}</div>}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.senderId === 'me' ? 'sent' : 'received'}`}
              aria-label={`${message.senderId === 'me' ? 'You' : contact.username}: ${message.plaintext || '[Encrypted]'}`}
            >
              <div className="message-content">
                <div className="message-text">{message.plaintext || '[Encrypted]'}</div>
                <div className="message-meta">
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="message-status" aria-label={`Status: ${message.status}`}>
                    {message.status === 'sending' && '⏳'}
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && '✓✓'}
                    {message.status === 'failed' && '❌'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="message-input-form" aria-label="Send message">
          <input
            type="text"
            value={messageText}
            onChange={(e) => { setMessageText(e.target.value); }}
            placeholder="Type a message..."
            disabled={sending}
            className="input message-input"
            aria-label="Message text"
          />
          <button 
            type="submit" 
            disabled={sending || !messageText.trim()}
            className="btn send-button"
            aria-label="Send message"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
        {sending && (
          <div className="sr-only" aria-live="assertive" aria-atomic="true">
            Sending message...
          </div>
        )}
        {error && (
          <div className="sr-only" aria-live="assertive" aria-atomic="true" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
