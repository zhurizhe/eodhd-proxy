#!/usr/bin/env node
/*
 * A minimal HTTP server used solely for smoke testing the API routes
 * implemented in this repository. The goal of this file is to run
 * entirely on Node.js without any external dependencies. When you
 * execute `node scripts/test_server.js` the server will bind on
 * process.env.PORT (default 3000) and expose the same routes as the
 * Next.js implementation. All requests except the health check
 * require a Bearer token matching the `PROXY_BEARER_TOKEN` environment
 * variable.
 */

import http from 'node:http';
import { bulkLastDay, eodHistory } from '../lib/eodhd.js';

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.PROXY_BEARER_TOKEN || '';

function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Health endpoint is always allowed
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return jsonResponse(res, 200, { ok: true, ts: Date.now() });
  }
  // Enforce bearer token for other routes
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return jsonResponse(res, 401, { error: 'Unauthorized' });
  }
  const provided = auth.substring('Bearer '.length).trim();
  if (!TOKEN || provided !== TOKEN) {
    return jsonResponse(res, 401, { error: 'Unauthorized' });
  }
  // bulk snapshot
  if (req.method === 'POST' && url.pathname === '/api/eod/bulk-snapshot') {
    const body = await parseBody(req);
    if (body === null) {
      return jsonResponse(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const { trade_date } = body;
    if (!trade_date || typeof trade_date !== 'string' || !/^[0-9]{8}$/.test(trade_date)) {
      return jsonResponse(res, 400, { ok: false, error: 'trade_date must be YYYYMMDD' });
    }
    const date = `${trade_date.slice(0, 4)}-${trade_date.slice(4, 6)}-${trade_date.slice(6, 8)}`;
    try {
      const [shg, she] = await Promise.all([
        bulkLastDay('SHG', date),
        bulkLastDay('SHE', date)
      ]);
      const items = [];
      if (Array.isArray(shg)) items.push(...shg);
      if (Array.isArray(she)) items.push(...she);
      return jsonResponse(res, 200, { ok: true, count: items.length, items });
    } catch (err) {
      return jsonResponse(res, 500, { ok: false, error: err.message });
    }
  }
  // history
  if (req.method === 'POST' && url.pathname === '/api/eod/history') {
    const body = await parseBody(req);
    if (body === null) {
      return jsonResponse(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const { symbols, start_date, end_date } = body;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return jsonResponse(res, 400, { ok: false, error: 'symbols must be a non-empty array' });
    }
    if (!start_date || !/^[0-9]{8}$/.test(start_date) || !end_date || !/^[0-9]{8}$/.test(end_date)) {
      return jsonResponse(res, 400, { ok: false, error: 'start_date and end_date must be YYYYMMDD' });
    }
    const from = `${start_date.slice(0, 4)}-${start_date.slice(4, 6)}-${start_date.slice(6, 8)}`;
    const to = `${end_date.slice(0, 4)}-${end_date.slice(4, 6)}-${end_date.slice(6, 8)}`;
    try {
      const data = [];
      for (const sym of symbols) {
        if (typeof sym !== 'string' || !sym.includes('.')) {
          return jsonResponse(res, 400, { ok: false, error: `Invalid symbol format: ${sym}` });
        }
        const rows = await eodHistory(sym, { from, to, order: 'a' });
        data.push({ symbol: sym, rows });
      }
      return jsonResponse(res, 200, { ok: true, data });
    } catch (err) {
      return jsonResponse(res, 500, { ok: false, error: err.message });
    }
  }
  // Fallback for unknown routes
  jsonResponse(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Test server listening on http://localhost:${PORT}`);
});