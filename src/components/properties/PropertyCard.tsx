/**
 * PropertyCard — card individual de propiedad en el catálogo (hub).
 *
 * Piloto bienes raices Bruno (10 Ago 2026). Mismo patrón visual que
 * PromoCard.tsx (imagen 16:9 + badge de estado en la esquina), adaptado a
 * los campos reales de `properties`. Tamaño SIEMPRE en varas (v²) — nunca
 * metros, corrige el mismatch que traía el mockup original de Stitch.
 */

import { useEffect, useState } from "react";
import { Bed, Bath, Ruler, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type Property,
  type PropertyStatus,
  PROPERTY_STATUS_LABELS,
} from "@/lib/propertiesApi";
import { getPropertyPhotoSignedUrl } from "@/lib/propertyPhotoUpload";

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
}

function statusVariant(status: PropertyStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "disponible":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "reservada":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "vendida":
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        dot: "bg-muted-foreground",
      };
    case "inactiva":
      return {
        bg: "bg-slate-100 dark:bg-slate-900/40",
        text: "text-slate-600 dark:text-slate-400",
        dot: "bg-slate-400",
      };
  }
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "Precio a consultar";
  return `${currency} ${price.toLocaleString("es-HN")}`;
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const status = property.status as PropertyStatus;
  const variant = statusVariant(status);
  const isFaded = status === "vendida" || status === "inactiva";
  const coverPath = property.photos?.[0] ?? null;

  useEffect(() => {
    if (!coverPath) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    getPropertyPhotoSignedUrl(coverPath).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [coverPath]);

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${isFaded ? "opacity-75" : ""}`}
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={property.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <div
          className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${variant.dot}`} />
          {PROPERTY_STATUS_LABELS[status]}
        </div>
      </div>

      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-1">{property.title}</h3>
          <span className="text-xs text-muted-foreground shrink-0">{property.code}</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">{property.zone}</p>

        <p className="font-semibold text-primary">
          {formatPrice(property.price, property.currency)}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
          {property.bedrooms !== null && (
            <div className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms !== null && (
            <div className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              <span>{property.bathrooms}</span>
            </div>
          )}
          {property.size_varas !== null && (
            <div className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              <span>{property.size_varas}v²</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
