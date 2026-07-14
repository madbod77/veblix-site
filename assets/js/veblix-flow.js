/* Veblix Flow — двигун інтерактивного демо (усе client-side, вигадані дані).
   «Запустити» проганяє заявку по нодах: журнал пише кроки, CRM отримує ліда,
   аналітика (заявки/кваліфіковано/конверсія/графік/воронка) оновлюється. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── вкладки ── */
  const tabs = $$('.fl-tab[data-tab]');
  const panels = $$('.fl-panel');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    panels.forEach((p) => { const on = p.dataset.panel === t.dataset.tab; p.classList.toggle('is-active', on); p.hidden = !on; });
  }));

  /* ── демо-дані ── */
  const LEADS = [
    { name: 'Олена',  handle: '@olena_demo',  service: 'Сайт + бот',        budget: '$500–1000', when: 'цього місяця' },
    { name: 'Андрій', handle: '@andrii_demo', service: 'Лендінг',           budget: 'до $500',   when: 'наступного тижня' },
    { name: 'Марина', handle: '@maryna_demo', service: 'Автоматизація',     budget: '$1000+',    when: 'цього тижня' },
    { name: 'Тарас',  handle: '@taras_demo',  service: 'Сайт + аналітика',  budget: '$500–1000', when: 'цього місяця' },
  ];
  let leadNo = 284;
  let kLeads = 48, kQual = 27;           // базові демо-числа (як у відео)
  const chart = [5, 6, 7, 6, 8, 7, 9, 8, 10, 9, 11, 12, 11, 13, 14];

  const pad = (n) => String(n).padStart(2, '0');
  const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  /* ── сценарій ── */
  const nodes = $$('.fl-node');
  const conns = $$('.fl-conn');
  const journal = $('[data-journal]');
  const leadCard = $('[data-lead]');
  const runBtn = $('[data-run]');
  const statusBadge = $('[data-run-status]');
  const lastRun = $('[data-last-run]');
  const runsBody = $('[data-runs]');

  function log(text) {
    const li = document.createElement('li');
    li.innerHTML = `<time>${now()}</time> ${text}`;
    journal.appendChild(li);
  }

  function resetFlow() {
    nodes.forEach((n) => n.classList.remove('is-active', 'is-done'));
    conns.forEach((c) => c.classList.remove('is-done'));
    journal.innerHTML = '';
    statusBadge.hidden = true;
  }

  function showLead(lead, id) {
    $('[data-lead-id]').textContent = id;
    $('[data-lead-ava]').textContent = lead.name[0];
    $('[data-lead-name]').textContent = lead.name;
    $('[data-lead-handle]').textContent = lead.handle;
    $('[data-lead-service]').textContent = lead.service;
    $('[data-lead-budget]').textContent = lead.budget;
    $('[data-lead-when]').textContent = lead.when;
    leadCard.hidden = false;
  }

  function addRun(id, lead, dur) {
    const tr = document.createElement('tr');
    tr.className = 'is-new';
    tr.innerHTML = `<td>${id} · ${lead.name}</td><td>${now()}</td><td>Сайт → форма</td><td class="ok">Кваліфіковано ✓</td><td>${dur}с</td>`;
    runsBody.prepend(tr);
  }

  /* ── аналітика ── */
  function drawChart() {
    const svg = $('[data-chart]');
    const W = 560, H = 220, P = 30;
    const max = 18;
    const xs = (i) => P + i * ((W - P * 2) / (chart.length - 1));
    const ys = (v) => H - P - (v / max) * (H - P * 2);
    const pts = chart.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
    const grid = [0, 6, 12, 18].map((v) =>
      `<line x1="${P}" x2="${W - P}" y1="${ys(v)}" y2="${ys(v)}" stroke="rgba(255,255,255,.07)"/><text x="${P - 8}" y="${ys(v) + 4}" text-anchor="end" font-size="11" fill="#6A7085">${v}</text>`).join('');
    const dots = chart.map((v, i) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="3.5" fill="#3DDC97"/>`).join('');
    svg.innerHTML = `${grid}<polyline points="${pts}" fill="none" stroke="#3DDC97" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }

  function updateKpis() {
    $('[data-kpi-leads]').textContent = kLeads;
    $('[data-kpi-qual]').textContent = kQual;
    $('[data-kpi-conv]').textContent = Math.round(kQual / kLeads * 100) + '%';
    $('[data-fun-leads]').textContent = kLeads;
    $('[data-fun-qual]').textContent = kQual;
  }

  /* ── прогін ── */
  const STEPS = [
    { node: 0, delay: 320, msg: 'Заявку отримано' },
    { node: 1, delay: 420, msg: 'Контакт перевірено' },
    { node: 2, delay: 640, msg: 'Кваліфікацію завершено (2 відповіді)' },
    { node: 3, delay: 300, msg: null },  // текст додамо з номером ліда
    { node: 4, delay: 260, msg: 'Менеджера повідомлено' },
  ];
  let running = false;

  async function run() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    resetFlow();
    leadCard.hidden = true;

    const lead = pick(LEADS);
    leadNo += 1;
    const id = 'VLX-' + String(leadNo).padStart(4, '0');
    const t0 = performance.now();

    for (const s of STEPS) {
      const n = nodes[s.node];
      n.classList.add('is-active');
      await wait(s.delay);
      n.classList.remove('is-active');
      n.classList.add('is-done');
      log(s.msg || `Створено лід ${id}`);
      if (s.node === 3) showLead(lead, id);
      if (conns[s.node]) conns[s.node].classList.add('is-done');
      await wait(90);
    }

    const dur = reduce ? '1.8' : ((performance.now() - t0) / 1000).toFixed(1);
    $('[data-run-ms]').textContent = dur + 'с';
    statusBadge.hidden = false;
    lastRun.textContent = `${id} · ${now()}`;
    addRun(id, lead, dur);

    kLeads += 1; kQual += 1;
    chart[chart.length - 1] += 1;
    updateKpis(); drawChart();

    running = false;
    runBtn.disabled = false;
  }
  runBtn.addEventListener('click', run);

  /* ── стартовий стан ── */
  // кілька демо-рядків у «Запусках», щоб таблиця не була порожня
  [
    ['VLX-0284', 'Олена',  '14:33:23', '1.8'],
    ['VLX-0283', 'Тарас',  '11:02:41', '2.1'],
    ['VLX-0282', 'Марина', '09:47:05', '1.6'],
  ].forEach(([id, name, t, d]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${id} · ${name}</td><td>${t}</td><td>Сайт → форма</td><td class="ok">Кваліфіковано ✓</td><td>${d}с</td>`;
    runsBody.appendChild(tr);
  });
  lastRun.textContent = 'VLX-0284 · 14:33:23';
  drawChart();
  updateKpis();

  // авто-демо через секунду після відкриття — щоб «щось відбувалось» одразу
  if (!reduce) setTimeout(run, 900);
})();

/* ── «Мій бізнес»: реальний аналізатор цифр клієнта (усе локально в браузері) ──
   Орієнтири-«бенчмарки» — типові діапазони для сервісного бізнесу; у висновках
   подаються як гіпотези для тесту, не як гарантії. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const form = $('[data-biz-form]');
  if (!form) return;
  const fmt = (n) => Math.round(n).toLocaleString('uk-UA');
  const BENCH = { leads: [2, 5], qual: [40, 60], sale: [25, 40], resp: 5 };
  const LS_KEY = 'veblixFlowMonths';
  let last = null; // останній розрахунок

  const err = $('[data-biz-err]');
  const resCard = $('[data-biz-res]');
  const insCard = $('[data-biz-insights]');
  const insBody = $('[data-biz-insights-body]');
  const extra = $('[data-biz-extra]');
  const auditMsg = $('[data-audit-msg]');

  $('[data-biz-example]').addEventListener('click', () => {
    const ex = { visits: 1200, leads: 45, qual: 24, sales: 8, check: 6500, resp: 40 };
    for (const k in ex) form.elements[k].value = ex[k];
    form.requestSubmit();
  });

  function rateRow(label, val, bench, unit) {
    const [lo] = bench;
    const bad = val < lo;
    return { label, val, lo, bad, unit };
  }

  function compute() {
    const g = (n) => { const v = parseFloat(form.elements[n].value); return isFinite(v) && v >= 0 ? v : null; };
    const visits = g('visits'), leads = g('leads'), qual = g('qual'), sales = g('sales');
    const check = g('check') || 0, resp = g('resp');
    const okOrder = [visits, leads, qual, sales].every((v) => v !== null) &&
      sales <= qual && qual <= leads && leads <= visits && visits > 0;
    err.hidden = okOrder;
    if (!okOrder) { resCard.hidden = insCard.hidden = extra.hidden = true; return; }

    const rLeads = leads / visits * 100;
    const rQual = leads ? qual / leads * 100 : 0;
    const rSale = qual ? sales / qual * 100 : 0;
    const revenue = sales * check;

    /* воронка: sqrt-шкала, щоб малі значення було видно */
    const w = (v) => (22 + 62 * Math.sqrt(v / visits)).toFixed(1) + '%';
    const stages = [
      { name: 'відвідування', v: visits, rate: null },
      { name: 'заявок', v: leads, rate: rateRow('Сайт → заявка', rLeads, BENCH.leads, '%') },
      { name: 'кваліфіковано', v: qual, rate: rateRow('Заявка → розмова', rQual, BENCH.qual, '%') },
      { name: 'продажів', v: sales, rate: rateRow('Розмова → продаж', rSale, BENCH.sale, '%') },
    ];
    /* найбільший виток = найгірше відставання від нижньої межі орієнтиру */
    let worst = null;
    for (const s of stages) if (s.rate && s.rate.bad) {
      const gap = (s.rate.lo - s.rate.val) / s.rate.lo;
      if (!worst || gap > worst.gap) worst = { stage: s, gap };
    }

    $('[data-biz-funnel]').innerHTML = stages.map((s) =>
      `<li style="--w:${w(s.v)}" class="${worst && worst.stage === s ? 'is-leak' : ''}">
         <b>${fmt(s.v)}</b><span>${s.name}${s.rate ? ` · ${s.rate.val.toFixed(1)}%` : ''}${worst && worst.stage === s ? ' ⚠ головний виток' : ''}</span></li>`).join('');

    const kpis = [
      ['Сайт → заявка', rLeads.toFixed(1) + '%', rLeads >= BENCH.leads[0]],
      ['Заявка → розмова', rQual.toFixed(0) + '%', rQual >= BENCH.qual[0]],
      ['Розмова → продаж', rSale.toFixed(0) + '%', rSale >= BENCH.sale[0]],
      check ? ['Виручка / міс', '₴' + fmt(revenue), true] : null,
    ].filter(Boolean);
    $('[data-biz-kpis]').innerHTML = kpis.map(([l, v, ok]) =>
      `<div class="fl-bizkpi ${ok ? '' : 'is-low'}"><b>${v}</b><i>${l}</i></div>`).join('');

    /* висновки: топ-3 правила */
    const ins = [];
    if (rLeads < BENCH.leads[0]) ins.push({ gap: (BENCH.leads[0] - rLeads) / BENCH.leads[0],
      t: `Сайт конвертує ${rLeads.toFixed(1)}% відвідувачів у заявки (типово ${BENCH.leads[0]}–${BENCH.leads[1]}%)`,
      a: 'Перевірте перший екран: одна зрозуміла дія, коротша форма, швидкість на мобільному.' });
    if (rQual < BENCH.qual[0]) ins.push({ gap: (BENCH.qual[0] - rQual) / BENCH.qual[0],
      t: `До розмови доходить ${rQual.toFixed(0)}% заявок (типово ${BENCH.qual[0]}–${BENCH.qual[1]}%)`,
      a: 'Бот, що відповідає одразу і ставить 2 питання (бюджет, термін), зазвичай піднімає цей етап.' });
    if (rSale < BENCH.sale[0]) ins.push({ gap: (BENCH.sale[0] - rSale) / BENCH.sale[0],
      t: `У продаж закривається ${rSale.toFixed(0)}% розмов (типово ${BENCH.sale[0]}–${BENCH.sale[1]}%)`,
      a: 'Автоматичний фолоу-ап через 24/72 год повертає частину «зниклих» клієнтів.' });
    if (resp !== null && resp > BENCH.resp) ins.push({ gap: Math.min(1, (resp - BENCH.resp) / 60),
      t: `Перша відповідь — ${fmt(resp)} хв (ціль — до ${BENCH.resp} хв)`,
      a: 'Миттєве автопідтвердження в Telegram/SMS утримує клієнта, поки менеджер зайнятий.' });
    ins.sort((a, b) => b.gap - a.gap);

    let potential = '';
    if (worst && check) {
      const s = worst.stage.rate;
      const factor = s.lo / s.val;
      const extraSales = sales * factor - sales;
      if (extraSales >= 0.5) potential =
        `<p class="fl-ins__pot">Потенціал: якщо підтягнути «${s.label}» до типових ${s.lo}% — це ~<b>+${fmt(extraSales)} продажів</b> (~<b>+₴${fmt(extraSales * check)}</b>) на місяць. Це гіпотеза для тесту, не гарантія.</p>`;
    }
    insBody.innerHTML = '<h2>Що підтягнути першим</h2>' +
      (ins.length
        ? '<ol class="fl-ins">' + ins.slice(0, 3).map((i) => `<li><b>${i.t}.</b> ${i.a}</li>`).join('') + '</ol>' + potential
        : '<p>Ваші конверсії в межах типових діапазонів або вище — так тримати! Далі має сенс масштабувати трафік і стежити за динамікою щомісяця.</p>');

    resCard.hidden = false;
    insCard.hidden = false;
    extra.hidden = false;
    last = { visits, leads, qual, sales, check, resp, rLeads, rQual, rSale };
    drawBizChart();
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); compute(); });

  /* ── збереження місяців + динаміка ── */
  const months = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (_) { return []; } };
  $('[data-biz-save]').addEventListener('click', () => {
    if (!last) { auditMsg.hidden = false; auditMsg.textContent = 'Спершу натисніть «Порахувати».'; return; }
    const d = new Date();
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const list = months().filter((m) => m.m !== label);
    list.push({ m: label, leads: last.leads, sales: last.sales });
    list.sort((a, b) => a.m < b.m ? -1 : 1);
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-12)));
    auditMsg.hidden = false; auditMsg.textContent = `Місяць ${label} збережено (у цьому браузері).`;
    drawBizChart();
  });

  function drawBizChart() {
    const svg = $('[data-biz-chart]'); const hint = $('[data-biz-chart-hint]');
    const list = months();
    if (list.length < 2) { svg.innerHTML = ''; hint.hidden = false; return; }
    hint.hidden = true;
    const W = 560, H = 220, P = 34;
    const max = Math.max(...list.map((m) => m.leads), 4);
    const xs = (i) => P + i * ((W - P * 2) / (list.length - 1));
    const ys = (v) => H - P - (v / max) * (H - P * 2);
    const line = (key, color) =>
      `<polyline points="${list.map((m, i) => `${xs(i)},${ys(m[key])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
      list.map((m, i) => `<circle cx="${xs(i)}" cy="${ys(m[key])}" r="3.5" fill="${color}"/>`).join('');
    const labels = list.map((m, i) => `<text x="${xs(i)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#6A7085">${m.m.slice(2)}</text>`).join('');
    svg.innerHTML = line('leads', '#3DDC97') + line('sales', '#8B93FF') + labels +
      `<text x="${P}" y="16" font-size="11" fill="#3DDC97">— заявки</text><text x="${P + 90}" y="16" font-size="11" fill="#8B93FF">— продажі</text>`;
  }
  drawBizChart();

  /* ── надіслати аудит (через існуючу серверну функцію форми) ── */
  $('[data-audit-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!last) { auditMsg.hidden = false; auditMsg.textContent = 'Спершу натисніть «Порахувати».'; return; }
    const f = e.target;
    const name = f.elements.name.value.trim(), contact = f.elements.contact.value.trim();
    if (!name || !contact) { auditMsg.hidden = false; auditMsg.textContent = 'Вкажіть ім\'я і контакт.'; return; }
    const btn = $('[data-audit-send]'); btn.disabled = true; btn.textContent = 'Надсилаємо…';
    const brief = `Veblix Flow аудит: відвідування ${last.visits}, заявки ${last.leads} (${last.rLeads.toFixed(1)}%), розмови ${last.qual} (${last.rQual.toFixed(0)}%), продажі ${last.sales} (${last.rSale.toFixed(0)}%)` +
      (last.check ? `, чек ₴${last.check}` : '') + (last.resp !== null ? `, перша відповідь ${last.resp} хв` : '');
    let ok = true;
    try {
      const r = await fetch('/.netlify/functions/submit-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, plan: 'Veblix Flow · аудит цифр', brief, company: '' }),
      });
      ok = r.ok;
    } catch (_) { ok = false; }
    btn.disabled = false; btn.textContent = 'Надіслати аудит →';
    auditMsg.hidden = false;
    auditMsg.innerHTML = ok
      ? 'Дякуємо! Аудит отримано — відповімо протягом 24 годин.'
      : 'Не вдалося надіслати звідси. Напишіть нам напряму: <a href="https://t.me/madbod_77" target="_blank" rel="noopener" style="color:var(--signal-2)">t.me/madbod_77</a>';
  });
})();
