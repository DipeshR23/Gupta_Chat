/**
 * Verification feature module
 * Handles safety numbers, QR codes, identity verification
 */

export { VerificationPage } from './VerificationPage';
export { verifyIdentity, generateSafetyNumber, generateQRCode, parseQRCode } from './verification';
export type { SafetyNumber, VerificationState } from './verification';
