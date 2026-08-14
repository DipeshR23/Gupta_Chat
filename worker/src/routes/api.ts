import { UserService } from '../users/service';
import { KeyService } from '../keys/service';
import { handleMessagingRequest } from '../messages/route';
import { handleFileRequest } from '../files/route';
import { createErrorResponse, createJsonResponse } from '../utils/errors';
import { authenticateRequest, createSession, type AuthResult } from '../middleware/auth';
import { applySecurityHeaders, createSecurityHeaders } from '../middleware/security-headers';
import { checkRateLimit, getClientIdentifier, createRateLimitHeaders } from '../middleware/rate-limit';
import { Env } from '../durable-objects/types';
import { logError } from '../utils/logger';

const userService = new UserService();
const keyService = new KeyService();

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

function validateUsername(username: string): void {
  if (!username || typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
    throw new Error('Invalid username format');
  }
}

function validateRequestBody(body: unknown, fields: string[]): void {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required');
  }
  for (const field of fields) {
    if (!(field in (body as Record<string, unknown>))) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Authenticate request or return 401
 */
async function requireAuth(request: Request, env: Env): Promise<AuthResult> {
  try {
    return await authenticateRequest(request, env);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unauthorized');
  }
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  // Apply rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    const headers = new Headers(createSecurityHeaders());
    Object.entries(createRateLimitHeaders(rateLimit.remaining, Date.now() + 60000)).forEach(([key, value]) => {
      headers.set(key, value);
    });
    headers.set('Retry-After', '60');
    return new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }), {
      status: 429,
      headers,
    });
  }

  try {
    // Auth routes (public)
    if (request.method === 'POST' && path === '/auth/login') {
      const body = await request.json() as { username: string };
      validateUsername(body.username);
      
      const user = await userService.getUser(body.username, env);
      if (!user) {
        return applySecurityHeaders(createErrorResponse('Invalid credentials', 401));
      }

      const token = await createSession(user.id, env);
      return applySecurityHeaders(createJsonResponse({ token, username: user.username }));
    }

    // Users routes (public for registration, auth for others)
    if (request.method === 'POST' && path === '/users') {
      const body = await request.json() as {
        username: string;
        publicIdentityKey: JsonWebKey;
        signedPreKey: { keyId: string; publicKey: JsonWebKey; signature: string };
        oneTimePreKeys: Array<{ keyId: string; publicKey: JsonWebKey }>;
      };
      validateUsername(body.username);
      validateRequestBody(body, ['username', 'publicIdentityKey', 'signedPreKey', 'oneTimePreKeys']);
      const result = await userService.createUser(body, env);
      return applySecurityHeaders(createJsonResponse(result, 201));
    }

    if (request.method === 'GET' && path.startsWith('/users/')) {
      const username = decodeURIComponent(path.replace('/users/', ''));
      const user = await userService.getUser(username, env);
      if (!user) {
        return applySecurityHeaders(createErrorResponse('User not found', 404));
      }

      const publicKeyBundle = await userService.getPublicKeyBundle(username, env);
      if (!publicKeyBundle) {
        return applySecurityHeaders(createErrorResponse('Public key bundle not found', 404));
      }

      return applySecurityHeaders(createJsonResponse({
        id: user.id,
        username: user.username,
        publicIdentityKey: publicKeyBundle.identity_key,
        signedPreKey: publicKeyBundle.signed_prekey,
        oneTimePreKeys: publicKeyBundle.one_time_prekeys,
      }));
    }

    // Protected routes
    const auth = await requireAuth(request, env);

    // Keys routes
    if (request.method === 'POST' && path === '/keys/prekeys') {
      const body = await request.json() as {
        user_id: string;
        signed_prekey: { keyId: string; publicKey: JsonWebKey; signature: string };
        one_time_prekeys: Array<{ keyId: string; publicKey: JsonWebKey }>;
      };
      
      // Verify user can only publish their own keys
      if (body.user_id !== auth.userId) {
        return applySecurityHeaders(createErrorResponse('Cannot publish keys for another user', 403));
      }
      
      validateRequestBody(body, ['user_id', 'signed_prekey', 'one_time_prekeys']);
      const result = await keyService.publishPreKeys(body, env);
      return applySecurityHeaders(createJsonResponse(result));
    }

    if (request.method === 'POST' && path === '/keys/prekeys/consume') {
      const body = await request.json() as { user_id: string; prekey_id: string };
      validateRequestBody(body, ['user_id', 'prekey_id']);
      const result = await keyService.consumePreKey(body, env);
      return applySecurityHeaders(createJsonResponse(result));
    }

    // Messaging routes (require auth)
    if (path.startsWith('/messages')) {
      return applySecurityHeaders(await handleMessagingRequest(request, env));
    }

    // File routes (require auth)
    if (path.startsWith('/files')) {
      return applySecurityHeaders(await handleFileRequest(request, env));
    }

    return applySecurityHeaders(createErrorResponse('Not found', 404));
  } catch (error) {
    logError('api', error instanceof Error ? error : new Error(String(error)));
    return applySecurityHeaders(createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    ));
  }
}
