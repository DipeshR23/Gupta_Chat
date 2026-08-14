import { Env } from '../durable-objects/types';

export interface FileRecord {
  id: string;
  sender_id: string;
  recipient_id: string;
  storage_object_id: string;
  size: number;
  created_at: string;
  expires_at: string;
  status: string;
}

export class FileService {
  async createFileRecord(data: {
    fileId: string;
    senderId: string;
    recipientId: string;
    size: number;
    mimeType: string;
    filename: string;
  }, env: Env): Promise<FileRecord> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO file_records (id, sender_id, recipient_id, storage_object_id, size, created_at, expires_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.fileId,
      data.senderId,
      data.recipientId,
      data.fileId, // storage_object_id is the same as fileId for R2
      data.size,
      now,
      expiresAt,
      'active'
    ).run();

    return {
      id: data.fileId,
      sender_id: data.senderId,
      recipient_id: data.recipientId,
      storage_object_id: data.fileId,
      size: data.size,
      created_at: now,
      expires_at: expiresAt,
      status: 'active',
    };
  }

  async getFile(fileId: string, env: Env): Promise<FileRecord | null> {
    const file = await env.DB.prepare(
      'SELECT * FROM file_records WHERE id = ?'
    ).bind(fileId).first<FileRecord>();

    return file || null;
  }

  async getFilesForUser(userId: string, env: Env): Promise<FileRecord[]> {
    const result = await env.DB.prepare(
      `SELECT id, sender_id, recipient_id, storage_object_id, size, created_at, expires_at, status
       FROM file_records
       WHERE recipient_id = ? AND status = 'active'
       ORDER BY created_at DESC`
    ).bind(userId).all<FileRecord>();

    return result.results;
  }

  async markAsDelivered(fileId: string, env: Env): Promise<void> {
    await env.DB.prepare(
      'UPDATE file_records SET status = ? WHERE id = ?'
    ).bind('delivered', fileId).run();
  }

  async deleteFile(fileId: string, env: Env): Promise<void> {
    await env.DB.prepare(
      'DELETE FROM file_records WHERE id = ?'
    ).bind(fileId).run();
  }

  async cleanupExpiredFiles(env: Env): Promise<string[]> {
    const now = new Date().toISOString();
    const expired = await env.DB.prepare(
      "SELECT id, storage_object_id FROM file_records WHERE expires_at < ? AND status = 'active'"
    ).bind(now).all<{ id: string; storage_object_id: string }>();

    const deletedIds: string[] = [];
    for (const file of expired.results) {
      await env.DB.prepare(
        'UPDATE file_records SET status = ? WHERE id = ?'
      ).bind('expired', file.id).run();
      deletedIds.push(file.id);
    }

    return deletedIds;
  }
}
