/* =========================================================
   Velira — двомовність UA/EN.
   • Гео: Україна → українська; інша країна → англійська (IP через ipapi.co,
     fallback — мова браузера). Вибір користувача має пріоритет (localStorage).
   • Ручний перемикач UA/EN у шапці.
   • Переклад застосовується до текстових вузлів і ключових атрибутів,
     оригінал (укр) зберігається в пам'яті для миттєвого перемикання назад.
   ========================================================= */
(() => {
  const DICT = {
    // — Навігація / CTA —
    'Студія':'Studio','Роботи':'Work','Процес':'Process','Тарифи':'Pricing','Оплата':'Payment',
    'Замовити сайт':'Order a website','Замовити':'Order','Замовити такий сайт':'Order a site like this',
    // — Hero —
    'Усе починається':'It all starts','з':'with an','ідеї':'idea',
    'Сайт під ключ':'A turnkey website',
    'від $150':'from $150',
    'Ми розбираємо її':'We break it down','на деталі.':'into details.',
    'Продумуємо':'We refine','кожен фрагмент.':'every fragment.',
    'Один сайт.':'One website.','Три пристрої.':'Three devices.',
    "Телефон · планшет · комп'ютер — однаково бездоганно.":'Phone · tablet · computer — flawless on each.',
    'Бездоганно':'Flawless','з усіх боків.':'from every angle.',
    'ідея під ключ':'a turnkey idea','Обрати тариф':'Choose a plan','Подивитись роботи':'See our work','прокрутіть':'scroll',
    // — Marquee —
    'АДАПТИВ':'RESPONSIVE','ВЛАСНИЙ .COM':'YOUR OWN .COM','3D-АНІМАЦІЇ':'3D ANIMATIONS',
    'УНІКАЛЬНИЙ ДИЗАЙН':'UNIQUE DESIGN','SEO-ГОТОВНІСТЬ':'SEO-READY','ШВИДКІСТЬ':'SPEED','ПІД КЛЮЧ':'TURNKEY',
    // — Design —
    'Унікальний дизайн':'Unique design','Жодних':'No','готових тем.':'templates.',
    'Власна графіка,':'Custom graphics,','типографіка':'typography','і':'and','3D-переходи':'3D transitions',
    'Усе намальовано з нуля під ваш бренд.':'All crafted from scratch for your brand.',
    // — Works —
    'Сайти, які ми':'Websites we','створюємо':'build',
    'Живі проєкти, опубліковані онлайн. Гортайте — і клікніть, щоб відкрити.':'Live projects, published online. Swipe — and click to open.',
    'Мовна школа · Німецька (Відень)':'Language school · German (Vienna)','Відкрити':'Open','Відеомонтаж · TikTok':'Video editing · TikTok',
    // — Speed —
    'Швидкість':'Speed','Блискавично':'Lightning-','швидкі':'fast','сайти.':'websites.',
    'Чистий код.':'Clean code.','Миттєве завантаження.':'Instant loading.',
    'Висока оцінка PageSpeed — відвідувачі не чекають ні секунди.':'A high PageSpeed score — visitors never wait a second.',
    // — Process —
    'Від брифу':'From brief','до':'to','запуску онлайн':'launch online','Бриф':'Brief',
    'Розповідаєте про бренд, цілі та приклади, які подобаються. Узгоджуємо тариф і термін.':'You tell us about your brand, goals and examples you like. We agree on the plan and timeline.',
    'Дизайн + 3D':'Design + 3D',
    "Малюємо унікальний макет з анімаціями та 3D-переходами. Показуємо живе прев'ю.":'We design a unique layout with animations and 3D transitions, then show a live preview.',
    'Адаптив під 3 пристрої':'Responsive on 3 devices',
    "Окремі конфігурації для телефона, планшета та комп'ютера.":'Separate configurations for phone, tablet and computer.',
    'Запуск і ваш .com':'Launch and your .com',
    'Публікуємо сайт онлайн і допомагаємо підключити ваш власний домен .com. Передаємо ключі — готово!':'We publish the site online and help connect your own .com domain. We hand over the keys — done!',
    // — Pricing —
    'Оберіть свій':'Choose your','формат':'format',
    'Ціни в доларах із приблизною конвертацією в гривню. Усі тарифи включають адаптив і допомогу з підключенням власного домену .com.':'Prices in US dollars with an approximate conversion to hryvnia. All plans include responsive design and help connecting your own .com domain.',
    'Стандарт':'Standard','Терміново · 48 год':'Rush · 48 h',
    'Знижка −20%':'−20% off','Знижка −17%':'−17% off','Знижка −33%':'−33% off',
    'Стильний односторінковий лендинг, який швидко продає.':'A stylish one-page landing that sells fast.',
    '/ сайт':'/ site','Односторінковий лендинг':'One-page landing',
    'Адаптив: телефон · планшет · ПК':'Responsive: phone · tablet · PC',
    'Допомога з підключенням .com':'Help connecting a .com',
    'Базові анімації та форма заявки':'Basic animations and a lead form','1 раунд правок':'1 round of revisions','Замовити Spark':'Order Spark',
    'Найпопулярніший':'Most popular',
    'Багатосекційний бізнес-сайт з характером і 3D.':'A multi-section business site with character and 3D.',
    'До 5–7 секцій / сторінок':'Up to 5–7 sections / pages',
    '3D-переходи та преміальні анімації':'3D transitions and premium animations',
    'Форми, інтеграція з Telegram':'Forms, Telegram integration','2 раунди правок':'2 rounds of revisions','Замовити Orbit':'Order Orbit',
    'Преміум-кастом або інтернет-магазин без компромісів.':'Premium custom or an online store, no compromises.',
    'від $750':'from $750','від $500':'from $500','від':'from ',
    'Магазин / складний кастом':'Store / complex custom','Максимум 3D та інтерактиву':'Maximum 3D and interactivity',
    'Інтеграції: оплати, CRM, каталог':'Integrations: payments, CRM, catalog',
    '3 раунди правок · пріоритет':'3 rounds of revisions · priority','Замовити Supernova':'Order Supernova',
    // — Преміум-тариф —
    'Преміум':'Premium','Топ-рівень':'Top tier','від $5000':'from $5000','Замовити Преміум':'Order Premium',
    'Преміум — від $5000':'Premium — from $5000',
    'Ексклюзивний сайт найвищого рівня — авторський дизайн і кастомні 3D.':'An exclusive top-tier website — bespoke design and custom 3D.',
    'Повністю авторський дизайн під бренд':'Fully bespoke design for your brand',
    'Кастомні 3D-сцени та складні анімації':'Custom 3D scenes and complex animations',
    'Тонка типографіка й арт-дирекшн':'Refined typography and art direction',
    'Максимальна продуктивність і SEO':'Maximum performance and SEO',
    'Необмежені правки · пріоритетна підтримка':'Unlimited revisions · priority support',
    'Складніший проєкт?':'A more complex project?','Зробимо індивідуальний прорахунок':"We'll prepare a custom quote",
    '— напишіть нам у формі нижче.':'— write to us in the form below.',
    // — Payment —
    'Як працює оплата':'How payment works','Передоплата спочатку.':'Prepayment first.',
    "Решта — після прев'ю.":'The rest — after the preview.','Передоплата 30%':'30% prepayment',
    'Узгоджуємо тариф і термін. Ви вносите 30% — і ми беремо проєкт у роботу.':'We agree on the plan and timeline. You pay 30% — and we start the project.',
    'Ми робимо сайт':'We build the site',
    'Дизайн, 3D-анімації, адаптив під 3 пристрої. Тримаємо вас у курсі на кожному етапі.':'Design, 3D animations, responsive for 3 devices. We keep you posted at every step.',
    "Живе прев'ю":'Live preview',
    'Показуємо готовий сайт на тестовому посиланні. Ви перевіряєте та просите правки.':'We show the finished site on a test link. You review and request changes.',
    'Решта 70% і запуск':'Remaining 70% and launch',
    'Після вашого «ок» — оплата решти, публікація сайту і передача вам. Прев’ю — ваша гарантія, що роботу зроблено до повної оплати.':'After your “OK” — you pay the rest, we publish the site and hand it over. The preview is your guarantee that the work is done before full payment.',
    // — Stats —
    'сайтів запущено':'websites launched','задоволених клієнтів':'happy clients',
    'середній термін':'average timeline','пристрої — один сайт':'devices — one website','днів':' days',
    // — Reviews —
    'Клієнти':'Clients','Реальні':'Real','відгуки':'reviews',
    'Олег':'Oleh','Марина':'Maryna','Андрій':'Andrii',
    'Сайт зробили за 4 дні — виглядає дорожче, ніж у конкурентів. Заявки пішли одразу.':'They built the site in 4 days — it looks more premium than competitors. Leads came in right away.',
    "власник кав'ярні":'coffee shop owner',
    'Нарешті сайт, який не соромно показати. Усе адаптивно й швидко.':"Finally a website I'm proud to show. Everything's responsive and fast.",
    'студія краси':'beauty studio',
    "Прев'ю показали до оплати, правки внесли швидко. Рекомендую.":'They showed a preview before payment and made edits quickly. Highly recommend.',
    'інтернет-магазин':'online store',
    'Відгуки клієнтів':'Client reviews','Попередній відгук':'Previous review','Наступний відгук':'Next review','Навігація відгуків':'Reviews navigation',
    // — Bot —
    'Telegram-бот — у подарунок':'Telegram bot — as a gift','Заявка з сайту —':'A lead from the site —','миттєво у вас':'instantly in your chat',
    'Замовлення з сайту':'Order from the website','зараз':'now','Нова заявка — Velira':'New lead — Velira',
    "👤 Олег · кав'ярня":'👤 Oleh · coffee shop','💎 Тариф: Orbit':'💎 Plan: Orbit','📩 Контакт: @oleh':'📩 Contact: @oleh',
    'Відповідаєте за хвилини, а не години — і не губите жодного замовлення.':'You reply in minutes, not hours — and never lose a single order.',
    // — Order form —
    'Опишіть ідею —':'Describe your idea —','надішлемо прорахунок':"we'll send a quote",
    'Залиште контакт і кілька слів про проєкт. Відповідаємо протягом 24 годин із ціною та терміном.':'Leave a contact and a few words about the project. We reply within 24 hours with a price and timeline.',
    'Отримуєте прорахунок і дату запуску':'Get a quote and a launch date','Вносите 30% — ми стартуємо':'Pay 30% — we start',
    "Дивитесь живе прев'ю до повної оплати":'See a live preview before full payment',
    "Ваше ім'я / бренд":'Your name / brand','Контакт (Telegram, email або телефон)':'Contact (Telegram, email or phone)',
    'Тариф':'Plan','Supernova — від $500':'Supernova — from $500','Ще не визначився':'Not sure yet',
    "Опис проєкту — що за бізнес, які цілі, приклади":'Project description — what business, what goals, examples',
    'Погоджуюсь із':'I agree to the','Публічною офертою':'Public Offer','та':'and','Політикою конфіденційності':'Privacy Policy',
    'Надіслати заявку':'Send request','Дякуємо! Заявку отримано — відповімо протягом 24 годин.':"Thank you! Your request has been received — we'll reply within 24 hours.",
    // — FAQ —
    'Часті':'Frequently asked','запитання':'questions','Чи буде сайт зручним на телефоні?':'Will the site work well on a phone?',
    'Так. Кожен сайт ми робимо адаптивним під':'Yes. We make every site responsive for',
    "телефон, планшет і комп'ютер":'phone, tablet and computer',
    '— з окремою конфігурацією для кожного типу пристрою. Усе виглядає й працює бездоганно на будь-якому екрані.':'— with a separate configuration for each device type. Everything looks and works flawlessly on any screen.',
    'Що з доменом і хостингом?':'What about domain and hosting?',
    'Сайт публікуємо онлайн із HTTPS, а також':'We publish the site online with HTTPS, and also',
    'допомагаємо підключити ваш власний домен .com':'help connect your own .com domain',
    'і хостинг. Домен оплачується окремо у реєстратора.':'and hosting. The domain is paid separately at a registrar.',
    'Скільки часу займає робота?':'How long does it take?',
    'Лендинг (Spark) — зазвичай 2–4 дні, бізнес-сайт (Orbit) — 4–7 днів, складні проєкти (Supernova) — за індивідуальним планом. Точний термін фіксуємо в брифі до старту.':'A landing (Spark) usually takes 2–4 days, a business site (Orbit) 4–7 days, complex projects (Supernova) on a custom schedule. We lock the exact timeline in the brief before we start.',
    'А якщо мені щось не сподобається?':"What if I don't like something?",
    'У кожен тариф входять правки (1 для Spark, 2 для Orbit, 3 для Supernova). Ми показуємо живе прев’ю':'Every plan includes revisions (1 for Spark, 2 for Orbit, 3 for Supernova). We show a live preview',
    'до повної оплати':'before full payment',
    'й доопрацьовуємо, доки результат вас не влаштує.':"and keep refining until you're happy with the result.",
    'Як відбувається оплата?':'How does payment work?','Спочатку':'First','30% передоплати':'30% prepayment',
    '— ми беремо проєкт у роботу. Після того, як ви погодите готове прев’ю, вносите':'— and we start the project. After you approve the finished preview, you pay',
    'решту 70%':'the remaining 70%',
    ', і ми публікуємо сайт онлайн. Реквізити надсилаємо у відповідь на заявку.':', and we publish the site online. We send payment details in reply to your request.',
    'Кому належить сайт після запуску?':'Who owns the site after launch?',
    'Вам. Після повної оплати ви отримуєте всі файли, доступи й права на сайт і всі вихідні файли. Деталі — на сторінці':'Yours. After full payment you receive all files, access and rights to the site and all source files. Details on the',
    'Права користувача':'User Rights',
    // — Footer —
    'Перетворюємо ідеї на сайти, які працюють. Ідея → сайт під ключ.':'We turn ideas into websites that work. Idea → turnkey website.',
    'Сайт':'Site','Документи':'Legal','Конфіденційність':'Privacy','Публічна оферта':'Public offer','Звʼязок':'Contact',
    'Velira. Усі права захищено.':'Velira. All rights reserved.','Оферта':'Offer','Права':'Rights','Робота':'Work',
    // — Merged story section (design+process+pay) —
    'Унікальний дизайн —':'Unique design —','жодних шаблонів.':'no templates.',
    'Власна графіка':'Custom graphics','і 3D-переходи.':'and 3D transitions.',
    'Бриф → дизайн → адаптив → ваш .com.':'Brief → design → responsive → your .com.',
    'решта — після прев’ю.':'the rest — after the preview.',
    'Прев’ю — ваша гарантія якості.':'The preview is your quality guarantee.',
    // — Works grid —
    'Живі проєкти та свіжі релізи. Натисніть, щоб роздивитись.':'Live projects and fresh releases. Tap to take a look.',
    'Переглянути':'View','Б’юті-салон · сайт':'Beauty salon · website','AI-кіностудія':'AI film studio',
    'під ваш бренд':'for your brand','Дивитись анімації':'See animations',
    'Кінематографічні ролики, motion-фони, аеро- та промо-зйомка — приклади на окремій сторінці.':'Cinematic reels, motion backgrounds, aerial and promo footage — examples on a separate page.',
    // — Animations page —
    'Анімації':'Animations','На головну':'Home','Velira Motion':'Velira Motion',
    'Унікальні анімації':'Unique animations','під кожен бренд':'for every brand',
    'Жодних шаблонів. Кожному клієнту — власний кінематографічний ролик: продукт, бренд, реклама чи аерозйомка. Створюємо під вашу ідею з нуля й прокачуємо до 4K.':'No templates. Every client gets their own cinematic reel: product, brand, ad or aerial. We craft it from scratch around your idea and upscale it to 4K.',
    '· аерозйомка':'· aerial',
    'Реальний приклад: 45 секунд безперервного польоту, змонтовані в один плавний сюжет і прокачані до 4K. Саме так ми робимо промо-ролики під ваш бренд.':'A real example: 45 seconds of continuous flight edited into one smooth story and upscaled to 4K. This is exactly how we make promo reels for your brand.',
    'Що ми вміємо оживляти':'What we bring to life',
    'Кілька форматів анімацій, які ми створюємо під клієнта.':'A few formats of animation we create for clients.',
    'Продуктова 3D-анімація':'Product 3D animation',
    'Ідея перетворюється на готовий сайт на ноутбуці, планшеті й телефоні.':'An idea turns into a finished website on laptop, tablet and phone.',
    'Motion-фон бренду':'Brand motion background',
    'Атмосферний фон під ваш стиль і фірмові кольори — для hero-секцій і реклами.':'An atmospheric background in your style and brand colors — for hero sections and ads.',
    'Аеро- та промо-ролики':'Aerial & promo reels',
    'Кінематографічні кадри для реклами, презентацій і соцмереж.':'Cinematic footage for ads, presentations and social media.',
    'Як ми це робимо':'How we make them',
    'Ідея під ваш бренд':'An idea for your brand',
    'Обговорюємо задачу й вигадуємо сюжет, що передає характер вашого продукту.':'We discuss the task and invent a story that captures your product’s character.',
    'Генеруємо й монтуємо':'We generate and edit','Прокачуємо до 4K':'We upscale to 4K',
    'Створюємо кадри, зшиваємо їх у плавний безперервний ролик із вашими кольорами.':'We create the shots and stitch them into one smooth, seamless reel in your colors.',
    'Підвищуємо якість і віддаємо готове відео — для сайту, реклами чи соцмереж.':'We boost the quality and deliver the finished video — for your site, ads or social media.',
    'Хочете унікальну анімацію':'Want a unique animation',
    'для свого бренду?':'for your brand?',
    'Напишіть нам — підберемо ідею, покажемо приклади й порахуємо вартість.':'Write to us — we’ll suggest an idea, show examples and quote the price.',
    'Замовити анімацію':'Order an animation',
    // — Attributes —
    'Меню':'Menu','Від ідеї до готового сайту':'From idea to a finished website',
    'Ноутбук, планшет і телефон з одним сайтом на чорному тлі':'Laptop, tablet and phone showing one website on a black background',
    'Абстрактна дизайн-композиція у фірмових кольорах Velira':'Abstract design composition in Velira brand colors',
    'Наші роботи':'Our work','Сайт SERVUS DEUTSCH — мовна школа німецької у Відні':'SERVUS DEUTSCH website — German language school in Vienna',
    'Сайт Milly Edits — портфоліо відеомонтажу для TikTok':'Milly Edits website — video editing portfolio for TikTok',
    'Перемикач робіт':'Work switcher','Блискавична швидкість':'Lightning-fast speed',
    'Світлові смуги швидкості у фірмових кольорах':'Light-speed streaks in brand colors','Як ми працюємо':'How we work',
    'Світловий шлях — етапи роботи над сайтом':'A path of light — the stages of building a site',
    'Режим ціни':'Price mode','Світловий щит — символ надійної оплати':'A shield of light — a symbol of secure payment',
    'Telegram-бот для замовлень':'Telegram bot for orders','Смартфон зі сповіщенням про нову заявку':'A smartphone with a new lead notification',
    'Напр. Coffee Lab':'e.g. Coffee Lab','@username або ваш email':'@username or your email',
    "Напр. сайт для кав'ярні з онлайн-меню та бронюванням столиків…":'e.g. a website for a coffee shop with an online menu and table booking…',
    'Швидкі дії':'Quick actions','Перегляд роботи':'View project','Закрити':'Close'
  };
  // Окремі: title + meta
  const META = {
    title:'Velira — your idea into a turnkey website',
    desc:'Velira — a studio that turns your idea into a turnkey website. Unique design, responsive for phone, tablet and computer, and help connecting your own .com domain. Plans from $150.'
  };

  // нормалізуємо пробіли та різні апострофи/лапки (', ’, ‘, ʼ, ′) до одного вигляду,
  // щоб зіставлення не залежало від типу апострофа в тексті/словнику
  const norm = (s) => s.replace(/[’‘ʼ′`´]/g, "'").replace(/\s+/g, ' ').trim();
  // словник із нормалізованими ключами
  const NDICT = {}; Object.keys(DICT).forEach((k) => { NDICT[norm(k)] = DICT[k]; });
  const lookup = (s) => NDICT[norm(s)];
  const getLang = () => document.documentElement.getAttribute('data-lang') || 'uk';
  // допоміжна для script.js (префікс ціни «від »)
  window.__t = (uk) => (getLang() === 'en' ? (lookup(uk) || uk) : uk);

  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  let textNodes = null, attrNodes = null, ukTitle = '', ukDesc = '';

  function collect() {
    textNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const el = n.parentElement; if (!el) return NodeFilter.FILTER_REJECT;
        const tag = el.nodeName.toLowerCase();
        if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
        // динамічні числа-лічильники не чіпаємо (їх веде script.js)
        if (el.closest('[data-count]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while ((n = walk.nextNode())) textNodes.push({ node: n, uk: n.nodeValue });
    attrNodes = [];
    document.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach((el) => {
      ATTRS.forEach((a) => { if (el.hasAttribute(a)) attrNodes.push({ el, attr: a, uk: el.getAttribute(a) }); });
    });
    ukTitle = document.title;
    const md = document.querySelector('meta[name="description"]');
    ukDesc = md ? md.getAttribute('content') : '';
  }

  function apply(lang) {
    if (!textNodes) collect();
    const en = lang === 'en';
    const tr = (uk) => {
      const m = uk.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const t = lookup(m[2]);
      return (en && t != null) ? (m[1] + t + m[3]) : uk;
    };
    for (const o of textNodes) o.node.nodeValue = en ? tr(o.uk) : o.uk;
    for (const o of attrNodes) {
      const t = en ? lookup(o.uk) : null;
      o.el.setAttribute(o.attr, (en && t != null) ? t : o.uk);
    }
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', en ? 'en' : 'uk');
    document.title = en ? META.title : ukTitle;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', en ? META.desc : ukDesc);
    // ціни (префікс «від»/«from») перерендерити
    if (window.refreshPrices) window.refreshPrices();
    // стан кнопок перемикача
    document.querySelectorAll('.lang-toggle button').forEach((b) =>
      b.classList.toggle('is-active', b.dataset.lang === lang));
  }

  function setLang(lang, persist) {
    if (persist) { try { localStorage.setItem('veblixLang', lang); } catch (_) {} }
    apply(lang);
  }

  // — перемикач у шапку —
  function injectToggle() {
    const host = document.querySelector('.header__inner');
    if (!host || host.querySelector('.lang-toggle')) return;
    const wrap = document.createElement('div');
    wrap.className = 'lang-toggle';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language / Мова');
    wrap.innerHTML = '<button type="button" data-lang="uk">UA</button><button type="button" data-lang="en">EN</button>';
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-lang]'); if (!b) return;
      setLang(b.dataset.lang, true);
    });
    const burger = host.querySelector('#burger');
    host.insertBefore(wrap, burger || null);
  }

  // — визначення мови: збережений вибір → гео(IP) → мова браузера —
  async function detect() {
    let saved = null; try { saved = localStorage.getItem('veblixLang'); } catch (_) {}
    if (saved === 'uk' || saved === 'en') return saved;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch('https://ipapi.co/country/', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(to);
      if (r.ok) {
        const c = (await r.text()).trim().toUpperCase();
        if (c === 'UA') return 'uk';
        if (/^[A-Z]{2}$/.test(c)) return 'en';
      }
    } catch (_) {}
    return (navigator.language || '').toLowerCase().startsWith('uk') ? 'uk' : 'en';
  }

  const start = () => {
    injectToggle();
    collect();
    detect().then((lang) => { if (lang === 'en') apply('en'); else apply('uk'); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
