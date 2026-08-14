import { ChatMessage, ConnectedClient, Env } from './types';
import { logError, logWarn } from '../utils/logger';

export class ChatRoom {
  private state: DurableObjectState;
  private env: Env;
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private messageQueue: Map<string, ChatMessage[]> = new Map();
  private seenMessageNumbers: Map<string, Set<number>> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Authenticate via token from upgrade request headers or query params
    let userId: string;
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (token) {
      const session = await this.env.DB.prepare(
        'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, new Date().toISOString()).first<{ user_id: string }>();
      
      if (!session) {
        return new Response('Invalid or expired session', { status: 401 });
      }
      userId = session.user_id;
    } else {
      // Fallback for backward compatibility during transition
      userId = url.searchParams.get('userId') || 'anonymous';
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    server.accept();

    const clientInfo: ConnectedClient = {
      id: crypto.randomUUID(),
      userId,
      ws: server,
      lastSeen: Date.now(),
    };

    this.clients.set(server, clientInfo);

    // Send queued messages
    const queuedMessages = this.messageQueue.get(userId) || [];
    for (const message of queuedMessages) {
      server.send(JSON.stringify(message));
    }
    this.messageQueue.delete(userId);

    server.addEventListener('message', (event) => {
      this.handleMessage(clientInfo, event.data as string);
    });

    server.addEventListener('close', () => {
      this.clients.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleMessage(client: ConnectedClient, data: string): Promise<void> {
    try {
      const message = JSON.parse(data) as ChatMessage;
      
      switch (message.type) {
        case 'message.send':
          await this.handleSendMessage(client, message);
          break;
        case 'message.ack':
          await this.handleAck(client, message);
          break;
        case 'message.read':
          await this.handleRead(client, message);
          break;
        case 'file.available':
          await this.handleFileAvailable(client, message);
          break;
        default:
          logWarn('chatroom.unknown-message-type', { type: message.type });
      }
    } catch (error) {
      logError('chatroom.message-handler', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleSendMessage(sender: ConnectedClient, message: ChatMessage): Promise<void> {
    const { recipient, ciphertext, nonce, timestamp, messageNumber } = message.payload as {
      recipient: string;
      ciphertext: string;
      nonce: string;
      timestamp: string;
      messageNumber?: number;
    };

    // Replay protection: track message numbers
    if (typeof messageNumber === 'number') {
      const senderKey = sender.userId;
      const seenNumbers = this.seenMessageNumbers.get(senderKey) || new Set<number>();
      
      if (seenNumbers.has(messageNumber)) {
        // Duplicate message, ignore
        sender.ws.send(JSON.stringify({
          id: message.id,
          type: 'message.sent',
          payload: { messageId: message.id, timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        }));
        return;
      }
      
      seenNumbers.add(messageNumber);
      this.seenMessageNumbers.set(senderKey, seenNumbers);
      
      // Clean up old message numbers (keep last 1000)
      if (seenNumbers.size > 1000) {
        const sorted = Array.from(seenNumbers).sort((a, b) => a - b);
        const toRemove = sorted.slice(0, sorted.length - 1000);
        for (const num of toRemove) {
          seenNumbers.delete(num);
        }
      }
    }

    // Find recipient's connection
    let recipientClient: WebSocket | null = null;
    for (const client of this.clients.values()) {
      if (client.userId === recipient) {
        recipientClient = client.ws;
        break;
      }
    }

    const chatMessage: ChatMessage = {
      id: message.id,
      type: 'message.ciphertext',
      payload: {
        sender: sender.userId,
        ciphertext,
        nonce,
        timestamp,
        messageNumber: messageNumber ?? 0,
      },
      timestamp: message.timestamp,
    };

    if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
      // Send directly to recipient
      recipientClient.send(JSON.stringify(chatMessage));
    } else {
      // Queue message for later
      const queue = this.messageQueue.get(recipient) || [];
      queue.push(chatMessage);
      this.messageQueue.set(recipient, queue);
    }

    // Send acknowledgment to sender
    sender.ws.send(JSON.stringify({
      id: message.id,
      type: 'message.sent',
      payload: { messageId: message.id, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    }));
  }

  private async handleAck(client: ConnectedClient, message: ChatMessage): Promise<void> {
    const { messageId } = message.payload as { messageId: string };
    
    // Forward acknowledgment to original sender
    for (const c of this.clients.values()) {
      if (c.userId !== client.userId) {
        c.ws.send(JSON.stringify({
          id: message.id,
          type: 'message.delivered',
          payload: { messageId, timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        }));
        break;
      }
    }
  }

  private async handleRead(client: ConnectedClient, message: ChatMessage): Promise<void> {
    const { messageId } = message.payload as { messageId: string };
    
    // Forward read receipt to original sender
    for (const c of this.clients.values()) {
      if (c.userId !== client.userId) {
        c.ws.send(JSON.stringify({
          id: message.id,
          type: 'message.read',
          payload: { messageId, timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        }));
        break;
      }
    }
  }

  private async handleFileAvailable(sender: ConnectedClient, message: ChatMessage): Promise<void> {
    const payload = message.payload as {
      fileId: string;
      recipient: string;
      encryptedKey: string;
      nonce: string;
      size: number;
      mimeType: string;
      filename: string;
      expiresAt: string;
    };

    const fileMessage: ChatMessage = {
      id: message.id,
      type: 'file.available',
      payload,
      timestamp: message.timestamp,
    };

    // Find recipient's connection
    let recipientClient: WebSocket | null = null;
    for (const client of this.clients.values()) {
      if (client.userId === payload.recipient) {
        recipientClient = client.ws;
        break;
      }
    }

    if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
      recipientClient.send(JSON.stringify(fileMessage));
    } else {
      const queue = this.messageQueue.get(payload.recipient) || [];
      queue.push(fileMessage);
      this.messageQueue.set(payload.recipient, queue);
    }

    // Acknowledge to sender
    sender.ws.send(JSON.stringify({
      id: message.id,
      type: 'file.available',
      payload: { ...payload, status: 'delivered' },
      timestamp: new Date().toISOString(),
    }));
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Handle incoming WebSocket messages
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    this.clients.delete(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    logError('chatroom.websocket-error', error instanceof Error ? error : new Error(String(error)));
    this.clients.delete(ws);
  }
}
