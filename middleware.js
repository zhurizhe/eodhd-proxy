import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // 放行健康检查
  if (pathname === '/api/health' || pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization') || '';
  const expected = process.env.PROXY_BEARER_TOKEN;

  if (!expected) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: 'Server missing PROXY_BEARER_TOKEN' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const ok = auth.startsWith('Bearer ') && auth.slice(7) === expected;
  if (!ok) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

// 只声明匹配 /api/*，不要用正则负向前瞻
export const config = {
  matcher: ['/api/:path*'],
};