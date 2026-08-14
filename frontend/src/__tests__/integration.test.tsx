/**
 * Integration tests for Gupta_Chat
 * Tests cross-module flows and user journeys
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdentitySetupPage } from '../features/identity';
import { ContactsPage } from '../features/contacts';
import { MessagingPage } from '../features/messaging';
import { SecurityCenterPage } from '../features/settings';
import { VerificationPage } from '../features/verification';

describe('Identity Flow Integration', () => {
  it('should render identity setup page', async () => {
    render(<IdentitySetupPage onIdentityCreated={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Create Your Identity')).toBeDefined();
    });
    expect(screen.getByLabelText('Username')).toBeDefined();
  });

  it('should update username input', async () => {
    render(<IdentitySetupPage onIdentityCreated={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Username')).toBeDefined();
    });
    
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    expect((usernameInput as HTMLInputElement).value).toBe('testuser');
  });
});

describe('Contacts Flow Integration', () => {
  it('should render contacts page with search form', async () => {
    render(<ContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeDefined();
    });
    expect(screen.getByLabelText('Username search')).toBeDefined();
    expect(screen.getByRole('button', { name: /add/i })).toBeDefined();
  });

  it('should show empty state when no contacts', async () => {
    render(<ContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No contacts yet')).toBeDefined();
    });
  });
});

describe('Messaging Flow Integration', () => {
  const mockContact = {
    id: 'contact-1',
    username: 'testcontact',
    publicIdentityKey: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' },
    signedPreKey: { keyId: 'key-1', publicKey: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }, signature: 'sig' },
    oneTimePreKeys: [],
  };

  it('should render messaging page with no contact selected', async () => {
    render(<MessagingPage contact={null} />);
    
    await waitFor(() => {
      expect(screen.getByText('Select a conversation')).toBeDefined();
    });
  });

  it('should have message input form when contact selected', async () => {
    render(<MessagingPage contact={mockContact} />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Message text')).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });
});

describe('Settings Flow Integration', () => {
  it('should render security center page', async () => {
    render(<SecurityCenterPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Security Center')).toBeDefined();
    });
  });

  it('should show loading state initially', async () => {
    render(<SecurityCenterPage />);
    
    expect(screen.getByRole('status')).toBeDefined();
  });
});

describe('Verification Flow Integration', () => {
  const mockContact = {
    id: 'contact-1',
    username: 'testcontact',
    publicIdentityKey: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' },
    signedPreKey: { keyId: 'key-1', publicKey: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' }, signature: 'sig' },
    oneTimePreKeys: [],
  };

  it('should render verification page with loading state', async () => {
    render(<VerificationPage contact={mockContact} />);
    
    expect(screen.getByText('Loading verification...')).toBeDefined();
  });
});

describe('Accessibility Integration', () => {
  it('should have proper heading structure in identity page', async () => {
    render(<IdentitySetupPage onIdentityCreated={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Your Identity' })).toBeDefined();
    });
  });

  it('should have search input with proper label in contacts page', async () => {
    render(<ContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Username search')).toBeDefined();
    });
  });
});
