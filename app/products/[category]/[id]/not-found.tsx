export default function ProductNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 text-ink-900">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <h2 className="text-xl mb-4">Товар не найден</h2>
        <p className="text-ink-600 mb-8">
          Этот товар был удалён или больше не доступен.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-brand-600 text-white font-bold rounded-full hover:bg-brand-500 transition"
        >
          Вернуться в каталог
        </a>
      </div>
    </div>
  );
}
