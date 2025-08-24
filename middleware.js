import { NextResponse } from 'next/server';

/**
 * Global middleware for protecting API routes. Any request to `/api/*`
 * except the health check must present a valid Bearer token in the
 * `Authorization` header. The expected token is read from the
 * `PROXY_BEARER_TOKEN` environment variable. If missing or invalid
 * a 401 response is returned.
 *
 * Note: Middleware runs at the edge and cannot access all Node
 * functionality. Access to process.env variables is allowed for
 * simple string values defined in the `.env` file.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  // Skip auth for the health endpoint
  if (pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.PROXY_BEARER_TOKEN;
  // Authorization header must be of form "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const providedToken = authHeader.substring('Bearer '.length).trim();
  if (!expectedToken || providedToken !== expectedToken) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return NextResponse.next();
}

export const config = {
  // Apply the middleware to all API routes except `/api/health`
  matcher: ['/api/(?!health).*']
};