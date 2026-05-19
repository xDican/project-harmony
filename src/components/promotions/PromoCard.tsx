/**
 * PromoCard — card individual de promocion en la lista.
 *
 * Sprint 5. Adaptacion del mockup Stitch:
 *   - Imagen arriba (16:9), placeholder si no hay
 *   - Badge estado (Activa/Borrador/Expirada/Archivada) en esquina sup-der
 *   - Badge categoria (service_type) debajo de imagen, opcional
 *   - Titulo + descripcion breve
 *   - Vigencia con icono calendario
 *   - Acciones en footer: Editar | Duplicar | Archivar/Reactivar
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Image as ImageIcon,
  MoreVertical,
  Pencil,
  Copy,
  Archive,
  Trash2,
  RotateCcw,
  Star,
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type Promotion,
  type PromotionStatus,
  PROMOTION_STATUS_LABELS,
} from "@/lib/promotionsApi";
import { getPromoImageSignedUrl } from "@/lib/promoImageUpload";
import { useCurrentUser } from "@/context/UserContext";

interface PromoCardProps {
  promotion: Promotion;
  serviceTypeLabel?: string | null;
  onArchive: () => void;
  onDuplicate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}

function formatDateRange(from: string, to: string, status: PromotionStatus): string {
  const fromD = new Date(from + "T00:00:00");
  const toD = new Date(to + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-HN", { day: "numeric", month: "short" });

  if (status === "expired") return `Expiró: ${fmt(toD)}`;
  return `Vigencia: ${fmt(fromD)} al ${fmt(toD)}`;
}

function statusVariant(status: PromotionStatus): {
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case "active":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "draft":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "expired":
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        dot: "bg-muted-foreground",
      };
    case "archived":
      return {
        bg: "bg-slate-100 dark:bg-slate-900/40",
        text: "text-slate-600 dark:text-slate-400",
        dot: "bg-slate-400",
      };
  }
}

export function PromoCard({
  promotion,
  serviceTypeLabel,
  onArchive,
  onDuplicate,
  onReactivate,
  onDelete,
}: PromoCardProps) {
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const status = promotion.status as PromotionStatus;
  const variant = statusVariant(status);
  const isExpired = status === "expired";
  const isFaded = isExpired || status === "archived";

  // Cargar signed URL al montar
  useEffect(() => {
    if (!promotion.image_url) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    getPromoImageSignedUrl(promotion.image_url).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [promotion.image_url]);

  return (
    <Card className={isFaded ? "opacity-75" : undefined}>
      {/* Imagen + badge estado */}
      <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={promotion.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <div
          className={`absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${variant.dot}`} />
          {PROMOTION_STATUS_LABELS[status]}
        </div>

        {promotion.is_featured ? (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
            title="El bot la menciona naturalmente al cierre de otros flujos"
          >
            <Star className="h-3 w-3 fill-current" />
            Destacada
          </div>
        ) : null}
      </div>

      <CardContent className="pt-4 space-y-2">
        {serviceTypeLabel ? (
          <Badge variant="outline" className="text-xs">
            {serviceTypeLabel}
          </Badge>
        ) : null}

        <h3 className="font-semibold leading-tight line-clamp-2">
          {promotion.title}
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {promotion.description}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Calendar className="h-3.5 w-3.5" />
          <span className={isExpired ? "text-destructive" : undefined}>
            {formatDateRange(promotion.valid_from, promotion.valid_to, status)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-3 gap-1 justify-between">
        {isExpired ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReactivate}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reactivar
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/configuracion/promociones/${promotion.id}/editar`)
              }
              className="text-xs"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDuplicate} className="text-xs">
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Duplicar
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Más acciones">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status !== "archived" && !isExpired ? (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archivar
              </DropdownMenuItem>
            ) : null}
            {isAdmin ? (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
