import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://eodhd.com/api';

/**
 * Determine whether the application should use mock data. When
 * `MOCK_MODE=1` in the environment the proxy will avoid outbound
 * requests and instead read fixtures stored under the `fixtures/`
 * directory. This makes it possible to develop and test the service
 * without an internet connection or an EODHD API key.
 */
function isMock() {
  return process.env.MOCK_MODE === '1' || process.env.MOCK_MODE === 'true';
}

// Resolve the directory of this module. import.meta.url is used
// because __dirname is not available in ES modules. The file path
// returned by new URL(import.meta.url).pathname may be URL encoded on
// Windows but is fine on POSIX. See: https://nodejs.org/api/esm.html
const moduleDir = path.dirname(new URL(import.meta.url).pathname);
const fixturesDir = path.join(moduleDir, '..', 'fixtures');

/**
 * Helper for constructing the absolute path to a fixture file. It
 * resolves relative to the `fixtures/` directory adjacent to the
 * `lib/` directory regardless of the current working directory. This
 * allows fixtures to be loaded correctly when executed from tests or
 * within the Next.js runtime.
 *
 * @param {string} filename The fixture filename.
 * @returns {string} Absolute path to the fixture file.
 */
function fixturePath(filename) {
  return path.join(fixturesDir, filename);
}

/**
 * Load and parse JSON from a fixture file. If the file cannot be
 * parsed a descriptive error will be thrown. A missing fixture will
 * also throw.
 * @param {string} filename
 */
async function loadFixture(filename) {
  const filePath = fixturePath(filename);
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Fetch the latest end‑of‑day bulk snapshot for a given exchange on a
 * specific date. When mock mode is enabled this reads a fixture file
 * named `bulk-<EXCHANGE>.json` where `<EXCHANGE>` is the upper‑case
 * exchange code (e.g. SHG or SHE). Otherwise it issues a GET request
 * against the EODHD bulk endpoint.
 *
 * @param {string} exchange The stock exchange code (e.g. 'SHG', 'SHE').
 * @param {string} date      The trade date in YYYY-MM-DD format.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of quote objects.
 */
export async function bulkLastDay(exchange, date) {
  if (isMock()) {
    const filename = `bulk-${exchange}.json`;
    return loadFixture(filename);
  }
  const token = process.env.EODHD_API_TOKEN;
  if (!token) {
    throw new Error('EODHD_API_TOKEN is not configured');
  }
  const url = `${API_BASE}/eod-bulk-last-day/${exchange}?api_token=${token}&fmt=json&date=${date}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch bulk last day data: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data;
}

/**
 * Fetch historical end‑of‑day data for a given symbol on a specific
 * exchange. When mock mode is enabled this reads a fixture file named
 * `eod-<SYMBOL>.<EXCHANGE>.json`. Otherwise it queries the EODHD
 * endpoint. The returned rows are sorted according to the `order`
 * option ('a' for ascending, 'd' for descending).
 *
 * @param {string} symbolDotExchange A string like '600519.SHG'.
 * @param {Object} opts Options controlling the date range and order.
 * @param {string} opts.from Start date in YYYY-MM-DD format.
 * @param {string} opts.to   End date in YYYY-MM-DD format.
 * @param {string} [opts.order='a'] Sort order: 'a' ascending, 'd' descending.
 * @returns {Promise<Array<Object>>} An array of daily bar objects.
 */
export async function eodHistory(symbolDotExchange, { from, to, order = 'a' }) {
  if (isMock()) {
    const filename = `eod-${symbolDotExchange}.json`;
    const rows = await loadFixture(filename);
    // Filter by date range and sort if necessary
    const filtered = rows.filter((row) => {
      return (!from || row.date >= from) && (!to || row.date <= to);
    });
    return filtered.sort((a, b) => {
      return order === 'a' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
  }
  const token = process.env.EODHD_API_TOKEN;
  if (!token) {
    throw new Error('EODHD_API_TOKEN is not configured');
  }
  const [symbol, exchange] = symbolDotExchange.split('.');
  const url = `${API_BASE}/eod/${symbol}.${exchange}?api_token=${token}&fmt=json&from=${from}&to=${to}&order=${order}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch historical data: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data;
}