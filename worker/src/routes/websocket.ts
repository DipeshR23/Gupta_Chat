import { ChatRoom } from '../durable-objects/ChatRoom';
import { Env } from '../durable-objects/types';
import { authenticateRequest } from '../middleware/auth';
import { applySecurityHeaders } from '../middleware/security-headers';

export async function handleWebSocketUpgrade(request: Request, env: Env): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return applySecurityHeaders(new Response('Expected WebSocket upgrade', { status: 426 }));
  }

  // Enforce secure WebSocket URL in production
  const url = new URL(request.url);
  const isProduction = env.ENVIRONMENT === 'production';
  if (isProduction && url.protocol !== 'wss:') {
    return applySecurityHeaders(new Response('Secure WebSocket required', { status: 426 }));
  }

  // Authenticate via token in query params or Authorization header
  let userId: string;
  try {
    const token = url.searchParams.get('token');
    if (!token) {
      // Try Authorization header
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const auth = await authenticateRequest(request, env);
        userId = auth.userId;
      } else {
        return applySecurityHeaders(new Response('Missing authentication token', { status: 401 }));
      }
    } else {
      // Authenticate with token from query param
      const session = await env.DB.prepare(
        'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, new Date().toISOString()).first<{ user_id: string }>();
      
      if (!session) {
        return applySecurityHeaders(new Response('Invalid or expired session', { status: 401 }));
      }
      userId = session.user_id;
    }
  } catch (error) {
    return applySecurityHeaders(new Response('Authentication failed', { status: 401 }));
  }

  // Get or create ChatRoom Durable Object
  const chatRoomId = getChatRoomId(userId);
  const chatRoom = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(chatRoomId));
  
  // Upgrade to WebSocket
  const pair = new WebSocketPair();
  const [client, server] = [pair[0], pair[1]];
  
  server.accept();
  
  // Handle WebSocket connection in Durable Object
  chatRoom.fetch(request);
  
  return applySecurityHeaders(new Response(null, {
    status: 101,
    webSocket: client,
  }));
}

function getChatRoomId(userId: string): string {
  // In Phase 4, this maps to conversation IDs
  // For now, use a simple user-based room
  return `user-${userId}`;
}
