import { useState, useCallback } from 'react';
import { encryptFile, decryptFile, isSupportedFileType, isSupportedFileSize } from '../../crypto/file-crypto';
import { getWebSocketClient } from '../../websocket/client';
import { getSessionToken } from '../../storage/session-storage';
import { getDb } from '../../storage/db';
import { logger } from '../../utils/logger';
import type { EncryptedFile, Contact } from '../../types';

export interface FileSharingState {
  files: EncryptedFile[];
  uploading: boolean;
  downloading: boolean;
  error: string | null;
  progress: number;
}

export function useFileSharing() {
  const [state, setState] = useState<FileSharingState>({
    files: [],
    uploading: false,
    downloading: false,
    error: null,
    progress: 0,
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const authToken = getSessionToken();
  const wsClient = getWebSocketClient(authToken || undefined);

  const selectFile = useCallback(async (file: File): Promise<boolean> => {
    if (!isSupportedFileType(file.type)) {
      setState(prev => ({ ...prev, error: `Unsupported file type: ${file.type}` }));
      return false;
    }

    if (!isSupportedFileSize(file.size)) {
      setState(prev => ({ ...prev, error: 'File size exceeds 50MB limit' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, uploading: true, error: null, progress: 0 }));

      // Read file
      const buffer = await file.arrayBuffer();
      
      // Encrypt file client-side
      const encrypted = await encryptFile(buffer, file.type);
      
      // Store encrypted file locally
      const db = await getDb();
      await db.put('files', {
        fileId: encrypted.fileId,
        contactId: selectedContact?.id || '',
        encryptedKey: encrypted.encryptedKey,
        nonce: encrypted.nonce,
        ciphertext: encrypted.ciphertext,
        originalSize: encrypted.originalSize,
        mimeType: encrypted.mimeType,
        filename: file.name,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        status: 'pending',
      });

      // Send file reference via WebSocket
      wsClient.send('file.available', {
        fileId: encrypted.fileId,
        recipient: selectedContact?.id,
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encrypted.encryptedKey))),
        nonce: btoa(String.fromCharCode(...new Uint8Array(encrypted.nonce))),
        size: encrypted.originalSize,
        mimeType: encrypted.mimeType,
        filename: file.name,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      setState(prev => ({
        ...prev,
        files: [...prev.files, {
          fileId: encrypted.fileId,
          senderId: 'me',
          recipientId: selectedContact?.id || '',
          encryptedKey: encrypted.encryptedKey,
          nonce: encrypted.nonce,
          ciphertext: encrypted.ciphertext,
          originalSize: encrypted.originalSize,
          mimeType: encrypted.mimeType,
          filename: file.name,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        }],
        uploading: false,
        progress: 100,
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send file',
        uploading: false,
      }));
      return false;
    }
  }, [selectedContact, wsClient]);

  const downloadFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, downloading: true, error: null }));

      // Get file metadata from storage
      const db = await getDb();
      const file = await db.get('files', fileId) as EncryptedFile | undefined;
      
      if (!file) {
        throw new Error('File not found');
      }

      // Decrypt file
      const decrypted = await decryptFile(
        file.encryptedKey,
        file.nonce,
        file.ciphertext
      );

      // Create download link
      const blob = new Blob([decrypted], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState(prev => ({
        ...prev,
        files: prev.files.map(f =>
          f.fileId === fileId ? { ...f, status: 'delivered' as const } : f
        ),
        downloading: false,
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to download file',
        downloading: false,
      }));
      return false;
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.delete('files', fileId);
      
      setState(prev => ({
        ...prev,
        files: prev.files.filter(f => f.fileId !== fileId),
      }));
    } catch (error) {
      logger.error('Failed to delete file:', error);
    }
  }, []);

  const setContact = useCallback((contact: Contact | null) => {
    setSelectedContact(contact);
    loadFiles(contact?.id || '');
  }, []);

  const loadFiles = async (contactId: string) => {
    try {
      const db = await getDb();
      const files = await db.getAllFromIndex('files', 'contactId', contactId);
      setState(prev => ({
        ...prev,
        files: files as EncryptedFile[],
      }));
    } catch (error) {
      logger.error('Failed to load files:', error);
    }
  };

  return {
    ...state,
    selectedContact,
    selectFile,
    downloadFile,
    deleteFile,
    setContact,
  };
}
