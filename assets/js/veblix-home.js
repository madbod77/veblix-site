/* Veblix — hero-слайдер нової головної.
   Модель: 3 сцени наших послуг (Сайт → Бот → Автоматизація та аналітика) авто-прокручуються
   по таймеру (працює НЕЗАЛЕЖНО від того, чи дозволив браузер автоплей). Кінематографічне
   відео (Higgsfield Omni) — синхронний ambient-фон: рівно N рівних сегментів (dur = duration/N),
   на зміну сцени сікаємо його до відповідного моменту й лишаємо гратись. Пауза на
   поза-viewport / прихована вкладка. reduced-motion / помилка → статичні постери. */
(() => {
  'use strict';
  const hero = document.getElementById('hero');
  if (!hero) return;
  const q = (s) => hero.querySelector(s);
  const video = q('.vh-hero__video');
  const poster = q('.vh-hero__poster');
  const sceneBox = q('.vh-scene');
  const titleEl = q('[data-scene-title]');
  const thoughtEl = q('[data-scene-thought]');
  const numEl = q('[data-scene-num]');
  const progEl = q('[data-progress]');
  const totalEl = q('[data-scene-total]');
  const hud = q('.vh-hud');
  const nodes = [...hero.querySelectorAll('.vh-hud__node')];

  const SCENES = [
    { title: 'Сайт', thought: 'Сайт веде людину до однієї зрозумілої дії.',                          cls: '',     poster: 'assets/img/scene-01.jpg' },
    { title: 'Бот',  thought: 'Запит не губиться — бот кваліфікує і передає живій людині.',           cls: '',     poster: 'assets/img/scene-02.jpg' },
    { title: 'Автоматизація та аналітика', thought: 'Процеси працюють самі, а щомісяця ти маєш рішення з власних даних.', cls: 'mint', poster: 'assets/img/scene-05.jpg' },
  ];
  const N = SCENES.length;
  const SCENE_MS = 5200;
  const VIDEO_SEC = 24;  // фолбек, доки не прийшла metadata
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let vidEnd = VIDEO_SEC;
  let dur = VIDEO_SEC / N;   // тривалість сегмента відео на сцену (оновиться з metadata)
  let idx = -1;
  let staticMode = reduce;

  if (totalEl) totalEl.textContent = String(N).padStart(2, '0');

  // ── застосувати активну сцену ──
  function setActive(i) {
    i = ((i % N) + N) % N;
    if (i === idx) return;
    idx = i;
    const s = SCENES[i];
    titleEl.textContent = s.title;
    thoughtEl.textContent = s.thought;
    numEl.textContent = String(i + 1).padStart(2, '0');
    sceneBox.classList.toggle('is-mint', s.cls === 'mint');
    hud.classList.toggle('is-mint',  s.cls === 'mint');
    nodes.forEach((n, k) => {
      const on = k === i;
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    sceneBox.removeAttribute('data-anim');
    void sceneBox.offsetWidth;
    sceneBox.setAttribute('data-anim', '');
    if (staticMode) {
      poster.src = s.poster;
      progEl.style.width = ((i + 1) / N * 100) + '%';
    } else {
      try { video.currentTime = Math.min(vidEnd - 0.1, i * dur + 0.03); } catch (_) {}
    }
  }

  // ── авто-прокрутка по таймеру (rAF) ──
  let running = false, remaining = SCENE_MS, last = 0;
  function frame(ts) {
    if (!running) return;
    if (last) {
      remaining -= (ts - last);
      progEl.style.width = Math.max(0, Math.min(1, 1 - remaining / SCENE_MS)) * 100 + '%';
      if (remaining <= 0) { remaining = SCENE_MS; setActive(idx + 1); }
    }
    last = ts;
    rafId = requestAnimationFrame(frame);
  }
  let rafId = 0;
  // У staticMode смужка показує позицію сцени (1/N), а не хід таймера, — тож не гасимо її в нуль.
  function resetTimer() {
    remaining = SCENE_MS; last = 0;
    progEl.style.width = staticMode ? ((idx + 1) / N * 100) + '%' : '0%';
  }

  // ── шлюз відтворення: відео грає завжди, поки секція видима і вкладка активна.
  // Для full-bleed hero НЕ ставимо на паузу при hover — курсор майже завжди над відео. ──
  let inView = true, hidden = false;
  const allowed = () => !staticMode && inView && !hidden;
  function run() {
    if (!allowed()) return;
    if (!running) { running = true; last = 0; rafId = requestAnimationFrame(frame); }
    if (video.paused) { const p = video.play && video.play(); if (p) p.catch(() => {}); }
  }
  function halt() {
    running = false; cancelAnimationFrame(rafId);
    try { video.pause(); } catch (_) {}
  }
  function sync() { allowed() ? run() : halt(); }

  document.addEventListener('visibilitychange', () => { hidden = document.hidden; sync(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { inView = es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(hero);
  }
  // Фолбек: якщо браузер заблокував muted-autoplay — стартуємо на першу взаємодію
  const kick = () => { if (allowed() && video.paused && video.play) video.play().catch(() => {}); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, kick, { once: true, passive: true }));

  // ── ручне керування ──
  function go(i) { setActive(i); resetTimer(); }
  q('[data-prev]').addEventListener('click', () => go(idx - 1));
  q('[data-next]').addEventListener('click', () => go(idx + 1));
  nodes.forEach((n) => n.addEventListener('click', () => go(+n.dataset.go)));
  hero.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
  });
  let x0 = null;
  hero.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 45) go(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // ── ініціалізація ──
  function goStatic() {
    if (staticMode) return;
    staticMode = true; halt();
    hero.classList.add('is-static');
    const cur = Math.max(0, idx); idx = -1; setActive(cur);
  }
  if (staticMode) {
    hero.classList.add('is-static');
    setActive(0);
  } else {
    video.addEventListener('loadedmetadata', () => {
      if (isFinite(video.duration) && video.duration > 1) {
        vidEnd = video.duration;
        dur = vidEnd / N;
      }
      sync();
    });
    video.addEventListener('error', goStatic);
    setActive(0);
    sync();
  }
})();
