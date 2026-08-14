import { useState, useRef, useEffect } from 'react';
import { useFileSharing } from '../useFileSharing';
import type { Contact } from '../../contacts';
import '../files.css';

interface FileSharingPageProps {
  contact: Contact | null;
  onNavigate?: (screen: string) => void;
}

export function FileSharingPage({ contact, onNavigate }: FileSharingPageProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contact);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    files,
    uploading,
    downloading,
    error,
    progress,
    selectFile,
    downloadFile,
    deleteFile,
    setContact,
  } = useFileSharing();

  useEffect(() => {
    if (contact) {
      setSelectedContact(contact);
      setContact(contact);
    }
  }, [contact, setContact]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await selectFile(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📎';
  };

  const handleBack = () => {
    onNavigate?.('contacts');
  };

  return (
    <div className="file-sharing-page">
      <div className="file-sharing-sidebar">
        <div className="file-sharing-header">
          <h1>Files</h1>
          <button className="btn btn-secondary back-button" onClick={handleBack} aria-label="Back to contacts">
            ← Back
          </button>
        </div>
        <div className="contacts-list">
          {selectedContact ? (
            <div className="contact-item selected">
              <div className="contact-avatar">
                {selectedContact.username.charAt(0).toUpperCase()}
              </div>
              <div className="contact-details">
                <div className="contact-name">{selectedContact.username}</div>
                <div className="contact-status">Online</div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Select a contact from the Contacts page to share files.</p>
            </div>
          )}
        </div>
      </div>

      <div className="file-sharing-main">
        {!selectedContact ? (
          <div className="empty-state">
            <h2>Select a contact</h2>
            <p>Choose a contact to share encrypted files</p>
          </div>
        ) : (
          <>
            <div className="file-sharing-header">
              <div className="contact-info">
                <div className="contact-avatar">
                  {selectedContact.username.charAt(0).toUpperCase()}
                </div>
                <div className="contact-details">
                  <div className="contact-name">{selectedContact.username}</div>
                  <div className="contact-status">Online</div>
                </div>
              </div>
              <button
                className="btn select-file-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Select file to share"
              >
                {uploading ? 'Encrypting...' : 'Select File'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                aria-label="File input"
              />
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {uploading && (
              <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="File upload progress">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="files-list" aria-live="polite" aria-label="Shared files">
              {files.length === 0 ? (
                <div className="empty-state">
                  <p>No files shared yet</p>
                  <p className="hint">Click "Select File" to share an encrypted file</p>
                </div>
              ) : (
                files.map(file => (
                  <div key={file.fileId} className="file-item">
                    <div className="file-icon">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{file.filename}</div>
                      <div className="file-meta">
                        <span>{formatFileSize(file.originalSize)}</span>
                        <span className="file-status">
                          {file.status === 'pending' && '⏳ Encrypting...'}
                          {file.status === 'uploaded' && '✓ Uploaded'}
                          {file.status === 'delivered' && '✓✓ Delivered'}
                          {file.status === 'expired' && '⏰ Expired'}
                        </span>
                      </div>
                    </div>
                    <div className="file-actions">
                      {file.status === 'uploaded' && (
                        <button
                          className="btn download-button"
                          onClick={() => downloadFile(file.fileId)}
                          disabled={downloading}
                          aria-label={`Download ${file.filename}`}
                        >
                          {downloading ? 'Downloading...' : 'Download'}
                        </button>
                      )}
                      <button
                        className="delete-button"
                        onClick={() => deleteFile(file.fileId)}
                        aria-label={`Delete ${file.filename}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
