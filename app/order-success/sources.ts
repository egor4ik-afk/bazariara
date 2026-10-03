// FILE: app/order-success/sources.ts
//
// Отдельный модуль, а не actions.ts: файл с 'use server' может отдавать
// клиенту только функции. Массив оттуда приходил на страницу «спасибо» не
// массивом, а ссылкой на серверную функцию, и REFERRAL_SOURCES.map падал
// («d.map is not a function») — страница после оформления заказа ломалась.

/**
 * Источники, из которых пришёл клиент.
 *
 * Список закрытый и хранится здесь, а не свободным текстом: иначе в отчёте
 * получится «инстаграм», «Instagram», «инста» и «insta» как четыре разных
 * канала, и посчитать что-либо будет нельзя. Свободный ввод оставлен только
 * для варианта «другое» — и он пишется в отдельную колонку.
 */
export const REFERRAL_SOURCES = [
  'instagram',
  'facebook',
  'google',
  'friend',
  'telegram',
  'passing_by',
  'other',
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];
