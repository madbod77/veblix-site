/* =========================================================
   Velira — interactions (чисто, без зайвого руху)
   ========================================================= */
(() => {
  const cfg = window.VELIRA_CONFIG || window.VEBLIX_CONFIG || {};
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Meta Pixel — безпечний трекер подій (no-op, якщо піксель вимкнено в config.js) */
  const fbTrack = (event, params) => { try { if (window.fbq) window.fbq('track', event, params || {}); } catch (_) {} };

  /* Рік у футері */
  const yEl = document.getElementById('year');
  if (yEl) yEl.textContent = new Date().getFullYear();

  /* Ціни $ → ₴ */
  const rate = Number(cfg.UAH_RATE) || 41.5;
  document.querySelectorAll('[data-usd]').forEach(el => {
    const usd = parseFloat(el.dataset.usd);
    if (!isFinite(usd)) return;
    const uah = Math.round(usd * rate / 100) * 100;
    el.textContent = (el.dataset.from ? 'від ' : '~') + uah.toLocaleString('uk-UA') + ' ₴';
  });

  /* Бургер-меню */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  /* Sticky header + смужка прогресу */
  const header = document.getElementById('header');
  const progress = document.getElementById('scroll-progress');
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Поява при скролі (з надійним запобіжником) */
  const reveals = document.querySelectorAll('.reveal');
  const revealAll = () => reveals.forEach(el => el.classList.add('in'));
  if (reduceMotion || !('IntersectionObserver' in window) || !reveals.length) {
    revealAll();
  } else {
    let fired = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { fired = true; e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
    // якщо за 600мс IO не показав жодного елемента (фонова вкладка/збій) — показати все
    setTimeout(() => { if (!fired) revealAll(); }, 600);
  }

  /* Лічильники */
  const counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, target = parseFloat(el.dataset.count);
        const rawSuffix = el.dataset.suffix || '';
        const suffix = window.__t ? window.__t(rawSuffix) : rawSuffix;
        const dur = 1300, t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
          el.textContent = v.toLocaleString('uk-UA') + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target.toLocaleString('uk-UA') + suffix;
        };
        requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => co.observe(el));
  }

  /* Sticky mobile bar */
  const mobileBar = document.getElementById('mobile-bar');
  const ctaSection = document.getElementById('order');
  if (mobileBar) {
    const upd = () => {
      const y = window.scrollY;
      let inCta = false;
      if (ctaSection) { const r = ctaSection.getBoundingClientRect(); if (r.top < innerHeight - 100 && r.bottom > 200) inCta = true; }
      mobileBar.classList.toggle('is-visible', y > 360 && !inCta);
    };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
  }

  /* Плавний скрол */
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 74, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  /* Форма → Telegram */
  const form = document.getElementById('lead-form');
  const success = document.getElementById('cta-success');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const btn = form.querySelector('button[type=submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Надсилаємо…'; }
    const d = new FormData(form);
    // Заявка йде на серверний Netlify Function — Telegram-токен більше не в клієнті.
    let ok = true, err = '';
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch('/.netlify/functions/submit-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: d.get('name') || '', contact: d.get('contact') || '',
          plan: d.get('plan') || '', brief: d.get('brief') || '',
          company: d.get('company') || '', consent: d.get('consent') === 'true'
        }),
        signal: controller.signal
      });
      if (!r.ok) { ok = false; try { err = (await r.json()).error || ''; } catch (_) {} }
    } catch (error) {
      ok = false;
      if (error && error.name === 'AbortError') err = 'сервер не відповів вчасно';
    } finally {
      window.clearTimeout(requestTimeout);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Надіслати заявку'; }
    if (success) {
      success.hidden = false;
      if (ok) { form.reset(); success.classList.remove('is-error'); success.textContent = 'Дякуємо! Заявку отримано — відповімо протягом 24 годин.';
        fbTrack('Lead', { content_name: String(d.get('plan') || 'website'), content_category: 'website-order' }); }
      else { success.classList.add('is-error'); success.textContent = `Не вдалося надіслати${err ? ' (' + err + ')' : ''}. Напишіть нам у Telegram.`; }
      setTimeout(() => { success.hidden = true; success.classList.remove('is-error'); success.textContent = 'Дякуємо! Заявку отримано — відповімо протягом 24 годин.'; }, 7000);
    }
  });

  /* Meta Pixel — клік по будь-якому Telegram-посиланню = Contact */
  document.querySelectorAll('a[href*="t.me"]').forEach(a =>
    a.addEventListener('click', () => fbTrack('Contact', { method: 'telegram' })));

  /* ===== Тема (світла/темна) ===== */
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.classList.add('theme-anim');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('novaTheme', next); } catch (_) {}
    setTimeout(() => document.body.classList.remove('theme-anim'), 420);
  });

  /* ===== Інтерактивні тарифи (Стандарт / Терміново ×1.5) ===== */
  const applyPrices = (mode) => {
    const mult = mode === 'rush' ? 1.5 : 1;
    document.querySelectorAll('.plan').forEach(plan => {
      const amt = plan.querySelector('.plan__amount');
      if (!amt) return;
      const uah = plan.querySelector('.plan__uah');
      const base = parseFloat(amt.dataset.price);
      const from = amt.hasAttribute('data-from');
      const usd = Math.round(base * mult);
      const fromTxt = window.__t ? window.__t('від ') : 'від ';
      amt.textContent = (from ? fromTxt : '') + '$' + usd.toLocaleString('uk-UA');
      if (uah) {
        const g = Math.round(usd * rate / 100) * 100;
        uah.textContent = (from ? fromTxt : '~') + g.toLocaleString('uk-UA') + ' ₴';
      }
      const oldEl = plan.querySelector('.plan__old');
      if (oldEl && oldEl.dataset.old) {
        const oldUsd = Math.round(parseFloat(oldEl.dataset.old) * mult);
        oldEl.textContent = (from ? fromTxt : '') + '$' + oldUsd.toLocaleString('uk-UA');
      }
    });
  };
  const priceBtns = document.querySelectorAll('.price-toggle__btn');
  if (priceBtns.length) {
    applyPrices('standard');
    priceBtns.forEach(btn => btn.addEventListener('click', () => {
      priceBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyPrices(btn.dataset.mode);
    }));
  }
  // дозволяємо перемикачу мови перерендерити ціни (префікс «від»/«from»)
  window.refreshPrices = () => {
    const a = document.querySelector('.price-toggle__btn.is-active');
    applyPrices(a ? a.dataset.mode : 'standard');
  };

  /* ===== Тариф-кнопки → підставити у форму ===== */
  const planSelect = document.querySelector('#lead-form select[name=plan]');
  document.querySelectorAll('.plan .btn').forEach(btn => btn.addEventListener('click', () => {
    const plan = btn.closest('.plan');
    const name = plan && plan.dataset.plan;
    if (planSelect && name) {
      const opt = [...planSelect.options].find(o => o.text.startsWith(name));
      if (opt) planSelect.value = opt.value;
    }
  }));

  /* ===== Lightbox для робіт ===== */
  const lb = document.getElementById('lightbox');
  if (lb) {
    const lbScreen = document.getElementById('lb-screen');
    const lbTitle = document.getElementById('lb-title');
    const lbSub = document.getElementById('lb-sub');
    let lastFocus = null;
    const openLb = (card) => {
      const screen = card.querySelector('.work__screen');
      const meta = card.querySelector('.work__meta');
      lbScreen.innerHTML = '';
      if (screen) {
        const clone = screen.cloneNode(true);
        const h = card.style.getPropertyValue('--h');
        if (h) clone.style.setProperty('--h', h.trim());
        lbScreen.appendChild(clone);
      }
      const b = meta && meta.querySelector('b');
      const sub = meta && meta.querySelector('span');
      lbTitle.textContent = b ? b.textContent : 'Робота';
      lbSub.textContent = sub ? sub.textContent : '';
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lastFocus = document.activeElement;
      lb.querySelector('.lightbox__close').focus();
    };
    const closeLb = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    document.querySelectorAll('.work[data-lightbox]').forEach(card => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.addEventListener('click', () => openLb(card));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(card); } });
    });
    lb.querySelectorAll('[data-lb-close]').forEach(el => el.addEventListener('click', closeLb));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('is-open')) closeLb(); });
    /* Фокус-пастка: Tab циклить лише по елементах лайтбокса */
    lb.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = lb.querySelectorAll('button, a[href]');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ===== Каруселя відгуків ===== */
  const track = document.getElementById('testi-track');
  if (track) {
    const slides = [...track.children];
    const dotsWrap = document.getElementById('testi-dots');
    let idx = 0, timer = null;
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'testi__dot' + (i === 0 ? ' is-active' : '');
      d.type = 'button';
      d.setAttribute('aria-label', 'Відгук ' + (i + 1));
      d.addEventListener('click', () => go(i, true));
      dotsWrap.appendChild(d);
    });
    const dots = [...dotsWrap.children];
    const go = (n, user) => {
      idx = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      if (user) restart();
    };
    const start = () => { if (!reduceMotion && !timer) timer = setInterval(() => go(idx + 1), 6000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const restart = () => { stop(); start(); };
    const nextBtn = document.querySelector('.testi__next');
    const prevBtn = document.querySelector('.testi__prev');
    if (nextBtn) nextBtn.addEventListener('click', () => go(idx + 1, true));
    if (prevBtn) prevBtn.addEventListener('click', () => go(idx - 1, true));
    const testi = document.querySelector('.testi');
    if (testi) { testi.addEventListener('mouseenter', stop); testi.addEventListener('mouseleave', start); }
    let x0 = null;
    track.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1), true);
      x0 = null;
    });
    start();
  }

})();
