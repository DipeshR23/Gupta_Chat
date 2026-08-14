import { Env } from '../durable-objects/types';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  ciphertext: string;
  nonce: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  message_number: number;
}

export class MessageService {
  async sendMessage(data: {
    senderId: string;
    recipientId: string;
    ciphertext: string;
    nonce: string;
    messageNumber: number;
  }, env: Env): Promise<Message> {
    const messageId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO messages (id, sender_id, recipient_id, ciphertext, nonce, timestamp, status, message_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      messageId,
      data.senderId,
      data.recipientId,
      data.ciphertext,
      data.nonce,
          timestamp,
      'sent',
      data.messageNumber
    ).run();

    return {
      id: messageId,
      sender_id: data.senderId,
      recipient_id: data.recipientId,
      ciphertext: data.ciphertext,
      nonce: data.nonce,
      timestamp,
      status: 'sent',
      message_number: data.messageNumber,
    };
  }

  async getPendingMessages(recipientId: string, env: Env): Promise<Message[]> {
    const result = await env.DB.prepare(
      `SELECT id, sender_id, recipient_id, ciphertext, nonce, timestamp, status, message_number
       FROM messages
       WHERE recipient_id = ? AND status IN ('sent', 'delivered')
       ORDER BY timestamp ASC`
    ).bind(recipientId).all<Message>();

    return result.results;
  }

  async markAsDelivered(messageId: string, env: Env): Promise<void> {
    await env.DB.prepare(
      'UPDATE messages SET status = ? WHERE id = ?'
    ).bind('delivered', messageId).run();
  }

  async markAsRead(messageId: string, env: Env): Promise<void> {
    await env.DB.prepare(
      'UPDATE messages SET status = ? WHERE id = ?'
    ).bind('read', messageId).run();
  }

  async getMessages(userId: string, contactId: string, env: Env): Promise<Message[]> {
    const result = await env.DB.prepare(
      `SELECT id, sender_id, recipient_id, ciphertext, nonce, timestamp, status, message_number
       FROM messages
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY timestamp ASC`
    ).bind(userId, contactId, contactId, userId).all<Message>();

    return result.results;
  }
}
