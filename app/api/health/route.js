/**
 * GET /api/health
 *
 * A simple health check endpoint that returns an object with a
 * timestamp. This route is unauthenticated and can be used by
 * monitoring systems to verify that the service is up and running.
 */
export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}