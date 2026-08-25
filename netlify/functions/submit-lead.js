// Velira — серверний прийом заявки з форми.
// Telegram credentials live only in Netlify env.

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;
const MAX_RATE_KEYS = 1000;
const MAX_BODY_BYTES = 16 * 1024;
const TELEGRAM_TIMEOUT_MS = 8000;
const PRIVACY_VERSION = '2026-08-25-v2';
const LEAD_SOURCES = new Set(['home', 'websites', 'flow']);
const LEAD_LANGUAGES = new Set(['uk', 'en']);
const hits = new Map();

const json = (statusCode, payload, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  },
  body: JSON.stringify(payload),
});

const getHeader = (headers, name) => {
  const wanted = name.toLowerCase();
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === wanted);
  return entry ? String(entry[1] || '') : '';
};

function rateLimited(ip) {
  const now = Date.now();

  // Keep the best-effort warm-instance limiter bounded. Netlify instances are
  // independent, so this complements (but does not replace) edge-level controls.
  if (hits.size >= MAX_RATE_KEYS) {
    for (const [key, values] of hits) {
      if (!values.some((time) => now - time < WINDOW_MS)) hits.delete(key);
    }
    while (hits.size >= MAX_RATE_KEYS) hits.delete(hits.keys().next().value);
  }

  const recent = (hits.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const clip = (value, length) => String(value == null ? '' : value).slice(0, length);

exports.handler = async (event = {}) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method not allowed' }, { Allow: 'POST' });
  }

  const fetchSite = getHeader(event.headers, 'sec-fetch-site').toLowerCase();
  if (fetchSite === 'cross-site') {
    return json(403, { error: 'cross-site request rejected' });
  }

  const contentType = getHeader(event.headers, 'content-type').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json(415, { error: 'очікується application/json' });
  }

  const body = typeof event.body === 'string' ? event.body : '';
  const declaredLength = Number.parseInt(getHeader(event.headers, 'content-length'), 10);
  if ((Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES)
      || Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    return json(413, { error: 'запит завеликий' });
  }

  let data;
  try {
    data = JSON.parse(body || '{}');
  } catch (_) {
    return json(400, { error: 'некоректний запит' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json(400, { error: 'некоректний запит' });
  }

  // Honeypot requests are acknowledged before secrets, rate limits or delivery.
  if (data.company) return json(200, { ok: true });

  const name = clip(data.name, 200).trim();
  const contact = clip(data.contact, 200).trim();
  const plan = clip(data.plan, 120).trim();
  const brief = clip(data.brief, 2000).trim();
  const privacyVersion = clip(data.privacyVersion, 40).trim();
  const source = clip(data.source, 40).trim().toLowerCase();
  const language = clip(data.language, 8).trim().toLowerCase();
  const privacyAcknowledged = data.privacyAcknowledged === true
    || data.privacyAcknowledged === 'true'
    || data.privacyAcknowledged === 'on';
  const telegramDeliveryConsent = data.telegramDeliveryConsent === true
    || data.telegramDeliveryConsent === 'true'
    || data.telegramDeliveryConsent === 'on';

  if (!name || !contact) return json(400, { error: "вкажіть імʼя і контакт" });
  if (!privacyAcknowledged) return json(400, { error: 'потрібне підтвердження ознайомлення з повідомленням про приватність' });
  if (!telegramDeliveryConsent) return json(400, { error: 'потрібна окрема згода на доставку через Telegram Bot API' });
  if (privacyVersion !== PRIVACY_VERSION) {
    return json(409, { error: 'оновіть сторінку та підтвердьте чинне повідомлення про приватність' });
  }
  if (!LEAD_SOURCES.has(source) || !LEAD_LANGUAGES.has(language)) {
    return json(400, { error: 'некоректне джерело заявки' });
  }

  const ip = getHeader(event.headers, 'x-nf-client-connection-ip')
    || getHeader(event.headers, 'x-forwarded-for').split(',')[0].trim()
    || 'unknown';
  if (rateLimited(ip)) {
    return json(429, { error: 'забагато заявок, спробуйте за хвилину' }, { 'Retry-After': '60' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('submit-lead: missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env');
    return json(503, { error: 'сервіс тимчасово недоступний' }, { 'Retry-After': '60' });
  }

  const now = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const message = [
    '🚀 <b>Нова заявка — Velira</b>', '',
    `👤 <b>Імʼя / бренд:</b> ${esc(name)}`,
    `📩 <b>Контакт:</b> ${esc(contact)}`,
    `💎 <b>Напрям:</b> ${esc(plan || '—')}`, '',
    '📝 <b>Опис:</b>', esc(brief || '—'), '',
    `🛡️ <b>Privacy:</b> ${esc(privacyVersion)} · ${esc(language)} · ${esc(source)} · Telegram consent ✓`,
    `<i>${now} (Київ)</i>`,
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      let description = '';
      try { description = (await response.json()).description || ''; } catch (_) {}
      console.error('submit-lead: telegram error', response.status, description);
      return json(502, { error: 'не вдалося доставити заявку' });
    }
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    console.error(timedOut ? 'submit-lead: telegram timeout' : 'submit-lead: fetch failed', error && error.message);
    return json(timedOut ? 504 : 502, { error: 'не вдалося доставити заявку' });
  } finally {
    clearTimeout(timeout);
  }

  return json(200, { ok: true });
};
