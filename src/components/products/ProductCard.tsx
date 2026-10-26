/**
 * ProductCard — card de producto en el catálogo (hub). Patrón de PropertyCard.
 * El código va grande: el vendedor lo muestra en pantalla durante el live.
 */

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/lib/productsApi";
import { getProductPhotoSignedUrl } from "@/lib/productPhotoUpload";
import { formatMoney } from "@/lib/formatMoney";
import { StockBar } from "@/components/products/StockBar";

interface ProductCardProps {
  product: Product;
  /** Unidades en pedidos abiertos (reservado / en_revision) */
  reserved: number;
  onClick: () => void;
}

function stockBadge(product: Product): { label: string; cls: string } {
  if (!product.active) {
    return { label: "Inactivo", cls: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400" };
  }
  if (product.stock === 0) {
    return { label: "Agotado", cls: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" };
  }
  return {
    label: `Disponible ${product.stock}`,
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
}

export function ProductCard({ product, reserved, onClick }: ProductCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const coverPath = product.photos?.[0] ?? null;
  const badge = stockBadge(product);

  useEffect(() => {
    if (!coverPath) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    getProductPhotoSignedUrl(coverPath).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [coverPath]);

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${product.active ? "" : "opacity-70"}`}
      onClick={onClick}
    >
      <div className="relative aspect-square bg-muted overflow-hidden rounded-t-lg">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur rounded-md px-2 py-0.5 text-lg font-bold tracking-wide shadow-sm">
          {product.code}
        </div>
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </div>
      </div>

      <CardContent className="pt-3 space-y-1">
        <h3 className="font-semibold leading-tight line-clamp-1">{product.name}</h3>
        <p className="font-semibold text-primary">{formatMoney(product.price, product.currency)}</p>
        {reserved > 0 && <StockBar stock={product.stock} reserved={reserved} />}
      </CardContent>
    </Card>
  );
}
