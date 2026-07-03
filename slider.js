/* =========================================================
   Veblix — кіно-секції з ПЛАВНИМ АВТО-ПРОГРАВАННЯМ за часом.
   • Кожна секція .cinema = повний екран (100dvh). Коли потрапляє у видиму
     зону — сама плавно програється за таймером (НЕ залежить від швидкості скролу).
   • Тривалість підібрана під час читання тексту (за к-стю підписів).
   • Дуже м'який рух завдяки кросфейду між сусідніми кадрами.
   • ПОВНА якість кадрів (16:9, як на ПК; на вузькому екрані cover-draw
     обрізає по боках). Пам'ять обмежуємо «рухомим вікном» завантажених кадрів.
   Кадри: <dir>/hd (широкий екран) або <dir>/sd; data-frames — к-сть; data-dir — тека.
   ========================================================= */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('.cinema')];
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const FPS_MS = 1000 / 30; // обмежуємо перемальовування до ~30 к/с (менше нагріву)

  // Світлий хедер, поки кіно-секція перекриває шапку
  const syncHeader = () => {
    const over = sections.some((s) => {
      const r = s.getBoundingClientRect();
      return r.top < 60 && r.bottom > 140;
    });
    document.body.classList.toggle('cinema-active', over);
  };
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  // Режим РЕАЛЬНОГО ВІДЕО (hero): натуральна швидкість, авто-плей/пауза за видимістю,
  // підписи синхронні до часу відео. Легко для телефона (апаратне декодування).
  function initVideoCinema(section, video, caps) {
    const updateCaps = (p) => {
      for (const el of caps) {
        const from = parseFloat(el.dataset.from || '0');
        const to = parseFloat(el.dataset.to || '1');
        el.classList.toggle('is-on', p >= from && p <= to);
      }
    };
    section.classList.add('cinema--canvas');
    const sync = () => { const d = video.duration; if (d > 0) updateCaps(Math.min(1, video.currentTime / d)); };
    video.addEventListener('timeupdate', sync);
    video.addEventListener('loadedmetadata', sync);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      // не перезапускаємо відео, яке вже догралось (hero без loop завершується на CTA)
      if (e.isIntersecting && e.intersectionRatio >= 0.35) { if (!video.ended) video.play().catch(() => {}); }
      else { video.pause(); }
    }), { threshold: [0, 0.35, 1] });
    io.observe(section);
    video.play().catch(() => {});
    updateCaps(0);
  }

  function initCinema(section) {
    const caps0 = [...section.querySelectorAll('.cine-cap')];
    const videoEl = section.querySelector('.cinema__video');
    if (videoEl) { return initVideoCinema(section, videoEl, caps0); }
    const canvas = section.querySelector('.cinema__canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const caps = [...section.querySelectorAll('.cine-cap')];
    const base = section.dataset.dir || 'slider';
    const dir = (window.innerWidth * DPR > 1300) ? `${base}/hd` : `${base}/sd`;
    const N = parseInt(section.dataset.frames || '0', 10);
    const src = (i) => `${dir}/frame-${String(i + 1).padStart(3, '0')}.webp`;
    if (ctx) ctx.imageSmoothingQuality = 'high';

    // тривалість програвання — близько до натуральної швидкості (не slow-mo), але встигнути прочитати
    const DUR = Math.max(7000, Math.min(13000, caps.length * 2200 + 3000));
    const AHEAD = 22, BEHIND = 4; // рухоме вікно кадрів у пам'яті

    const updateCaps = (p) => {
      for (const el of caps) {
        const from = parseFloat(el.dataset.from || '0');
        const to = parseFloat(el.dataset.to || '1');
        el.classList.toggle('is-on', p >= from && p <= to);
      }
    };
    const goStatic = () => {
      section.classList.remove('cinema--canvas');
      section.classList.add('cinema--static');
      updateCaps(0.92);
    };
    if (!ctx || reduce || !N) { goStatic(); return; }

    const imgs = new Array(N);
    const ok = (im) => im && im.complete && im.naturalWidth > 0;
    let ready = false, raf = 0, playStart = 0, lastDraw = 0, lastProg = -1, inView = false;

    const cover = (im) => {
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      return [(cw - dw) / 2, (ch - dh) / 2, dw, dh];
    };
    const paint = (i0, i1, frac) => {
      const a = imgs[i0]; if (!ok(a)) return;
      ctx.globalAlpha = 1; ctx.clearRect(0, 0, canvas.width, canvas.height);
      let r = cover(a); ctx.drawImage(a, r[0], r[1], r[2], r[3]);
      const b = (i1 !== i0) ? imgs[i1] : null;
      if (b && ok(b) && frac > 0.01) { ctx.globalAlpha = frac; r = cover(b); ctx.drawImage(b, r[0], r[1], r[2], r[3]); ctx.globalAlpha = 1; }
    };

    // рухоме вікно: вантажимо кадри навколо моменту відтворення, далекі — звільняємо
    const ensureWindow = (center) => {
      const lo = Math.max(0, center - BEHIND), hi = Math.min(N - 1, center + AHEAD);
      for (let i = lo; i <= hi; i++) {
        if (!imgs[i]) {
          const im = new Image(); im.decoding = 'async';
          if (i === 0) im.onload = () => { if (!ready) { ready = true; section.classList.add('cinema--canvas'); resize(); } };
          im.src = src(i); imgs[i] = im;
        }
      }
      for (let i = 0; i < N; i++) {
        if ((i < lo || i > hi) && imgs[i]) { imgs[i].onload = null; imgs[i].src = ''; imgs[i] = null; }
      }
    };

    const drawAt = (p) => {
      lastProg = p;
      if (Math.abs(p - (drawAt._cap || -1)) > 0.004) { updateCaps(p); drawAt._cap = p; }
      const center = Math.round(p * (N - 1));
      ensureWindow(center);
      const fpos = p * (N - 1);
      let i0 = Math.floor(fpos), frac = fpos - i0, i1 = Math.min(i0 + 1, N - 1);
      if (!ok(imgs[i0])) { let j = i0; while (j > 0 && !ok(imgs[j])) j--; i0 = j; i1 = j; frac = 0; }
      paint(i0, i1, frac);
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * DPR));
      canvas.height = Math.max(1, Math.round(r.height * DPR));
      if (lastProg >= 0) drawAt(lastProg);
    };

    const loop = (t) => {
      if (t - lastDraw >= FPS_MS) {
        lastDraw = t;
        const p = Math.min(1, (t - playStart) / DUR);
        drawAt(p);
        if (p >= 1) { raf = 0; return; } // дограли — тримаємо останній кадр
      }
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      ensureWindow(0);
      cancelAnimationFrame(raf);
      playStart = performance.now(); lastDraw = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const free = () => {
      stop();
      for (let i = 0; i < N; i++) if (imgs[i]) { imgs[i].onload = null; imgs[i].src = ''; imgs[i] = null; }
      ready = false; lastProg = -1; section.classList.remove('cinema--canvas');
    };

    // Авто-програвання за видимістю
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) { inView = true; play(); }
        else { inView = false; stop(); if (e.intersectionRatio === 0) free(); }
      });
    }, { threshold: [0, 0.5, 1] });
    io.observe(section);

    window.addEventListener('resize', () => { if (ready) resize(); });

    // QA-хук для скріншотів: window.__cineSeek(index, progress)
    (window.__cine = window.__cine || []).push({
      seek(p) { stop(); ensureWindow(0); if (!ready) { resize(); } setTimeout(() => drawAt(p), 120); }
    });
  }

  function initWorks() {
    document.querySelectorAll('.works-slider').forEach((sec) => {
      const slides = [...sec.querySelectorAll('.work-slide')];
      const dots = [...sec.querySelectorAll('.works-slider__dots button')];
      const n = slides.length || 1;
      let idx = 0, timer = 0;
      const show = (i) => {
        idx = (i + n) % n;
        slides.forEach((s, k) => s.classList.toggle('is-on', k === idx));
        dots.forEach((d, k) => d.classList.toggle('is-on', k === idx));
      };
      show(0);
      const start = () => { if (!timer) timer = setInterval(() => show(idx + 1), 4500); };
      const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
      dots.forEach((d, i) => d.addEventListener('click', () => { show(i); }));
      new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? start() : stop()),
        { threshold: 0.4 }).observe(sec);
    });
  }

  sections.forEach(initCinema);
  initWorks();

  // QA: ?t=0.5 — намалювати ПЕРШУ секцію на прогресі 0.5 (для скріншотів)
  const qt = new URLSearchParams(location.search).get('t');
  if (qt !== null && window.__cine && window.__cine[0]) {
    const p = Math.min(1, Math.max(0, parseFloat(qt) || 0));
    setTimeout(() => window.__cine[0].seek(p), 500);
  }
})();
