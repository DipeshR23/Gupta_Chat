import type { EncryptedMessage } from '../../types';
import type { DoubleRatchetSession } from '../../crypto/ratchet';

export interface MessagingState {
  messages: EncryptedMessage[];
  sessions: Map<string, DoubleRatchetSession>;
  loading: boolean;
  error: string | null;
  sending: boolean;
}
