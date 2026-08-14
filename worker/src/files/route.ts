import { FileService } from '../files/service';
import { createErrorResponse, createJsonResponse } from '../utils/errors';
import { Env } from '../durable-objects/types';
import { logError } from '../utils/logger';

const fileService = new FileService();

export async function handleFileRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // Upload authorize
    if (request.method === 'POST' && path === '/files/upload-authorize') {
      const body = await request.json() as {
        fileId: string;
        senderId: string;
        recipientId: string;
        size: number;
        mimeType: string;
        filename: string;
      };
      const result = await fileService.createFileRecord(body, env);
      return createJsonResponse(result, 201);
    }

    // Get file
    if (request.method === 'GET' && path.startsWith('/files/')) {
      const fileId = path.split('/')[2];
      const file = await fileService.getFile(fileId, env);
      if (!file) {
        return createErrorResponse('File not found', 404);
      }
      return createJsonResponse(file);
    }

    // Delete file
    if (request.method === 'DELETE' && path.startsWith('/files/')) {
      const fileId = path.split('/')[2];
      await fileService.deleteFile(fileId, env);
      return createJsonResponse({ success: true });
    }

    return createErrorResponse('Not found', 404);
  } catch (error) {
    logError('files', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
