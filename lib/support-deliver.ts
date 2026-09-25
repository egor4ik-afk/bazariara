import { tg, tgUpload } from '@/lib/support';
import { getSupportFile } from '@/lib/support-storage';

/**
 * Доставка вложения посетителя в тему Telegram.
 *
 * Файл берётся из бакета и уходит в Telegram байтами. Раньше Telegram
 * получал ссылку и должен был сам скачать файл с cdn.relaxdev.ru — если
 * CDN его серверам не отвечал, фото на сайте было, а в Telegram ничего.
 *
 * Если отправить файл всё-таки не удалось, в тему уходит ссылка на него
 * текстом. Это не запасной провайдер, а гарантия, что сообщение
 * посетителя не пропадёт молча: оператор увидит, что был файл, и откроет
 * его по ссылке.
 */
export async function deliverAttachment(opts: {
  chatId: string; topicId: number; threadId: number; url: string; text: string;
}): Promise<'photo' | 'document' | 'link'> {
  const { chatId, topicId, threadId, url, text } = opts;
  const caption = text && text.length <= 1024 ? text : undefined;

  try {
    const file = await getSupportFile(url);
    const isImage = /^image\/(jpeg|png|webp|gif)$/.test(file.contentType);
    // Как фото Telegram принимает картинки до 10 МБ; GIF шлём документом,
    // иначе он превратится в статичную картинку
    const asPhoto = isImage && file.contentType !== 'image/gif' && file.body.length <= 10 * 1024 * 1024;
    await tgUpload(asPhoto ? 'sendPhoto' : 'sendDocument',
                   { chat_id: chatId, message_thread_id: topicId, caption }, file);
    if (text && !caption) await tg('sendMessage', { chat_id: chatId, message_thread_id: topicId, text });
    return asPhoto ? 'photo' : 'document';
  } catch (e: any) {
    console.error(`support: файл не отправлен в Telegram (разговор #${threadId}):`, e?.message);
    await tg('sendMessage', {
      chat_id: chatId, message_thread_id: topicId,
      text: `📎 Посетитель прислал файл, но переслать его не удалось:\n${url}${text ? `\n\n${text}` : ''}`,
    });
    return 'link';
  }
}
