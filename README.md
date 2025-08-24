# EODHD Proxy

> A lightweight proxy built with Next.js 14 that exposes a handful of
> EODHD end‑of‑day data endpoints. It features optional offline
> fixtures, bearer token authentication and an OpenAPI contract for
> easy integration with custom GPT actions.

## Quick Start (10 commands)

```sh
# 1. clone the repository (replace URL as necessary)
git clone <your‑repo‑url> && cd eodhd-proxy
# 2. copy the example environment and fill in your values
cp .env.example .env && nano .env
# 3. install dependencies (requires npm ≥ 9 and Node.js ≥ 18)
npm install
# 4. enable mock mode if you don't have API access
export MOCK_MODE=1
# 5. set a bearer token used for authenticating requests
export PROXY_BEARER_TOKEN=changeme
# 6. run the development server on port 3000
npm run dev
# 7. in another shell run the smoke tests to validate the API
./scripts/smoke.sh
# 8. build and start for production
npm run build && npm start
# 9. import the OpenAPI definition into your custom GPT
cat openapi/eodhd-proxy.yaml
# 10. deploy behind Nginx and PM2 (see below)
```

## Overview

This project delivers a simple proxy on top of the [EODHD](https://eodhd.com/) market data API. It is designed to be called from a custom GPT via [Actions](https://platform.openai.com/docs/assistants/actions) and handles authentication, parameter validation and result formatting for you. The proxy is implemented as a Next.js 14 API with the new App Router so that each endpoint lives under `app/api/*`.

Key features:

* **Bearer token authentication** – all API routes except `/api/health` are protected via middleware. The expected token is provided via the `PROXY_BEARER_TOKEN` environment variable.
* **MOCK_MODE** – when `MOCK_MODE=1` the proxy reads JSON fixtures from the `fixtures/` directory instead of contacting the remote EODHD service. This allows you to run the app without internet access or a valid API key and forms the basis of the included smoke tests.
* **OpenAPI contract** – the `openapi/eodhd-proxy.yaml` file documents the available endpoints, their parameters and response structures. You can import this file directly into your custom GPT configuration to enable structured calls.
* **Self‑contained smoke test** – `scripts/smoke.sh` spins up a minimal Node.js server that reuses the same business logic as the Next.js implementation and then exercises each endpoint using `curl` and `jq` assertions. Use this script to quickly verify your environment before deploying.

## Installation

This repository expects Node.js 18+ and npm 9+. Clone the project and install dependencies:

```sh
git clone <your‑repo‑url>
cd eodhd-proxy
cp .env.example .env
npm install
```

Edit `.env` and provide the following values:

| Variable              | Description |
|----------------------|-------------|
| `EODHD_API_TOKEN`    | Your personal EODHD API token (format: `68a18801b4ea23.47282054`). Required when `MOCK_MODE=0`. |
| `PROXY_BEARER_TOKEN` | A secret string clients must send in the `Authorization` header. |
| `MOCK_MODE`          | Set to `1` to disable outbound API calls and use local fixtures instead. |

To run the development server with mock data enabled:

```sh
export MOCK_MODE=1
export PROXY_BEARER_TOKEN=changeme
npm run dev
```

The API will be available on `http://localhost:3000`. See the smoke test section for usage examples.

## API Endpoints

### `GET /api/health`

Unauthenticated health check. Returns `{ ok: true, ts: <timestamp> }`.

### `POST /api/eod/bulk-snapshot`

Retrieve a combined snapshot of end‑of‑day quotes for a specific trade date across the Shanghai (SHG) and Shenzhen (SHE) exchanges.

* **Headers**: `Authorization: Bearer <PROXY_BEARER_TOKEN>`
* **Body**: `{ "trade_date": "YYYYMMDD" }`
* **Response**: `{ ok: true, count: <number>, items: [ … ] }`

### `POST /api/eod/history`

Retrieve historical end‑of‑day bars for one or more symbols. Symbols must include the exchange suffix separated by a period (e.g. `600519.SHG`). Dates are inclusive and must be provided in `YYYYMMDD` format.

* **Headers**: `Authorization: Bearer <PROXY_BEARER_TOKEN>`
* **Body**: `{ "symbols": [ "600519.SHG" ], "start_date": "YYYYMMDD", "end_date": "YYYYMMDD" }`
* **Response**: `{ ok: true, data: [ { symbol, rows: [ … ] } ] }`

Refer to `openapi/eodhd-proxy.yaml` for detailed schemas.

## Smoke Testing

The `scripts/smoke.sh` script is designed to validate the proxy in an isolated environment. It starts a lightweight Node.js server (`scripts/test_server.js`) that shares the same business logic as the Next.js implementation and performs a series of requests using `curl` and `jq` to verify:

1. The health endpoint returns a valid timestamp.
2. Authenticated requests to `/api/eod/bulk-snapshot` and `/api/eod/history` succeed and return at least one item/row when using the bundled fixtures.
3. Requests without an `Authorization` header are rejected with HTTP 401.

You can run the test with:

```sh
./scripts/smoke.sh
```

If all checks pass the script will exit with status 0.

## Deployment

### PM2

Use the provided `pm2.config.cjs` to run the proxy under [PM2](https://pm2.keymetrics.io/). After building the app you can start it as follows:

```sh
npm run build
pm2 start pm2.config.cjs
pm2 status
```

### Nginx Reverse Proxy

See `nginx.sample.conf` for a sample configuration that forwards requests under `/api/` to the Next.js app on `localhost:3000` and rejects all other paths. Adjust the `server_name` directive to match your own domain and copy the file into `/etc/nginx/conf.d/` on your server.

After editing the configuration you can test and reload Nginx:

```sh
nginx -t
sudo systemctl reload nginx
```

## Using with Custom GPT

1. Import `openapi/eodhd-proxy.yaml` into the Actions section of your custom GPT configuration.
2. Set the base URL to your deployed domain (e.g. `https://api.example.com`).
3. Provide the bearer token in the default headers for your actions.

Once configured your GPT can call the `bulk-snapshot` and `history` actions directly with structured JSON payloads, and the proxy will enforce authentication and perform input validation on your behalf.

## Common Issues

* **403/401 responses** – ensure that you are sending the correct `Authorization` header. The value must be `Bearer <PROXY_BEARER_TOKEN>` and match exactly what is defined in your environment.
* **Empty responses in real mode** – when `MOCK_MODE=0` the proxy forwards requests to EODHD. If `EODHD_API_TOKEN` is missing or invalid the upstream API will return an error. Verify your API key and consider enabling mock mode to continue development offline.
* **Network timeouts** – the `next.config.js` file sets generous fetch and static page generation timeouts. If you still encounter timeouts ensure that your server can reach `eodhd.com` or enable `MOCK_MODE`.

## License

This project is provided as‑is without any warranty. You are free to use and modify it to suit your needs.