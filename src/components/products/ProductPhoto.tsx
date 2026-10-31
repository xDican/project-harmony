/**
 * ProductPhoto — miniatura de una foto del bucket product-photos (signed URL
 * propio por foto, mismo patrón que PhotoThumb de PropertyDrawer). Con
 * onRemove/onMakeCover muestra los controles de edición.
 */

import { useEffect, useState } from "react";
import { Loader2, Star, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductPhotoSignedUrl } from "@/lib/productPhotoUpload";

interface ProductPhotoProps {
  path: string;
  isCover?: boolean;
  onMakeCover?: () => void;
  onRemove?: () => void;
}

export function ProductPhoto({ path, isCover, onMakeCover, onRemove }: ProductPhotoProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProductPhotoSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {isCover && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
          Portada
        </div>
      )}
      {onRemove && (
        <div className="absolute inset-0 flex items-start justify-end gap-1 p-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {!isCover && onMakeCover && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              title="Hacer portada"
              onClick={onMakeCover}
            >
              <Star className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-6 w-6 text-destructive"
            title="Eliminar foto"
            onClick={onRemove}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
