/* Veblix — hero-слайдер нової головної (scroll-driven, патерн animejs.com).
   Скрол сторінки — єдине джерело правди: прогрес у треку (340vh) мотає відео
   (keyframe-щільний енкодинг) і перемикає 3 сцени послуг; пігулки/стрілки/клавіші
   НЕ рухають контент напряму — вони пишуть scrollTop, рендер доганяє з лерпом.
   reduced-motion / помилка відео → статичні постери без sticky-треку. */
(() => {
  'use strict';
  const hero = document.getElementById('hero');
  const track = document.getElementById('hero-track');
  if (!hero || !track) return;
  const q = (s) => hero.querySelector(s);
  const video = q('.vh-hero__video');
  const poster = q('.vh-hero__poster');
  const sceneBox = q('.vh-scene');
  const titleEl = q('[data-scene-title]');
  const thoughtEl = q('[data-scene-thought]');
  const numEl = q('[data-scene-num]');
  const totalEl = q('[data-scene-total]');
  const progEl = q('[data-progress]');
  const hud = q('.vh-hud');
  const nodes = [...hero.querySelectorAll('.vh-hud__node')];

  const SCENES = [
    { title: 'Сайт', thought: 'Сайт веде людину до однієї зрозумілої дії.',                          cls: '',     poster: 'assets/img/scene-01.jpg' },
    { title: 'Бот',  thought: 'Запит не губиться — бот кваліфікує і передає живій людині.',           cls: '',     poster: 'assets/img/scene-02.jpg' },
    { title: 'Автоматизація та аналітика', thought: 'Процеси працюють самі, а щомісяця ти маєш рішення з власних даних.', cls: 'mint', poster: 'assets/img/scene-05.jpg' },
  ];
  const N = SCENES.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let staticMode = reduce;
  let dur = 24;          // оновиться з loadedmetadata
  let idx = -1;

  if (totalEl) totalEl.textContent = String(N).padStart(2, '0');

  // ── сцена (підписи/акценти); відео мотає apply() ──
  function setScene(i) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === idx) return;
    idx = i;
    const s = SCENES[i];
    titleEl.textContent = s.title;
    thoughtEl.textContent = s.thought;
    numEl.textContent = String(i + 1).padStart(2, '0');
    sceneBox.classList.toggle('is-mint', s.cls === 'mint');
    hud.classList.toggle('is-mint', s.cls === 'mint');
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
    }
  }

  // ── геометрія треку ──
  let trackTop = 0, range = 1;
  function measure() {
    const r = track.getBoundingClientRect();
    trackTop = r.top + window.scrollY;
    range = Math.max(1, track.offsetHeight - window.innerHeight);
  }

  // ── застосувати прогрес p∈[0..1]: відео + прогрес-бар + сцена ──
  function apply(p) {
    progEl.style.width = (p * 100) + '%';
    if (!staticMode && video.readyState >= 1 && isFinite(dur)) {
      try { video.currentTime = Math.min(dur - 0.05, Math.max(0, p * dur)); } catch (_) {}
    }
    setScene(Math.min(N - 1, Math.floor(p * N)));
  }

  // ── скрол → target; лерп доганяє (липкість як scrub/sync ~0.75) ──
  let target = 0, cur = -1, rafId = 0;
  function loop() {
    cur += (target - cur) * 0.16;
    if (Math.abs(target - cur) < 0.0008) cur = target;
    apply(cur);
    rafId = (cur === target) ? 0 : requestAnimationFrame(loop);
  }
  function onScroll() {
    if (staticMode) return;
    target = Math.min(1, Math.max(0, (window.scrollY - trackTop) / range));
    if (cur < 0) cur = target;
    // синхронний крок — тримає слайдер живим навіть без rAF (фонові вкладки/прев'ю)
    cur += (target - cur) * 0.35;
    apply(cur);
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  // ── HUD/клавіші/стрілки пишуть СКРОЛ, не сцену (одне джерело правди) ──
  function goto(i) {
    i = ((i % N) + N) % N;
    if (staticMode) { setScene(i); return; }
    const y = trackTop + range * ((i + 0.5) / N);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  q('[data-prev]').addEventListener('click', () => goto(idx - 1));
  q('[data-next]').addEventListener('click', () => goto(idx + 1));
  nodes.forEach((n) => n.addEventListener('click', () => goto(+n.dataset.go)));
  hero.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goto(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goto(idx + 1); }
  });

  // ── статичний фолбек ──
  function goStatic() {
    if (staticMode) return;
    staticMode = true;
    hero.classList.add('is-static');
    track.classList.add('is-static');
    const cur0 = Math.max(0, idx); idx = -1; setScene(cur0);
  }

  // ── ініціалізація ──
  if (staticMode) {
    hero.classList.add('is-static');
    track.classList.add('is-static');
    setScene(0);
  } else {
    try { video.pause(); } catch (_) {}
    video.addEventListener('loadedmetadata', () => {
      if (isFinite(video.duration) && video.duration > 1) dur = video.duration;
      onScroll();
    });
    video.addEventListener('error', goStatic);
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { measure(); onScroll(); });
    setScene(0);
    onScroll();
    // ховаємо підказку «прокрутіть» після першого реального скролу
    const hint = q('.vh-hud__hint');
    if (hint) window.addEventListener('scroll', () => hint.classList.add('is-done'), { once: true, passive: true });
  }
})();
