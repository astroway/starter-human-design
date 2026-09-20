/**
 * The whole backend: one route that holds the key.
 *
 * Nothing here is clever, and that is the point. The browser cannot call
 * https://api.astroway.info/v1/* directly: those responses carry no
 * access-control-allow-origin header, so a fetch from your page fails on CORS
 * before it fails on auth. Every AstroWay app needs a server route, and this is
 * the smallest honest one. No framework, no dependencies.
 *
 * In development Vite serves the UI on 5173 and proxies /api here.
 * In production this process serves the built files too.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 5178);
const BASE_URL = process.env.ASTROWAY_BASE_URL ?? 'https://api.astroway.info/v1';
const API_KEY = process.env.ASTROWAY_API_KEY ?? '';

/* A demo on a public URL spends real credits on every visitor, so the same
   process that holds the key holds a ceiling. Ten readings an hour per address
   is plenty for someone trying it and useless for someone scraping it. */
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR ?? 10);
const hits = new Map();

function rateLimited(ip) {
  if (RATE_LIMIT <= 0) return false;
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < hour);
  if (list.length >= RATE_LIMIT) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(text);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    /* A birth moment is under 300 bytes. Anything larger is not this app. */
    if (chunks.reduce((n, c) => n + c.length, 0) > 4096) throw new Error('body too large');
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function handleReading(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, {
      error: 'ASTROWAY_API_KEY is not set. Copy .env.example to .env and put a key in it. '
        + 'Get one at https://api.astroway.info/dashboard/sign-up',
    });
  }

  const ip = req.socket.remoteAddress ?? 'unknown';
  if (rateLimited(ip)) {
    return sendJson(res, 429, { error: `This instance allows ${RATE_LIMIT} readings an hour. Clone it and use your own key: https://github.com/astroway/starter-human-design` });
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Send a JSON body with date, time, timezone, latitude and longitude.' });
  }

  const { date, time, timezone, latitude, longitude } = body;
  /* Checked here rather than passed through, because the API's own message
     names its field and the user is looking at ours. */
  const missing = ['date', 'time', 'timezone', 'latitude', 'longitude']
    .filter((k) => body[k] === undefined || body[k] === '' || body[k] === null);
  if (missing.length) {
    return sendJson(res, 400, { error: `Missing: ${missing.join(', ')}. Human Design needs an exact birth time; an hour out moves the profile.` });
  }

  const upstream = await fetch(`${BASE_URL}/human-design`, {
    method: 'POST',
    headers: { 'X-Api-Key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ date, time, timezone, latitude: Number(latitude), longitude: Number(longitude) }),
  });

  const json = await upstream.json().catch(() => null);
  if (!upstream.ok || !json?.ok) {
    /* Pass the API's own words through. It knows why it refused and we do not,
       and rewriting the reason is how a caller ends up debugging our guess. */
    return sendJson(res, upstream.status === 200 ? 502 : upstream.status, {
      error: json?.error?.message ?? `AstroWay answered ${upstream.status}.`,
      code: json?.error?.code ?? null,
    });
  }

  /* Worth logging: the cost of the feature, before the bill says it. */
  console.log(JSON.stringify({
    event: 'reading',
    credits_used: upstream.headers.get('x-credits-used'),
    credits_remaining: upstream.headers.get('x-credits-remaining'),
  }));

  return sendJson(res, 200, { data: json.data });
}

async function serveStatic(res, pathname) {
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, rel);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    /* A single-page app owns its routes: anything that is not a file is the
       app's own path, not a 404. */
    file = join(DIST, 'index.html');
  }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found. Run `npm run build` first, or `npm run dev` for the dev server.');
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/reading' && req.method === 'POST') {
    handleReading(req, res).catch((e) => sendJson(res, 500, { error: String(e?.message ?? e) }));
    return;
  }
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, keyed: Boolean(API_KEY) });
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  void serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ event: 'started', port: PORT, base_url: BASE_URL, keyed: Boolean(API_KEY) }));
});
