export default function ProductNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <h2 className="text-xl mb-4">Товар не найден</h2>
        <p className="text-gray-400 mb-8">
          Этот товар был удалён или больше не доступен.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-lime-500 text-gray-900 font-bold rounded-full hover:bg-lime-400 transition"
        >
          Вернуться в каталог
        </a>
      </div>
    </div>
  );
}
