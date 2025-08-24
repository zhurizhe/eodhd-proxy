import { bulkLastDay } from '@/lib/eodhd';
import { NextResponse } from 'next/server';

/**
 * POST /api/eod/bulk-snapshot
 *
 * Accepts a trade date in `YYYYMMDD` format and returns a combined
 * list of end‑of‑day quotes for both the Shanghai (SHG) and Shenzhen
 * (SHE) exchanges for that date. The response includes a total count
 * and an array of quote objects.
 *
 * Example request body:
 * { "trade_date": "20230821" }
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { trade_date } = payload || {};
  if (!trade_date || typeof trade_date !== 'string' || !/^[0-9]{8}$/.test(trade_date)) {
    return NextResponse.json({ ok: false, error: 'trade_date must be YYYYMMDD' }, { status: 400 });
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
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}