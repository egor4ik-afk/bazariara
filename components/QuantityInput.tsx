import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';

interface QuantityInputProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onBlur?: () => void;
  onChange: (value: string) => void;
}

export default function QuantityInput({ quantity, onIncrease, onDecrease, onBlur, onChange }: QuantityInputProps) {
  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={onDecrease} 
        className="p-3 rounded-full bg-cream-100 hover:bg-cream-200 transition-colors duration-200">
        <MinusIcon className="h-5 w-5 text-ink-700" />
      </button>
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-14 text-center text-xl font-semibold bg-transparent border-none focus:ring-2 focus:ring-brand-500 rounded-md py-1"
      />
      <button 
        onClick={onIncrease} 
        className="p-3 rounded-full bg-cream-100 hover:bg-cream-200 transition-colors duration-200">
        <PlusIcon className="h-5 w-5 text-ink-700" />
      </button>
    </div>
  );
}
