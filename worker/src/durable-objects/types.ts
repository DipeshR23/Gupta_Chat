export interface Env {
  DB: D1Database;
  FILE_STORE: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

export interface ChatMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: string;
}

export interface ConnectedClient {
  id: string;
  userId: string;
  ws: WebSocket;
  lastSeen: number;
}
