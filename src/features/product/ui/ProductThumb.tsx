import { useState } from 'react';
import { Keyboard, Package, ScanText } from 'lucide-react';
import type { Product } from '../model/types';

interface ProductThumbProps {
  product: Pick<Product, 'image' | 'source'> | null | undefined;
  size?: number;
}

export function ProductThumb({ product, size = 52 }: ProductThumbProps) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, borderRadius: size > 60 ? 18 : 14 };
  if (product?.image && !broken) {
    return (
      <span className="thumb" style={style}>
        <img
          src={product.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setBroken(true);
          }}
        />
      </span>
    );
  }
  const Icon = product?.source === 'label' ? ScanText : product?.source === 'typed' ? Keyboard : Package;
  return (
    <span className="thumb placeholder" style={style}>
      <Icon size={size * 0.42} />
    </span>
  );
}
