/**
 * Единственный источник правды по контактам.
 *
 * До этого номер лежал захардкоженным в двух местах app/layout.tsx — и в обоих
 * с ошибкой: `+995591017495` вместо `+995591017945`, цифры 9 и 4 переставлены.
 * Ровно тот случай, когда одна и та же константа, скопированная в два файла,
 * расходится с реальностью и никто этого не замечает.
 *
 * Всё, что показывает или использует контакты, импортирует отсюда.
 */

export const CONTACTS = {
  /** E.164 — для tel:, schema.org и любых API. Без пробелов и скобок. */
  phoneE164: '+995591017945',

  /** Для показа человеку. */
  phoneDisplay: '+995 591 017 945',

  /** wa.me требует номер без плюса и разделителей. */
  whatsapp: 'https://wa.me/995591017945',

  telegram: 'https://t.me/bazariarage',
  telegramHandle: '@bazariarage',

  email: 'info@bazariara.ge',

  city: 'Тбилиси',
  country: 'GE',

  /** Ежедневно 09:00–21:00. */
  hours: { opens: '09:00', closes: '21:00' },

  deliveryCostGel: 10,
  deliveryHours: 2,
} as const;

export const CONTACT_LINKS = {
  tel:      `tel:${CONTACTS.phoneE164}`,
  whatsapp: CONTACTS.whatsapp,
  telegram: CONTACTS.telegram,
  mailto:   `mailto:${CONTACTS.email}`,
} as const;
