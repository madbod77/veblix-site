// Veblix — серверний прийом заявки з форми.
// Токен Telegram живе ТІЛЬКИ в Netlify env (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID),
// ніколи не потрапляє в клієнтський бандл. Клієнт шле сирі поля, повідомлення
// збирається й екранується тут, на сервері.

const WINDOW_MS = 60 * 1000; // вікно rate-limit
const MAX_PER_WINDOW = 5;    // не більше 5 заявок з одного IP за хвилину
const hits = new Map();      // best-effort, у памʼяті інстансу (скидається на cold start)

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method not allowed' }) };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    // Не розкриваємо деталей назовні; лог лишається у Netlify.
    console.error('submit-lead: missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env');
    return { statusCode: 500, body: JSON.stringify({ error: 'сервіс тимчасово недоступний' }) };
  }

  const ip =
    (event.headers['x-nf-client-connection-ip'] ||
      event.headers['x-forwarded-for'] ||
      'unknown').split(',')[0].trim();
  if (rateLimited(ip)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'забагато заявок, спробуйте за хвилину' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: 'некоректний запит' }) };
  }

  const name = clip(data.name, 200).trim();
  const contact = clip(data.contact, 200).trim();
  const plan = clip(data.plan, 120).trim();
  const brief = clip(data.brief, 2000).trim();

  // Honeypot: приховане поле, яке заповнюють лише боти.
  if (data.company) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }; // тихо ігноруємо
  }
  if (!name || !contact) {
    return { statusCode: 400, body: JSON.stringify({ error: "вкажіть імʼя і контакт" }) };
  }

  const now = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const msg = [
    '🚀 <b>Нова заявка — Veblix</b>', '',
    `👤 <b>Імʼя / бренд:</b> ${esc(name)}`,
    `📩 <b>Контакт:</b> ${esc(contact)}`,
    `💎 <b>Тариф:</b> ${esc(plan || '—')}`, '',
    '📝 <b>Опис:</b>', esc(brief || '—'), '',
    `<i>${now} (Київ)</i>`,
  ].join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) {
      let d = '';
      try { d = (await r.json()).description || ''; } catch (_) {}
      console.error('submit-lead: telegram error', r.status, d);
      return { statusCode: 502, body: JSON.stringify({ error: 'не вдалося доставити заявку' }) };
    }
  } catch (e) {
    console.error('submit-lead: fetch failed', e && e.message);
    return { statusCode: 502, body: JSON.stringify({ error: 'не вдалося доставити заявку' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
