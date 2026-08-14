import { useState, useEffect, useCallback } from 'react';
import { getWebSocketClient, type WebSocketMessage } from '../../websocket/client';
import { getSessionToken } from '../../storage/session-storage';
import { getDb } from '../../storage/db';
import { initX3DH } from '../../crypto/x3dh';
import { initializeSession, encryptMessage, decryptMessage, type DoubleRatchetSession } from '../../crypto/ratchet';
import { logger } from '../../utils/logger';
import type { EncryptedMessage, Contact } from '../../types';

export interface MessagingState {
  messages: EncryptedMessage[];
  sessions: Map<string, DoubleRatchetSession>;
  loading: boolean;
  error: string | null;
  sending: boolean;
}

export function useMessaging() {
  const [state, setState] = useState<MessagingState>({
    messages: [],
    sessions: new Map(),
    loading: false,
    error: null,
    sending: false,
  });
  const [contact, setContact] = useState<Contact | null>(null);
  const [seenMessageNumbers, setSeenMessageNumbers] = useState<Set<string>>(new Set());
  const authToken = getSessionToken();
  const wsClient = getWebSocketClient(authToken || undefined);

  useEffect(() => {
    loadMessages();
  }, [contact]);

  useEffect(() => {
    const handleCiphertextMessage = async (message: WebSocketMessage) => {
      const { sender, ciphertext, nonce, messageNumber } = message.payload as {
        sender: string;
        ciphertext: string;
        nonce: string;
        messageNumber: number;
      };

      if (!contact || sender !== contact.id) return;

      // Replay protection: reject duplicate message numbers
      const messageKey = `${sender}-${messageNumber}`;
      if (seenMessageNumbers.has(messageKey)) {
        logger.warn('Duplicate message detected, rejecting:', messageKey);
        return;
      }

      try {
        let session = state.sessions.get(sender);
        if (!session) {
          session = await initializeSession(
            new ArrayBuffer(32),
            sender,
            false,
            await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
            contact.publicIdentityKey
          );
        }

        const ciphertextBytes = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
        const nonceBytes = new Uint8Array(atob(nonce).split('').map(c => c.charCodeAt(0)));
        const ciphertextBuffer = ciphertextBytes.buffer;
        const nonceBuffer = nonceBytes.buffer;
        
        const { plaintext, updatedSession } = await decryptMessage(
          session,
          ciphertextBuffer,
          nonceBuffer,
          messageNumber
        );

        const newSessions = new Map(state.sessions);
        newSessions.set(sender, updatedSession);
        setState(prev => ({ ...prev, sessions: newSessions }));

        const text = new TextDecoder().decode(plaintext);

        const encryptedMessage: EncryptedMessage = {
          id: message.id,
          senderId: sender,
          recipientId: 'me',
          ciphertext: ciphertextBuffer,
          nonce: nonceBuffer,
          timestamp: new Date().toISOString(),
          status: 'delivered',
          plaintext: text,
        };

        await saveMessage(encryptedMessage);
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, encryptedMessage],
        }));

        // Mark message as seen for replay protection
        setSeenMessageNumbers(prev => {
          const next = new Set(prev);
          next.add(messageKey);
          return next;
        });
      } catch (error) {
        logger.error('Failed to decrypt message:', error);
      }
    };

    const handleMessageDelivered = (message: WebSocketMessage) => {
      const { messageId } = message.payload as {
        messageId: string;
      };

      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, status: 'delivered' as const } : msg
        ),
      }));
    };

    const handleMessageRead = (message: WebSocketMessage) => {
      const { messageId } = message.payload as {
        messageId: string;
      };

      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, status: 'read' as const } : msg
        ),
      }));
    };

    wsClient.on('message.ciphertext', handleCiphertextMessage);
    wsClient.on('message.delivered', handleMessageDelivered);
    wsClient.on('message.read', handleMessageRead);

    return () => {
      wsClient.off('message.ciphertext', handleCiphertextMessage);
      wsClient.off('message.delivered', handleMessageDelivered);
      wsClient.off('message.read', handleMessageRead);
    };
  }, [contact, state.sessions, wsClient]);

  const loadMessages = async () => {
    if (!contact) return;

    try {
      const db = await getDb();
      const messages = await db.getAllFromIndex('messages', 'contactId', contact.id);
      setState(prev => ({ ...prev, messages: messages as EncryptedMessage[] }));
    } catch (error) {
      logger.error('Failed to load messages:', error);
    }
  };

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!contact || !text.trim()) return false;

    setState(prev => ({ ...prev, sending: true, error: null }));

    try {
      // Get or create session
      let session = state.sessions.get(contact.id);
      if (!session) {
        // Initialize session via X3DH with signature verification
        const signatureBuffer = contact.signedPreKey.signature 
          ? Uint8Array.from(atob(contact.signedPreKey.signature), c => c.charCodeAt(0)).buffer
          : undefined;
        
        const sharedSecret = await initX3DH(
          await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']).then(k => k.publicKey),
          contact.signedPreKey.publicKey,
          contact.oneTimePreKeys[0]?.publicKey,
          contact.publicIdentityKey,
          signatureBuffer
        );

        session = await initializeSession(
          sharedSecret.sharedSecret,
          contact.id,
          true,
          await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
          contact.signedPreKey.publicKey
        );
      }

      // Encrypt message
      const plaintext = new TextEncoder().encode(text);
      const { ciphertext, nonce, updatedSession } = await encryptMessage(session, plaintext.buffer);

      // Update session
      const newSessions = new Map(state.sessions);
      newSessions.set(contact.id, updatedSession);
      setState(prev => ({ ...prev, sessions: newSessions }));

      // Send via WebSocket with message number for replay protection
      const messageNumber = updatedSession.sendingMessageNumber - 1;
      wsClient.send('message.send', {
        recipient: contact.id,
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
        nonce: btoa(String.fromCharCode(...new Uint8Array(nonce))),
        timestamp: new Date().toISOString(),
        messageNumber,
      });

      // Save message locally
      const message: EncryptedMessage = {
        id: generateMessageId(),
        senderId: 'me',
        recipientId: contact.id,
        ciphertext,
        nonce,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      await saveMessage(message);
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        sending: false,
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        sending: false,
      }));
      return false;
    }
  }, [contact, state.sessions, wsClient]);

  const markAsRead = useCallback(async (messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, status: 'read' as const } : msg
      ),
    }));

    wsClient.send('message.read', { messageId, timestamp: new Date().toISOString() });
  }, [wsClient]);

  const selectContact = useCallback((newContact: Contact) => {
    setContact(newContact);
    setState(prev => ({ ...prev, messages: [], sessions: new Map() }));
    setSeenMessageNumbers(new Set());
  }, []);

  return {
    ...state,
    contact,
    sendMessage,
    markAsRead,
    selectContact,
  };
}

async function saveMessage(message: EncryptedMessage): Promise<void> {
  const db = await getDb();
  await db.put('messages', message);
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
