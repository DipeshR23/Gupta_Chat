/**
 * Verification utilities for Gupta_Chat
 * Safety numbers, QR codes, identity verification
 */

import { generateId } from '../../crypto/utils';
import type { Identity } from '../../types';
import { getDb } from '../../storage/db';

export interface SafetyNumber {
  value: string;
  contactId: string;
  contactName: string;
  createdAt: string;
}

export interface VerificationState {
  verified: boolean;
  safetyNumber: SafetyNumber | null;
  qrCodeDataUrl: string | null;
  scanning: boolean;
}

/**
 * Generate safety number from two identity public keys
 * Safety number is a hash of both users' identity keys
 */
export async function generateSafetyNumber(
  userIdentity: Identity,
  contactIdentity: { publicIdentityKey: JsonWebKey }
): Promise<string> {
  const userKeyData = JSON.stringify(userIdentity.publicIdentityKey);
  const contactKeyData = JSON.stringify(contactIdentity.publicIdentityKey);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(userKeyData + contactKeyData);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Convert to decimal string and format with spaces
  const decimal = Array.from(hashArray)
    .map(b => b.toString(10).padStart(3, '0'))
    .join('');
  
  // Format as groups of 5 digits
  const groups = decimal.match(/.{1,5}/g) || [];
  return groups.slice(0, 12).join('  ');
}

/**
 * Generate QR code data URL for verification
 * In a real implementation, use a QR code library
 */
export async function generateQRCode(data: string): Promise<string> {
  // Simplified QR code generation
  // In production, use a library like qrcode
  const qrData = btoa(data);
  return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="white"/><text x="128" y="128" text-anchor="middle" font-size="12">${qrData.substring(0, 50)}...</text></svg>`)}`;
}

/**
 * Parse QR code data
 * @throws Error - QR code scanning requires an external library and is not implemented in V1
 */
export async function parseQRCode(_imageData: string): Promise<string> {
  throw new Error('QR code scanning is not implemented in V1. Use safety number comparison instead.');
}

/**
 * Verify identity by comparing safety numbers
 */
export async function verifyIdentity(
  userIdentity: Identity,
  contactIdentity: { publicIdentityKey: JsonWebKey }
): Promise<boolean> {
  const safetyNumber = await generateSafetyNumber(userIdentity, contactIdentity);
  const storedSafetyNumber = await getStoredSafetyNumber(contactIdentity.publicIdentityKey);
  
  if (!storedSafetyNumber) {
    // First verification, store the safety number
    await storeSafetyNumber(contactIdentity.publicIdentityKey, safetyNumber);
    return true;
  }
  
  return safetyNumber === storedSafetyNumber.value;
}

/**
 * Store safety number for a contact
 */
export async function storeSafetyNumber(
  contactPublicKey: JsonWebKey,
  safetyNumber: string
): Promise<void> {
  const db = await getDb();
  await db.put('safetyNumbers', {
    id: generateId(),
    contactPublicKey: JSON.stringify(contactPublicKey),
    safetyNumber,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Get stored safety number for a contact
 */
export async function getStoredSafetyNumber(
  contactPublicKey: JsonWebKey
): Promise<SafetyNumber | null> {
  const db = await getDb();
  const all = await db.getAll('safetyNumbers');
  
  const record = all.find((item: { contactPublicKey: string }) => 
    JSON.parse(item.contactPublicKey) === contactPublicKey
  );
  
  if (!record) return null;
  
  return {
    value: record.safetyNumber,
    contactId: JSON.parse(record.contactPublicKey).x,
    contactName: '',
    createdAt: record.createdAt,
  };
}
