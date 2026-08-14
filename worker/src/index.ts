import { Env } from './durable-objects/types';
import { handleApiRequest } from './routes/api';
import { handleWebSocketUpgrade } from './routes/websocket';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // WebSocket upgrade
    if (url.pathname === '/ws') {
      return handleWebSocketUpgrade(request, env);
    }
    
    // API routes
    if (url.pathname.startsWith('/api')) {
      return handleApiRequest(request, env);
    }
    
    // Default response
    return new Response('Gupta_Chat Worker', { status: 200 });
  },
};
