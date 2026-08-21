# Velira — SEO та release audit

Дата перевірки: 21 серпня 2026 року.

## Готово

- Головна та продуктові сторінки мають унікальні `title` і `meta description`.
- Головна має Open Graph title, description, locale, site name і preview image.
- Семантичні заголовки, підписи форм та alt-тексти перевірені.
- Внутрішні посилання, локальні ресурси й anchors перевірені автоматично.
- Юридичні сторінки навмисно мають `noindex`.
- Застарілі device-specific дублікати мають `noindex` і production redirects на `websites.html`.
- Рекламні cookies та автоматичні рекламні трекери не підключаються.
- Форма не містить клієнтського Telegram token: секрети очікуються лише в Netlify environment.

## Потрібно після вибору production-домену

- Додати абсолютний `link rel="canonical"` на індексовані сторінки.
- Додати `og:url` та зробити `og:image` абсолютним URL.
- Після першого deploy перевірити, що Netlify повертає `301` для `desktop.html`, `tablet.html` і `mobile.html`.
- Перевірити preview через валідатори Open Graph після першого deploy.

Production-домен свідомо не вигадувався: ці URL слід заповнити лише після його підтвердження власником.
