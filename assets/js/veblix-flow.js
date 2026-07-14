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
