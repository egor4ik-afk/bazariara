'use client';

// Чат поддержки грузится отдельным файлом уже после первой отрисовки: это
// плавающая кнопка, на первом экране она не нужна, а её код (~37 КБ) раньше
// шёл в обязательный JS каждой страницы. Кнопка fixed — сдвига макета нет.
import dynamic from 'next/dynamic';

const SupportChat = dynamic(() => import('./SupportChat'), { ssr: false });

export default function SupportChatLazy() {
  return <SupportChat />;
}
