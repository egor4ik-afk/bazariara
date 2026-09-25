'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

type Msg = {
  id: number; direction: 'in' | 'out'; text: string; created_at: string;
  attachment_url?: string | null;
  /** отправляется прямо сейчас — показываем полупрозрачным */
  pending?: boolean;
};

const IMG = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE = 10 * 1024 * 1024;

const COPY = {
  ru: {
    open: 'Написать нам', title: 'Поддержка BAZARI ARA',
    hint: 'Отвечаем с 09:00 до 21:00, обычно в течение нескольких минут.',
    name: 'Имя', contact: 'Телефон или Telegram',
    contactHint: 'Необязательно — чтобы ответить, если закроете страницу.',
    placeholder: 'Напишите сообщение…', send: 'Отправить', optional: 'необязательно',
    closed: 'Разговор завершён — напишите, если остались вопросы.',
    error: 'Не отправилось. Попробуйте ещё раз.', close: 'Свернуть чат',
    you: 'Вы', us: 'BAZARI ARA',
    attach: 'Прикрепить фото или PDF', uploading: 'Загружаем файл…', badType: 'Можно прикрепить картинку или PDF', tooBig: 'Файл больше 10 МБ', pasteHint: 'Можно вставить скриншот: Ctrl+V', file: 'Файл PDF', remove: 'Убрать файл',
  },
  en: {
    open: 'Message us', title: 'BAZARI ARA support',
    hint: 'We reply from 09:00 to 21:00, usually within a few minutes.',
    name: 'Name', contact: 'Phone or Telegram',
    contactHint: 'Optional — so we can reply if you close the page.',
    placeholder: 'Type a message…', send: 'Send', optional: 'optional',
    closed: 'The conversation is closed — write again if you have questions.',
    error: 'Not sent. Please try again.', close: 'Minimise chat',
    you: 'You', us: 'BAZARI ARA',
    attach: 'Attach a photo or PDF', uploading: 'Uploading…', badType: 'You can attach an image or PDF', tooBig: 'File is larger than 10 MB', pasteHint: 'You can paste a screenshot: Ctrl+V', file: 'PDF file', remove: 'Remove file',
  },
  ka: {
    open: 'მოგვწერეთ', title: 'BAZARI ARA მხარდაჭერა',
    hint: 'ვპასუხობთ 09:00-დან 21:00-მდე, ჩვეულებრივ რამდენიმე წუთში.',
    name: 'სახელი', contact: 'ტელეფონი / Telegram',
    contactHint: 'არასავალდებულო — რომ გიპასუხოთ, თუ გვერდს დახურავთ.',
    placeholder: 'დაწერეთ შეტყობინება…', send: 'გაგზავნა', optional: 'არასავალდებულო',
    closed: 'საუბარი დასრულდა — მოგვწერეთ, თუ კიდევ გაქვთ კითხვა.',
    error: 'ვერ გაიგზავნა. სცადეთ თავიდან.', close: 'ჩატის ჩაკეცვა',
    you: 'თქვენ', us: 'BAZARI ARA',
    attach: 'ფოტოს ან PDF-ის მიმაგრება', uploading: 'იტვირთება…', badType: 'შეგიძლიათ მიამაგროთ სურათი ან PDF', tooBig: 'ფაილი 10 MB-ზე მეტია', pasteHint: 'შეგიძლიათ ჩასვათ სკრინშოტი: Ctrl+V', file: 'PDF ფაილი', remove: 'ფაილის წაშლა',
  },
} as const;

const SEEN_KEY = 'support_seen';

/**
 * Окно чата поддержки. Ответы оператора приходят из Telegram.
 *
 * Новые сообщения забираются опросом: раз в 4 секунды, пока окно
 * открыто, и раз в 30 — пока свёрнуто (чтобы показать счётчик на
 * кнопке). В фоновой вкладке опрос не идёт.
 */
