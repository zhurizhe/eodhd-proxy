import { eodHistory } from '@/lib/eodhd';
import { NextResponse } from 'next/server';

/**
 * POST /api/eod/history
 *
 * Accepts an array of symbol strings and a start/end date in
 * `YYYYMMDD` format. For each symbol the endpoint retrieves the
 * historical end‑of‑day bars between the two dates (inclusive) in
 * ascending date order. Symbols should include their exchange code
 * separated by a period (e.g. "600519.SHG").
 *
 * Example request body:
 * {
 *   "symbols": ["600519.SHG"],
 *   "start_date": "20230801",
 *   "end_date": "20230821"
 * }
 */
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { symbols, start_date, end_date } = payload || {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ ok: false, error: 'symbols must be a non-empty array' }, { status: 400 });
  }
  if (!start_date || !/^[0-9]{8}$/.test(start_date) || !end_date || !/^[0-9]{8}$/.test(end_date)) {
    return NextResponse.json({ ok: false, error: 'start_date and end_date must be YYYYMMDD' }, { status: 400 });
  }
  const from = `${start_date.slice(0, 4)}-${start_date.slice(4, 6)}-${start_date.slice(6, 8)}`;
  const to = `${end_date.slice(0, 4)}-${end_date.slice(4, 6)}-${end_date.slice(6, 8)}`;
  try {
    const data = [];
    for (const sym of symbols) {
      if (typeof sym !== 'string' || !sym.includes('.')) {
        return NextResponse.json({ ok: false, error: `Invalid symbol format: ${sym}` }, { status: 400 });
      }
      const rows = await eodHistory(sym, { from, to, order: 'a' });
      data.push({ symbol: sym, rows });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}