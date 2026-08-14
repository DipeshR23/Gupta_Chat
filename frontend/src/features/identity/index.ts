/**
 * Identity feature module
 * Handles username identity, key generation, and registration
 */

export { IdentitySetupPage } from './pages/IdentitySetupPage';
export { useIdentity } from './useIdentity';
export type { IdentityKeys } from '../../crypto/keys';
export type { StoredIdentity } from '../../storage/identity-store';
