/* Velira — лише публічні налаштування клієнтської частини.
   Telegram credentials мають існувати виключно у server-side env. */

window.VELIRA_CONFIG = {
  UAH_RATE:     41.5,        // 1 USD ≈ … ₴
  PAY_REQUISITES: 'velira.web (реквізити уточнюйте у відповіді)',
};

// Тимчасовий read-only alias для старих сторінок/кешів під час міграції.
window.VEBLIX_CONFIG = window.VEBLIX_CONFIG || window.VELIRA_CONFIG;