export default function SupportChat() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const c = COPY[(language as keyof typeof COPY)] || COPY.ru;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<'none' | 'open' | 'closed'>('none');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [trap, setTrap] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  // Прикреплённый, но ещё не отправленный файл: уже в бакете, ждёт «Отправить»
  const [attached, setAttached] = useState<{ url: string; name: string; preview?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const lastId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY) || 0); } catch { return 0; } };
  const writeSeen = (id: number) => { try { localStorage.setItem(SEEN_KEY, String(id)); } catch {} };

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/support?after=${lastId.current}`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      setStatus(d.status);
      if (d.messages?.length) {
        lastId.current = d.messages[d.messages.length - 1].id;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          return [...prev, ...d.messages.filter((m: Msg) => !known.has(m.id))];
        });
      }
    } catch { /* сеть моргнула — следующий опрос повторит */ }
  }, []);

  // Первая загрузка: восстановить разговор, если он уже был
  useEffect(() => { poll(); }, [poll]);

  useEffect(() => {
    if (status === 'none') return;
    const tick = () => { if (document.visibilityState === 'visible') poll(); };
    const id = window.setInterval(tick, open ? 4000 : 30000);
    return () => window.clearInterval(id);
  }, [open, status, poll]);

  // Счётчик непрочитанных ответов на кнопке
  useEffect(() => {
    const seen = readSeen();
    if (open) {
      const last = messages.length ? messages[messages.length - 1].id : 0;
      if (last > seen) writeSeen(last);
      setUnread(0);
    } else {
      setUnread(messages.filter((m) => m.direction === 'out' && m.id > seen).length);
    }
  }, [messages, open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /**
   * Файл уходит из браузера прямо в хранилище по подписанной ссылке —
   * через сервер его не гоняем. После загрузки он встаёт превью над полем
   * ввода: можно дописать подпись или убрать крестиком.
   */
  const attachFile = async (file: File) => {
    setError(null);
    if (!ACCEPT.includes(file.type)) { setError(c.badType); return; }
    if (file.size > MAX_FILE) { setError(c.tooBig); return; }
    setUploading(true);
    try {
      const r = await fetch('/api/support/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || c.error);
      const put = await fetch(d.uploadUrl, {
        method: 'PUT',
        // Только Content-Type: он входит в подпись. ACL уже зашит в саму
        // ссылку — отдельный заголовок x-amz-acl не подписан, и хранилище
        // вправе отклонить загрузку целиком.
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(c.error);
      setAttached({
        url: d.fileUrl,
        name: file.name || 'screenshot.png',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
      inputRef.current?.focus();
    } catch (e: any) {
      setError(e.message || c.error);
    }
    setUploading(false);
  };

  // Скриншот из буфера обмена — Ctrl+V прямо в поле ввода
  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) { e.preventDefault(); attachFile(file); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) attachFile(file);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !attached) || sending || uploading) return;
    setSending(true); setError(null);

    // Сообщение появляется сразу, полупрозрачным, — как в чатах мессенджеров
    const tempId = -Date.now();
    const draft = attached;
    setMessages((prev) => [...prev, {
      id: tempId, direction: 'in', text: body, attachment_url: draft?.url ?? null,
      created_at: new Date().toISOString(), pending: true,
    }]);
    setText(''); setAttached(null);

    try {
      const r = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: body, attachment_url: draft?.url, name, contact, website: trap,
          locale: language, page: window.location.pathname + window.location.search,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || c.error);
      setStatus('open');
      lastId.current = Math.max(lastId.current, d.message.id);
      // Опрос мог забрать это сообщение раньше ответа — тогда черновик
      // просто убираем, иначе оно показалось бы дважды
      setMessages((prev) => prev.some((m) => m.id === d.message.id)
        ? prev.filter((m) => m.id !== tempId)
        : prev.map((m) => (m.id === tempId ? d.message : m)));
      if (draft?.preview) URL.revokeObjectURL(draft.preview);
    } catch (e: any) {
      // Не отправилось — возвращаем текст и файл в поле, ничего не теряется
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(body); setAttached(draft);
      setError(e.message || c.error);
    }
    setSending(false);
  };

  // В админке чат не нужен
  if (pathname?.startsWith('/admin')) return null;

  const first = status === 'none' && messages.length === 0;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={c.open}
          className="fixed z-[45] right-4 bottom-4 sm:right-6 sm:bottom-6 flex items-center gap-2
                     h-14 pl-4 pr-5 rounded-full bg-brand-600 text-on-brand shadow-cardHover
                     hover:bg-brand-500 transition-colors"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h8M8 14h5m-9 6 3.2-3H18a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 1 2.2V20z" />
          </svg>
          <span className="hidden sm:inline font-semibold text-sm">{c.open}</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-clay text-white
                             text-[11px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={c.title}
          className="fixed z-[45] inset-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[370px] sm:h-[560px]
                     sm:max-h-[calc(100dvh-3rem)] flex flex-col bg-cream-100 sm:rounded-2xl
                     sm:border sm:border-ink-200 shadow-2xl overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-3 px-4 h-14 shrink-0 bg-brand-600 text-on-brand">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{c.title}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label={c.close}
                    className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/15 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
            <p className="text-xs text-ink-500 text-center px-4 pb-1">{c.hint}</p>
            {messages.length === 0 && (
              <p className="hidden sm:block text-[11px] text-ink-400 text-center">{c.pasteHint}</p>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === 'in' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                  transition-opacity ${m.pending ? 'opacity-50' : ''}
                  ${m.direction === 'in'
                    ? 'bg-brand-600 text-on-brand rounded-br-md'
                    : 'bg-surface border border-ink-200 text-ink-900 rounded-bl-md'}`}>
                  {m.attachment_url && (
                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      {IMG.test(m.attachment_url) ? (
                        <img src={m.attachment_url} alt="" loading="lazy"
                             className="rounded-lg max-h-56 w-auto max-w-full object-contain bg-cream-200" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 underline underline-offset-2">📎 {c.file}</span>
                      )}
                    </a>
                  )}
                  {m.text}
                  <span className={`block text-[10px] mt-1 ${m.direction === 'in' ? 'opacity-70 text-right' : 'text-ink-500'}`}>
                    {new Date(m.created_at).toLocaleTimeString(language === 'en' ? 'en-GB' : language === 'ka' ? 'ka-GE' : 'ru-RU',
                      { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {status === 'closed' && (
              <p className="text-xs text-ink-500 text-center px-4 pt-2">{c.closed}</p>
            )}
          </div>

          <div className="shrink-0 border-t border-ink-200 bg-surface p-3 space-y-2">
            {/* Имя и контакт — только в начале: чтобы было как ответить,
                если посетитель закроет страницу до ответа */}
            {first && (
              <div className="grid grid-cols-2 gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                  placeholder={c.name} aria-label={c.name}
                  className="min-w-0 px-3 py-2 rounded-lg bg-cream-100 border border-ink-200 text-sm text-ink-900
                             outline-none focus:border-brand-400" />
                <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120}
                  placeholder={c.contact} aria-label={c.contact}
                  className="min-w-0 px-3 py-2 rounded-lg bg-cream-100 border border-ink-200 text-sm text-ink-900
                             outline-none focus:border-brand-400" />
                <p className="col-span-2 text-[11px] text-ink-500 -mt-0.5">{c.contactHint}</p>
              </div>
            )}

            {/* Honeypot: люди его не видят, боты заполняют */}
            <input value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off"
                   aria-hidden="true" className="hidden" name="website" />

            {error && <p className="text-xs text-clay font-medium">{error}</p>}

            {(attached || uploading) && (
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-cream-100 border border-ink-200">
                {uploading ? (
                  <span className="text-xs text-ink-500 px-1.5 py-1">{c.uploading}</span>
                ) : attached && (
                  <>
                    {attached.preview
                      ? <img src={attached.preview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      : <span className="w-10 h-10 rounded bg-ink-100 grid place-items-center shrink-0">📎</span>}
                    <span className="flex-1 min-w-0 truncate text-xs text-ink-700">{attached.name}</span>
                    <button onClick={() => { if (attached?.preview) URL.revokeObjectURL(attached.preview); setAttached(null); }} aria-label={c.remove}
                            className="shrink-0 w-7 h-7 rounded-md text-ink-500 hover:bg-ink-200 hover:text-ink-900">✕</button>
                  </>
                )}
              </div>
            )}

            <input ref={fileRef} type="file" accept={ACCEPT.join(',')} className="hidden"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); e.target.value = ''; }} />

            <div className="flex items-end gap-2" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
              <button onClick={() => fileRef.current?.click()} disabled={uploading || Boolean(attached)}
                aria-label={c.attach} title={c.attach}
                className="shrink-0 w-11 h-11 rounded-xl grid place-items-center text-ink-500
                           hover:text-ink-900 hover:bg-ink-100 disabled:opacity-40 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="m18.4 11.1-6.7 6.7a4.5 4.5 0 0 1-6.4-6.4l6.7-6.7a3 3 0 0 1 4.2 4.2l-6.7 6.7a1.5 1.5 0 0 1-2.1-2.1l6.2-6.2" />
                </svg>
              </button>
              <textarea
                onPaste={onPaste}
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                maxLength={2000}
                placeholder={c.placeholder}
                className="flex-1 min-w-0 max-h-32 resize-none px-3 py-2.5 rounded-xl bg-cream-100 border border-ink-200
                           text-sm text-ink-900 outline-none focus:border-brand-400"
              />
              <button onClick={send} disabled={sending || uploading || (!text.trim() && !attached)} aria-label={c.send}
                className="shrink-0 w-11 h-11 rounded-xl bg-brand-600 text-on-brand grid place-items-center
                           disabled:opacity-40 hover:bg-brand-500 transition-colors">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M3.4 20.4 21 12 3.4 3.6l.1 6.5L15 12l-11.5 1.9z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
