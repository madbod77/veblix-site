/* Velira home — progressive enhancement for navigation, language, motion and leads. */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  root.classList.remove('no-js');
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const init = (name, setup) => {
    try {
      setup();
    } catch (error) {
      console.error(`Velira: ${name} could not be initialised.`, error);
    }
  };

  /* Mobile menu: focus stays inside, Escape restores the toggle, desktop resets. */
  init('navigation menu', () => {
    const nav = document.querySelector('[data-nav]');
    const toggle = document.querySelector('[data-menu-toggle]');
    const panel = document.querySelector('[data-menu-panel]');
    if (!nav || !toggle || !panel) return;

    const mobileMenu = window.matchMedia('(max-width: 932px)');
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    let open = false;

    const panelItems = () => Array.from(panel.querySelectorAll(focusableSelector))
      .filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0);
    const focusableItems = () => [toggle, ...panelItems()]
      .filter((element) => element.getClientRects().length > 0);

    const setPanelInert = (inert) => {
      if ('inert' in panel) panel.inert = inert;
    };

    const closeMenu = ({ restoreFocus = false } = {}) => {
      open = false;
      nav.classList.remove('is-open');
      body.classList.remove('is-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (mobileMenu.matches) {
        panel.setAttribute('aria-hidden', 'true');
        setPanelInert(true);
      } else {
        panel.removeAttribute('aria-hidden');
        setPanelInert(false);
      }
      if (restoreFocus && document.contains(toggle)) toggle.focus();
    };

    const openMenu = () => {
      if (!mobileMenu.matches) return;
      open = true;
      nav.classList.add('is-open');
      body.classList.add('is-menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      panel.removeAttribute('aria-hidden');
      setPanelInert(false);
      window.requestAnimationFrame(() => panelItems()[0]?.focus());
    };

    const syncMode = () => {
      if (mobileMenu.matches) {
        closeMenu();
        return;
      }
      open = false;
      nav.classList.remove('is-open');
      body.classList.remove('is-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      panel.removeAttribute('aria-hidden');
      setPanelInert(false);
    };

    toggle.addEventListener('click', () => {
      if (open) closeMenu({ restoreFocus: true });
      else openMenu();
    });
    panel.addEventListener('click', (event) => {
      if (open && event.target.closest('a[href]')) closeMenu();
    });
    document.addEventListener('pointerdown', (event) => {
      if (open && !nav.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableItems();
      if (!items.length) {
        event.preventDefault();
        toggle.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (typeof mobileMenu.addEventListener === 'function') mobileMenu.addEventListener('change', syncMode);
    else mobileMenu.addListener(syncMode);
    syncMode();
  });

  let currentLanguage = 'uk';
  const languageButtons = Array.from(document.querySelectorAll('[data-lang]'));
  const translatedNodes = Array.from(document.querySelectorAll('[data-ua][data-en]'));
  const translatedPlaceholders = Array.from(document.querySelectorAll('[data-placeholder-ua][data-placeholder-en]'));
  const translatedAriaLabels = Array.from(document.querySelectorAll('[data-aria-label-ua][data-aria-label-en]'));
  const translatedAltText = Array.from(document.querySelectorAll('[data-alt-ua][data-alt-en]'));
  const translatedHrefs = Array.from(document.querySelectorAll('[data-href-ua][data-href-en]'));

  const readSavedLanguage = () => {
    try {
      const saved = window.localStorage.getItem('veliraLanguage');
      return saved === 'en' || saved === 'uk' ? saved : null;
    } catch (_) {
      return null;
    }
  };

  const saveLanguage = (language) => {
    try {
      window.localStorage.setItem('veliraLanguage', language);
    } catch (_) {
      /* Storage can be unavailable in private or embedded contexts. */
    }
  };

  const applyLanguage = (language, { persist = true } = {}) => {
    currentLanguage = language === 'en' ? 'en' : 'uk';
    const dataKey = currentLanguage === 'en' ? 'en' : 'ua';
    root.lang = currentLanguage;

    translatedNodes.forEach((element) => {
      const value = element.dataset[dataKey];
      if (typeof value === 'string') element.textContent = value;
    });
    translatedPlaceholders.forEach((element) => {
      const key = dataKey === 'en' ? 'placeholderEn' : 'placeholderUa';
      const value = element.dataset[key];
      if (typeof value === 'string') element.setAttribute('placeholder', value);
    });
    translatedAriaLabels.forEach((element) => {
      const key = dataKey === 'en' ? 'ariaLabelEn' : 'ariaLabelUa';
      const value = element.dataset[key];
      if (typeof value === 'string') element.setAttribute('aria-label', value);
    });
    translatedAltText.forEach((element) => {
      const key = dataKey === 'en' ? 'altEn' : 'altUa';
      const value = element.dataset[key];
      if (typeof value === 'string') element.setAttribute('alt', value);
    });
    translatedHrefs.forEach((element) => {
      const key = dataKey === 'en' ? 'hrefEn' : 'hrefUa';
      const value = element.dataset[key];
      if (typeof value === 'string') element.setAttribute('href', value);
    });
    languageButtons.forEach((button) => {
      const active = button.dataset.lang === currentLanguage;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (persist) saveLanguage(currentLanguage);
    document.dispatchEvent(new CustomEvent('velira:languagechange', {
      detail: { language: currentLanguage },
    }));
  };

  init('language switcher', () => {
    languageButtons.forEach((button) => {
      button.addEventListener('click', () => applyLanguage(button.dataset.lang));
    });
    applyLanguage(readSavedLanguage() || (root.lang === 'en' ? 'en' : 'uk'), { persist: false });
  });

  init('marquee controls', () => {
    const marquee = document.querySelector('[data-marquee]');
    const toggle = document.querySelector('[data-marquee-toggle]');
    if (!marquee || !toggle) return;
    let paused = false;
    const render = () => {
      marquee.classList.toggle('is-paused', paused);
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', currentLanguage === 'en'
        ? (paused ? 'Resume moving services' : 'Pause moving services')
        : (paused ? 'Продовжити рух послуг' : 'Зупинити рух послуг'));
      toggle.textContent = paused ? '▶' : 'Ⅱ';
    };
    toggle.addEventListener('click', () => {
      paused = !paused;
      render();
    });
    document.addEventListener('velira:languagechange', render);
    render();
  });

  init('clarity motion router', () => {
    document.querySelectorAll('[data-clarity-machine]').forEach((machine) => {
      const buttons = Array.from(machine.querySelectorAll('[data-clarity-step]'));
      const status = machine.querySelector('[data-clarity-status]');
      if (!buttons.length) return;

      const selectStep = (step) => {
        if (!buttons.some((button) => button.dataset.clarityStep === step)) return;
        machine.dataset.step = step;
        buttons.forEach((button) => {
          button.setAttribute('aria-pressed', button.dataset.clarityStep === step ? 'true' : 'false');
        });
        if (status) status.textContent = `${String(step).padStart(2, '0')} / 03`;
      };

      machine.addEventListener('click', (event) => {
        const button = event.target.closest('[data-clarity-step]');
        if (!button || !machine.contains(button)) return;
        selectStep(button.dataset.clarityStep);
      });

      machine.addEventListener('keydown', (event) => {
        const button = event.target.closest('[data-clarity-step]');
        if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = buttons.indexOf(button);
        let next = current;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length;
        else next = (current + 1) % buttons.length;
        buttons[next].focus();
        selectStep(buttons[next].dataset.clarityStep);
      });

      selectStep(machine.dataset.step || '1');
    });
  });

  /* One-shot signal route: every moving packet is sampled from the drawn SVG path. */
  init('automation dispatch', () => {
    const statuses = [
      'ROUTE READY / 0 OF 4',
      'CAPTURING / 1 OF 4',
      'VALIDATING / 2 OF 4',
      'SYNCING CRM / 3 OF 4',
      'HANDOFF COMPLETE / 4 OF 4',
    ];
    const duration = 4800;
    const smoothstep = (value) => value * value * (3 - (2 * value));

    document.querySelectorAll('[data-dispatch]').forEach((dispatch) => {
      const service = dispatch.closest('[data-service]');
      const routes = Array.from(dispatch.querySelectorAll('[data-dispatch-route]'));
      const activeRoutes = Array.from(dispatch.querySelectorAll('[data-dispatch-active]'));
      const packets = Array.from(dispatch.querySelectorAll('[data-dispatch-packet]'));
      const status = dispatch.querySelector('[data-dispatch-status]');
      if (!service || !routes.length || routes.length !== activeRoutes.length || routes.length !== packets.length) return;

      const routePairs = routes.map((route, index) => {
        const length = route.getTotalLength();
        const stops = (route.dataset.dispatchStops || '0.29 0.66')
          .split(/\s+/)
          .map(Number);
        const activeRoute = activeRoutes[index];
        activeRoute.style.strokeDasharray = `${length}`;
        return { route, activeRoute, packet: packets[index], length, stops };
      });
      let animationFrame = 0;
      let startedAt = 0;
      let running = false;
      let currentStep = -1;

      const setStep = (step) => {
        if (currentStep === step) return;
        currentStep = step;
        dispatch.dataset.dispatchStep = String(step);
        if (status) status.textContent = statuses[step];
      };

      const routeProgressAt = (time, stops) => {
        const firstStop = stops[0];
        const secondStop = stops[1];
        if (time < 0.12) return 0;
        if (time < 0.28) return smoothstep((time - 0.12) / 0.16) * firstStop;
        if (time < 0.42) return firstStop;
        if (time < 0.58) return firstStop + (smoothstep((time - 0.42) / 0.16) * (secondStop - firstStop));
        if (time < 0.72) return secondStop;
        if (time < 0.88) return secondStop + (smoothstep((time - 0.72) / 0.16) * (1 - secondStop));
        return 1;
      };

      const stepAt = (time) => {
        if (time < 0.28) return 1;
        if (time < 0.58) return 2;
        if (time < 0.88) return 3;
        return 4;
      };

      const draw = (routePair, progress) => {
        const distance = routePair.length * clamp(progress);
        const point = routePair.route.getPointAtLength(distance);
        routePair.activeRoute.style.strokeDashoffset = `${routePair.length - distance}`;
        routePair.packet.setAttribute('transform', `translate(${point.x} ${point.y})`);
      };

      const drawAll = (time) => {
        routePairs.forEach((routePair) => draw(routePair, routeProgressAt(time, routePair.stops)));
      };

      const stop = () => {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        running = false;
      };

      const reset = () => {
        stop();
        currentStep = -1;
        dispatch.classList.remove('is-running', 'is-complete');
        setStep(0);
        routePairs.forEach((routePair) => draw(routePair, 0));
      };

      const renderComplete = () => {
        stop();
        setStep(4);
        routePairs.forEach((routePair) => draw(routePair, 1));
        dispatch.classList.remove('is-running');
        dispatch.classList.add('is-complete');
      };

      const tick = (now) => {
        if (!running) return;
        if (!startedAt) startedAt = now;
        const time = clamp((now - startedAt) / duration);
        setStep(stepAt(time));
        drawAll(time);

        if (time < 1) {
          animationFrame = window.requestAnimationFrame(tick);
          return;
        }
        renderComplete();
      };

      const run = () => {
        if (reduceMotion.matches) {
          renderComplete();
          return;
        }
        if (running) return;
        reset();
        running = true;
        startedAt = 0;
        dispatch.classList.add('is-running');
        animationFrame = window.requestAnimationFrame(tick);
      };

      const sync = () => {
        if (reduceMotion.matches) {
          renderComplete();
          return;
        }
        if (service.classList.contains('is-motion-active') && !document.hidden) run();
        else reset();
      };

      const serviceObserver = new MutationObserver(sync);
      serviceObserver.observe(service, { attributes: true, attributeFilter: ['class'] });

      const onMotionPreferenceChange = () => sync();
      if (typeof reduceMotion.addEventListener === 'function') {
        reduceMotion.addEventListener('change', onMotionPreferenceChange);
      } else {
        reduceMotion.addListener(onMotionPreferenceChange);
      }

      document.addEventListener('visibilitychange', sync);
      reset();
      sync();
    });
  });

  /* Reveal once; service demos only stay active while visible. */
  init('intersection reveals', () => {
    const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
    const services = Array.from(document.querySelectorAll('[data-service]'));
    const motionItems = Array.from(document.querySelectorAll(
      '.vl-marquee, .vl-leak, .vl-service, .vw-clarity-machine',
    ));
    const showEverything = () => {
      revealItems.forEach((element) => element.classList.add('is-visible'));
      services.forEach((element) => element.classList.add('is-active'));
      motionItems.forEach((element) => element.classList.add('is-motion-active'));
    };

    if (!('IntersectionObserver' in window)) {
      showEverything();
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-motion-active', entry.isIntersecting);
        if (entry.target.matches('[data-service]')) {
          entry.target.classList.toggle('is-active', entry.isIntersecting);
        }
      });
    }, { threshold: 0.08, rootMargin: '8% 0px 8% 0px' });

    if (reduceMotion.matches) {
      revealItems.forEach((element) => element.classList.add('is-visible'));
    } else {
      revealItems.forEach((element) => revealObserver.observe(element));
    }
    motionItems.forEach((element) => motionObserver.observe(element));

    const onMotionChange = (event) => {
      if (event.matches) {
        revealObserver.disconnect();
        revealItems.forEach((element) => element.classList.add('is-visible'));
        return;
      }
      revealItems
        .filter((element) => !element.classList.contains('is-visible'))
        .forEach((element) => revealObserver.observe(element));
    };
    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', onMotionChange);
    } else {
      reduceMotion.addListener(onMotionChange);
    }
  });

  /* Visual scroll effects never intercept wheel, touch, keys or scroll position. */
  init('scroll effects', () => {
    const nav = document.querySelector('[data-nav]');
    const phoneStage = document.querySelector('[data-phone-stage]');
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerInside = false;

    const updatePhone = () => {
      if (!phoneStage) return;
      if (reduceMotion.matches) {
        phoneStage.style.setProperty('--phone-y', '0px');
        phoneStage.style.setProperty('--phone-rotate', '0deg');
        phoneStage.style.setProperty('--phone-scale', '1');
        return;
      }
      const rect = phoneStage.getBoundingClientRect();
      const progress = clamp((window.innerHeight - rect.top) / Math.max(1, window.innerHeight + rect.height));
      const scrollOffset = (0.5 - progress) * 9;
      const hoverY = pointerInside && finePointer.matches ? pointerY * 2.5 : 0;
      const rotate = pointerInside && finePointer.matches ? pointerX * 1.1 : 0;
      const scale = pointerInside && finePointer.matches ? 1.006 : 1;
      phoneStage.style.setProperty('--phone-y', `${(scrollOffset + hoverY).toFixed(2)}px`);
      phoneStage.style.setProperty('--phone-rotate', `${rotate.toFixed(2)}deg`);
      phoneStage.style.setProperty('--phone-scale', String(scale));
    };

    const update = () => {
      frame = 0;
      nav?.classList.toggle('is-scrolled', window.scrollY > 20);
      updatePhone();
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    if (phoneStage && finePointer.matches && !reduceMotion.matches) {
      phoneStage.addEventListener('pointerenter', () => {
        pointerInside = true;
        schedule();
      });
      phoneStage.addEventListener('pointermove', (event) => {
        const rect = phoneStage.getBoundingClientRect();
        pointerX = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) * 2 - 1;
        pointerY = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1) * 2 - 1;
        schedule();
      });
      phoneStage.addEventListener('pointerleave', () => {
        pointerInside = false;
        pointerX = 0;
        pointerY = 0;
        schedule();
      });
    }
    if (typeof reduceMotion.addEventListener === 'function') reduceMotion.addEventListener('change', schedule);
    update();
  });

  init('current year', () => {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach((element) => {
      element.textContent = year;
    });
  });

  /* Accessible validation plus local-only preview or same-origin production POST. */
  init('lead form', () => {
    const form = document.querySelector('[data-lead-form]');
    if (!form) return;

    const submitButton = form.querySelector('[data-submit]');
    const submitLabel = submitButton?.querySelector('span');
    const status = form.querySelector('[data-form-status]');
    const controls = Array.from(form.elements)
      .filter((control) => control instanceof HTMLElement && control.name);
    const requiredFields = controls.filter((control) => control.matches('[required]'));
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const localPreview = window.location.protocol === 'file:'
      || localHosts.has(window.location.hostname)
      || window.location.hostname.endsWith('.local');
    let state = 'idle';
    let statusKey = '';

    const copy = {
      uk: {
        submit: submitLabel?.dataset.ua || 'Надіслати задачу',
        sending: 'Надсилаємо…',
        nameRequired: 'Вкажіть ім’я або назву бренду.',
        contactRequired: 'Вкажіть Telegram, email або телефон.',
        consentRequired: 'Підтвердьте, що прочитали повідомлення про приватність.',
        telegramConsentRequired: 'Підтвердьте окрему згоду на доставку заявки через Telegram Bot API.',
        required: 'Заповніть це поле.',
        validation: 'Перевірте позначені поля й спробуйте ще раз.',
        success: 'Дякуємо! Заявку отримано — зв’яжемося з вами найближчим часом.',
        preview: 'Локальний preview: форму перевірено, але заявку нікуди не надсилали.',
        rateLimit: 'Забагато спроб. Зачекайте хвилину й надішліть ще раз.',
        timeout: 'Сервер не відповів вчасно.',
        error: 'Не вдалося автоматично надіслати заявку.',
        telegram: 'Написати в Telegram: @madbod_77',
      },
      en: {
        submit: submitLabel?.dataset.en || 'Send the brief',
        sending: 'Sending…',
        nameRequired: 'Enter your name or brand.',
        contactRequired: 'Enter a Telegram handle, email or phone number.',
        consentRequired: 'Confirm that you have read the Privacy Notice.',
        telegramConsentRequired: 'Confirm separate consent to deliver the enquiry through Telegram Bot API.',
        required: 'Complete this field.',
        validation: 'Check the highlighted fields and try again.',
        success: 'Thank you! We received your brief and will contact you shortly.',
        preview: 'Local preview: the form was validated, but no lead was sent anywhere.',
        rateLimit: 'Too many attempts. Wait a minute and try again.',
        timeout: 'The server took too long to respond.',
        error: 'We could not send the brief automatically.',
        telegram: 'Message us on Telegram: @madbod_77',
      },
    };
    const strings = () => copy[currentLanguage] || copy.uk;

    const renderFormState = () => {
      form.classList.toggle('is-sending', state === 'sending');
      form.classList.toggle('is-success', state === 'success' || state === 'preview');
      form.classList.toggle('has-error', state === 'error' || state === 'invalid');
      form.toggleAttribute('aria-busy', state === 'sending');
      if (submitButton) submitButton.disabled = state === 'sending';
      if (submitLabel) submitLabel.textContent = state === 'sending' ? strings().sending : strings().submit;
      if (status) {
        status.textContent = statusKey ? strings()[statusKey] : '';
        if ((statusKey === 'error' || statusKey === 'timeout') && strings().telegram) {
          status.append(document.createTextNode(' '));
          const telegramLink = document.createElement('a');
          telegramLink.href = 'https://t.me/madbod_77';
          telegramLink.target = '_blank';
          telegramLink.rel = 'noopener noreferrer';
          telegramLink.textContent = strings().telegram;
          status.append(telegramLink);
        }
        const assertive = state === 'error' || state === 'invalid';
        status.setAttribute('role', assertive ? 'alert' : 'status');
        status.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      }
    };
    const setState = (nextState, nextStatusKey = '') => {
      state = nextState;
      statusKey = nextStatusKey;
      renderFormState();
    };
    const errorKeyFor = (field) => {
      if (field.name === 'name') return 'nameRequired';
      if (field.name === 'contact') return 'contactRequired';
      if (field.name === 'privacyAcknowledged') return 'consentRequired';
      if (field.name === 'telegramDeliveryConsent') return 'telegramConsentRequired';
      return 'required';
    };
    const errorIdFor = (field) => `${form.id || 'velira-lead-form'}-${field.name}-error`;

    const ensureErrorElement = (field) => {
      const id = errorIdFor(field);
      let error = document.getElementById(id);
      if (!error) {
        error = document.createElement('span');
        error.className = 'vl-form__error';
        error.id = id;
        error.hidden = true;
        const label = field.closest('label');
        (label || field.parentElement || form).append(error);
      }
      const ids = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      ids.add(id);
      field.setAttribute('aria-describedby', Array.from(ids).join(' '));
      return error;
    };
    const isEmpty = (field) => {
      if (field instanceof HTMLInputElement && field.type === 'checkbox') return !field.checked;
      return !String(field.value || '').trim();
    };
    const validateField = (field, showError = true) => {
      const valid = !field.required || !isEmpty(field);
      const error = ensureErrorElement(field);
      const key = errorKeyFor(field);
      error.dataset.errorKey = key;
      error.textContent = strings()[key];
      error.hidden = valid || !showError;
      if (valid) field.removeAttribute('aria-invalid');
      else if (showError) field.setAttribute('aria-invalid', 'true');
      return valid;
    };
    const clearValidation = () => {
      requiredFields.forEach((field) => {
        field.removeAttribute('aria-invalid');
        const error = document.getElementById(errorIdFor(field));
        if (error) error.hidden = true;
      });
    };

    requiredFields.forEach((field) => {
      ensureErrorElement(field);
      const eventName = field instanceof HTMLInputElement && field.type === 'checkbox' ? 'change' : 'input';
      field.addEventListener(eventName, () => {
        if (field.hasAttribute('aria-invalid')) validateField(field);
        if (state === 'invalid' && requiredFields.every((item) => !isEmpty(item))) setState('idle');
      });
    });
    form.addEventListener('input', () => {
      if (state === 'success' || state === 'preview' || state === 'error') setState('idle');
    });
    document.addEventListener('velira:languagechange', () => {
      form.querySelectorAll('.vl-form__error[data-error-key]').forEach((error) => {
        error.textContent = strings()[error.dataset.errorKey] || '';
      });
      renderFormState();
    });

    const postLead = async (payload) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await window.fetch('/.netlify/functions/submit-lead', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch (_) {
          /* HTTP status is enough if a proxy returns an empty/non-JSON body. */
        }
        if (!response.ok || responseBody?.ok === false) {
          const error = new Error('Lead delivery failed');
          error.status = response.status;
          throw error;
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state === 'sending') return;
      const invalid = requiredFields.filter((field) => !validateField(field));
      if (invalid.length) {
        setState('invalid', 'validation');
        invalid[0].focus();
        return;
      }

      const data = new FormData(form);
      const payload = {
        name: String(data.get('name') || '').trim(),
        contact: String(data.get('contact') || '').trim(),
        plan: String(data.get('plan') || '').trim(),
        brief: String(data.get('brief') || '').trim(),
        privacyAcknowledged: data.get('privacyAcknowledged') === 'true',
        telegramDeliveryConsent: data.get('telegramDeliveryConsent') === 'true',
        company: String(data.get('company') || '').trim(),
        privacyVersion: String(data.get('privacyVersion') || '').trim(),
        source: String(data.get('source') || '').trim(),
        language: currentLanguage,
      };

      setState('sending');
      try {
        if (localPreview) {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          form.reset();
          clearValidation();
          setState('preview', 'preview');
          return;
        }
        await postLead(payload);
        form.reset();
        clearValidation();
        setState('success', 'success');
      } catch (error) {
        if (error?.name === 'AbortError') setState('error', 'timeout');
        else if (error?.status === 429) setState('error', 'rateLimit');
        else setState('error', 'error');
      }
    });

    renderFormState();
  });
})();
