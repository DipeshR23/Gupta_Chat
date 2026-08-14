import { MessageService } from '../messages/service';
import { createErrorResponse, createJsonResponse } from '../utils/errors';
import { Env } from '../durable-objects/types';
import { logError } from '../utils/logger';

const messageService = new MessageService();

export async function handleMessagingRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // Send message
    if (request.method === 'POST' && path === '/messages') {
      const body = await request.json() as {
        senderId: string;
        recipientId: string;
        ciphertext: string;
        nonce: string;
        messageNumber: number;
      };
      const result = await messageService.sendMessage(body, env);
      return createJsonResponse(result, 201);
    }

    // Get pending messages
    if (request.method === 'GET' && path === '/messages/pending') {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return createErrorResponse('Missing userId parameter', 400);
      }
      const messages = await messageService.getPendingMessages(userId, env);
      return createJsonResponse({ messages });
    }

    // Mark message as delivered
    if (request.method === 'POST' && path.startsWith('/messages/') && path.endsWith('/ack')) {
      const messageId = path.split('/')[2];
      await messageService.markAsDelivered(messageId, env);
      return createJsonResponse({ success: true });
    }

    return createErrorResponse('Not found', 404);
  } catch (error) {
    logError('messages', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
