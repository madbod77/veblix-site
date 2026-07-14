/* Veblix — hero-слайдер нової головної (scroll-driven, патерн animejs.com).
   Скрол сторінки — єдине джерело правди: прогрес адаптивного треку мотає відео
   (keyframe-щільний енкодинг) і перемикає 3 сцени послуг; пігулки/стрілки/клавіші
   НЕ рухають контент напряму — вони пишуть scrollTop, рендер доганяє з лерпом.
   reduced-motion / помилка відео → статичні постери без sticky-треку. */
(() => {
  'use strict';
  const hero = document.getElementById('hero');
  const track = document.getElementById('hero-track');
  if (!hero || !track) return;
  const siteNav = document.querySelector('.vh-nav');
  const offers = document.getElementById('offers');
  const q = (s) => hero.querySelector(s);
  const video = q('.vh-hero__video');
  const poster = q('.vh-hero__poster');
  const mobileMedia = matchMedia('(max-width: 820px) and (orientation: portrait)');
  const sceneBox = q('.vh-scene');
  const titleEl = q('[data-scene-title]');
  const thoughtEl = q('[data-scene-thought]');
  const numEl = q('[data-scene-num]');
  const totalEl = q('[data-scene-total]');
  const progEl = q('[data-progress]');
  const hud = q('.vh-hud');
  const nextBtn = q('[data-next]');
  const nodes = [...hero.querySelectorAll('.vh-hud__node')];

  const SCENES = [
    { title: 'Сайт', thought: 'Сайт веде людину до однієї зрозумілої дії.', cls: '', poster: 'assets/img/scene-01.jpg', posterMobile: 'assets/img/scene-01-mobile.jpg' },
    { title: 'Бот',  thought: 'Запит не губиться — бот кваліфікує і передає живій людині.', cls: '', poster: 'assets/img/scene-02.jpg', posterMobile: 'assets/img/scene-02-mobile.jpg' },
    { title: 'Автоматизація та аналітика', thought: 'Процеси працюють самі, а щомісяця ти маєш рішення з власних даних.', cls: 'mint', poster: 'assets/img/scene-05.jpg', posterMobile: 'assets/img/scene-05-mobile.jpg' },
  ];
  const N = SCENES.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let staticMode = reduce;
  let dur = 24;          // оновиться з loadedmetadata
  let idx = -1;
  const SCRUB_FPS = 24;
  let pendingVideoTime = null;
  let lastVideoTime = -1;

  if (totalEl) totalEl.textContent = String(N).padStart(2, '0');
  video.poster = mobileMedia.matches ? 'assets/img/hero-poster-mobile.jpg' : 'assets/img/hero-poster.jpg';

  function scenePoster(scene) {
    return mobileMedia.matches ? scene.posterMobile : scene.poster;
  }

  function showPoster(show) {
    if (!poster) return;
    poster.hidden = !show;
  }

  // Chromium не переобирає <source media> сам після фізичного повороту
  // телефона. Перезавантажуємо лише медіаелемент, а loadedmetadata нижче
  // повертає відео до актуальної позиції scroll-scrub.
  mobileMedia.addEventListener('change', () => {
    video.poster = mobileMedia.matches ? 'assets/img/hero-poster-mobile.jpg' : 'assets/img/hero-poster.jpg';
    if (staticMode) {
      if (idx >= 0) poster.src = scenePoster(SCENES[idx]);
      return;
    }
    pendingVideoTime = null;
    lastVideoTime = -1;
    try {
      video.load();
      video.pause();
    } catch (_) {}
  });

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
    nextBtn.setAttribute('aria-label', i === N - 1 ? 'Перейти до пропозицій' : 'Наступна сцена');
    nodes.forEach((n, k) => {
      const on = k === i;
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    sceneBox.removeAttribute('data-anim');
    void sceneBox.offsetWidth;
    sceneBox.setAttribute('data-anim', '');
    if (staticMode) {
      poster.src = scenePoster(s);
      showPoster(true);
      progEl.style.transform = `scaleX(${(i + 1) / N})`;
    }
  }

  // ── геометрія треку ──
  let trackTop = 0, range = 1;
  function measure() {
    const r = track.getBoundingClientRect();
    trackTop = r.top + window.scrollY;
    range = Math.max(1, track.offsetHeight - window.innerHeight);
  }

  // Прибираємо глобальну навігацію, доки scroll-трек керує слайдером.
  // Щойно sticky-ділянка завершилась, панель повертається над оферами.
  function updateNavVisibility() {
    if (!siteNav) return;
    if (staticMode) {
      siteNav.classList.remove('is-slider-hidden');
      siteNav.inert = false;
      siteNav.removeAttribute('aria-hidden');
      return;
    }
    // Тримаємо панель прихованою й під час виходу sticky-сцени. Вона
    // повертається лише коли верх наступної секції дістався верху екрана.
    const sliderActive = track.getBoundingClientRect().bottom > 1;
    siteNav.classList.toggle('is-slider-hidden', sliderActive);
    siteNav.inert = sliderActive;
    if (sliderActive) siteNav.setAttribute('aria-hidden', 'true');
    else siteNav.removeAttribute('aria-hidden');
  }

  // Один актуальний seek замість десятків скасованих range-запитів за секунду.
  // Кадри квантуються до FPS самого all-I відео; під час seek зберігаємо лише
  // найновішу позицію й застосовуємо її одразу після seeked.
  function requestVideoTime(value) {
    const raw = Math.min(dur - 0.05, Math.max(0, value));
    const next = Math.round(raw * SCRUB_FPS) / SCRUB_FPS;
    if (video.seeking) {
      pendingVideoTime = next;
      return;
    }
    if (Math.abs(next - lastVideoTime) < 1 / (SCRUB_FPS * 2)) return;
    try {
      video.currentTime = next;
      lastVideoTime = next;
    } catch (_) {}
  }

  video.addEventListener('seeked', () => {
    if (pendingVideoTime == null) return;
    const next = pendingVideoTime;
    pendingVideoTime = null;
    if (Math.abs(next - video.currentTime) < 1 / (SCRUB_FPS * 2)) {
      lastVideoTime = next;
      return;
    }
    try {
      video.currentTime = next;
      lastVideoTime = next;
    } catch (_) {}
  });

  // ── застосувати прогрес p∈[0..1]: відео + прогрес-бар + сцена ──
  function apply(p) {
    progEl.style.transform = `scaleX(${p})`;
    if (!staticMode && video.readyState >= 1 && isFinite(dur)) {
      requestVideoTime(p * dur);
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
    updateNavVisibility();
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
    if (i >= N) {
      offers?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    i = Math.max(0, Math.min(N - 1, i));
    if (staticMode) { setScene(i); return; }
    const y = trackTop + range * ((i + 0.5) / N);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  q('[data-prev]').addEventListener('click', () => goto(idx - 1));
  nextBtn.addEventListener('click', () => goto(idx + 1));
  nodes.forEach((n) => n.addEventListener('click', () => goto(+n.dataset.go)));
  hero.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goto(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goto(idx + 1); }
  });

  // ── статичний фолбек ──
  function goStatic(reason = 'media-error') {
    if (staticMode) return;
    staticMode = true;
    hero.dataset.staticReason = reason;
    hero.classList.add('is-static');
    track.classList.add('is-static');
    updateNavVisibility();
    showPoster(true);
    const cur0 = Math.max(0, idx); idx = -1; setScene(cur0);
  }

  // ── ініціалізація ──
  if (staticMode) {
    hero.dataset.staticReason = 'reduced-motion';
    hero.classList.add('is-static');
    track.classList.add('is-static');
    updateNavVisibility();
    showPoster(true);
    setScene(0);
  } else {
    showPoster(false);
    try { video.pause(); } catch (_) {}
    video.addEventListener('loadedmetadata', () => {
      if (isFinite(video.duration) && video.duration > 1) dur = video.duration;
      lastVideoTime = -1;
      onScroll();
    });
    // Chrome can briefly emit a media error while replacing a cached byte-range
    // response, then successfully load metadata from the fresh MP4.  Do not
    // collapse the whole scroll track on that transient event; verify that the
    // element is still genuinely unusable first.
    video.addEventListener('error', () => {
      window.setTimeout(() => {
        const code = video.error?.code || 0;
        const hasMetadata = Number.isFinite(video.duration) && video.duration > 1;
        // MEDIA_ERR_NETWORK (2) is commonly raised when a scroll seek cancels
        // an in-flight byte-range request. Metadata remains valid and the next
        // currentTime assignment recovers, so treating it as fatal would make
        // the entire hero disappear during a normal fast scroll.
        const fatal = (code && code !== 2) || (!hasMetadata && video.readyState === 0);
        if (fatal) {
          goStatic(`media-error:${code}:ready-${video.readyState}`);
        }
      }, 700);
    });
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      measure();
      if (staticMode && idx >= 0) poster.src = scenePoster(SCENES[idx]);
      onScroll();
    });
    setScene(0);
    onScroll();
    // ховаємо підказку «прокрутіть» після першого реального скролу
    const hint = q('.vh-hud__hint');
    if (hint) window.addEventListener('scroll', () => hint.classList.add('is-done'), { once: true, passive: true });
  }
})();
