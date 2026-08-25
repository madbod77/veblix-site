const HTML_ROUTES = new Map([
  ['/', '/index.html'],
  ['/index', '/index.html'],
  ['/websites', '/websites.html'],
  ['/flow', '/flow.html'],
  ['/privacy', '/privacy.html'],
  ['/privacy-en', '/privacy-en.html'],
  ['/terms', '/terms.html'],
  ['/terms-en', '/terms-en.html'],
  ['/rights', '/rights.html'],
  ['/rights-en', '/rights-en.html'],
]);

const LEGACY_ROUTES = new Set(['/desktop.html', '/tablet.html', '/mobile.html']);
const MAX_BODY_BYTES = 16 * 1024;
const TELEGRAM_TIMEOUT_MS = 8000;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;
const MAX_RATE_KEYS = 1000;
const PRIVACY_VERSION = '2026-08-25-v2';
const LEAD_SOURCES = new Set(['home', 'websites', 'flow']);
const LEAD_LANGUAGES = new Set(['uk', 'en']);
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');
const hits = new Map();

const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  },
});

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const clip = (value, length) => String(value == null ? '' : value).slice(0, length).trim();

function rateLimited(request) {
  const ip = (request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || '').split(',')[0].trim();
  if (!ip) return false;

  const now = Date.now();
  if (hits.size >= MAX_RATE_KEYS) {
    for (const [key, values] of hits) {
      if (!values.some((time) => now - time < RATE_WINDOW_MS)) hits.delete(key);
    }
    while (hits.size >= MAX_RATE_KEYS) hits.delete(hits.keys().next().value);
  }

  const recent = (hits.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

async function submitLead(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, { Allow: 'POST' });

  const fetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
  if (fetchSite === 'cross-site') return json({ error: 'cross-site request rejected' }, 403);

  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json({ error: 'очікується application/json' }, 415);
  }

  const declaredLength = Number.parseInt(request.headers.get('content-length') || '', 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'запит завеликий' }, 413);
  }

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'запит завеликий' }, 413);
    }
    body = JSON.parse(raw || '{}');
  } catch (_) {
    return json({ error: 'некоректний запит' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'некоректний запит' }, 400);
  }
  if (body.company) return json({ ok: true });

  const name = clip(body.name, 200);
  const contact = clip(body.contact, 200);
  const plan = clip(body.plan, 120);
  const brief = clip(body.brief, 2000);
  const privacyVersion = clip(body.privacyVersion, 40);
  const source = clip(body.source, 40).toLowerCase();
  const language = clip(body.language, 8).toLowerCase();
  const privacyAcknowledged = body.privacyAcknowledged === true
    || body.privacyAcknowledged === 'true'
    || body.privacyAcknowledged === 'on';
  const telegramDeliveryConsent = body.telegramDeliveryConsent === true
    || body.telegramDeliveryConsent === 'true'
    || body.telegramDeliveryConsent === 'on';
  if (!name || !contact) return json({ error: "вкажіть імʼя і контакт" }, 400);
  if (!privacyAcknowledged) return json({ error: 'потрібне підтвердження ознайомлення з повідомленням про приватність' }, 400);
  if (!telegramDeliveryConsent) return json({ error: 'потрібна окрема згода на доставку через Telegram Bot API' }, 400);
  if (privacyVersion !== PRIVACY_VERSION) return json({ error: 'оновіть сторінку та підтвердьте чинне повідомлення про приватність' }, 409);
  if (!LEAD_SOURCES.has(source) || !LEAD_LANGUAGES.has(language)) {
    return json({ error: 'некоректне джерело заявки' }, 400);
  }
  if (rateLimited(request)) {
    return json({ error: 'забагато заявок, спробуйте за хвилину' }, 429, { 'Retry-After': '60' });
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ error: 'delivery unavailable', contact_url: 'https://t.me/madbod_77' }, 503, { 'Retry-After': '60' });
  }

  const now = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const message = [
    '🚀 <b>Нова заявка — Velira</b>',
    '',
    `👤 <b>Імʼя / бренд:</b> ${escapeHtml(name)}`,
    `📩 <b>Контакт:</b> ${escapeHtml(contact)}`,
    `💎 <b>Напрям:</b> ${escapeHtml(plan || '—')}`,
    '',
    '📝 <b>Опис:</b>',
    escapeHtml(brief || '—'),
    '',
    `🛡️ <b>Privacy:</b> ${escapeHtml(privacyVersion)} · ${escapeHtml(language)} · ${escapeHtml(source)} · Telegram consent ✓`,
    `<i>${now} (Київ)</i>`,
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return json({ error: 'не вдалося доставити заявку' }, 502);
  } catch (error) {
    return json({ error: 'не вдалося доставити заявку' }, error?.name === 'AbortError' ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }

  return json({ ok: true });
}

function withSecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  if (pathname.endsWith('.html') || pathname === '/') {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else if (/\.(?:jpg|jpeg|png|webp|svg|woff2?)$/i.test(pathname)) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (/\.(?:css|js)$/i.test(pathname)) {
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/.netlify/functions/submit-lead') {
      return submitLead(request, env);
    }

    if (LEGACY_ROUTES.has(url.pathname)) {
      return Response.redirect(new URL('/websites.html', url), 301);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    const assetPath = HTML_ROUTES.get(url.pathname) || url.pathname;
    const assetUrl = new URL(url);
    assetUrl.pathname = assetPath;
    const assetRequest = new Request(assetUrl, request);
    const response = await env.ASSETS.fetch(assetRequest);
    return withSecurityHeaders(response, assetPath);
  },
};
