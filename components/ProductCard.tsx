import Link from 'next/link';

interface Product {
  id: string;
  image_url: string;
  title: string;
  category: string;
  description: string;
  price: number;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    (<Link
      href={`/product/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-gray-800">
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.image_url || '/placeholder.svg'}
          alt={product.title}
          width={400}
          height={400}
          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105" />
        <div
          className="absolute inset-0 bg-black/20 transition-all duration-300 group-hover:bg-black/30"></div>
        <div className="absolute top-3 right-3">
          <span
            className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-gray-900 backdrop-blur-sm dark:bg-gray-950/80 dark:text-gray-50">
            {product.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{product.title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-50">${product.price}</p>
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Add to Cart
          </button>
        </div>
      </div>
    </Link>)
  );
}
