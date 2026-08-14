/**
 * WebSocket client for Gupta_Chat
 * Handles real-time messaging via Cloudflare Durable Objects
 */

import { logger } from '../utils/logger';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
  id: string;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private authToken: string | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(url: string, authToken?: string) {
    this.url = url;
    this.authToken = authToken || null;
  }

  getUrl(): string {
    return this.url;
  }

  connect(authToken?: string): Promise<void> {
    if (authToken) {
      this.authToken = authToken;
    }

    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.shouldReconnect = true;

      try {
        const wsUrl = this.buildWsUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          logger.info('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = (event) => {
          logger.info('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.ws = null;

          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect().catch(() => {
                // Reconnect failed, will retry
              });
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private buildWsUrl(): string {
    const url = new URL(this.url);
    
    if (this.authToken) {
      url.searchParams.set('token', this.authToken);
    }
    
    return url.toString();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
        id: generateMessageId(),
      };
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('WebSocket not connected, cannot send message:', type);
    }
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Error in message handler:', error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(authToken?: string): WebSocketClient {
  if (!wsClient) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8787/ws';
    
    // Enforce secure WebSocket in production
    if (import.meta.env.PROD && wsUrl.startsWith('ws://')) {
      throw new Error('Insecure WebSocket connection not allowed in production. Use wss://');
    }
    
    wsClient = new WebSocketClient(wsUrl, authToken);
  } else if (authToken) {
    wsClient = new WebSocketClient(wsClient.getUrl(), authToken);
  }
  return wsClient;
}

export function setWebSocketAuthToken(authToken: string): void {
  if (wsClient) {
    wsClient = new WebSocketClient(wsClient.getUrl(), authToken);
  }
}

export function resetWebSocketClient(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}
