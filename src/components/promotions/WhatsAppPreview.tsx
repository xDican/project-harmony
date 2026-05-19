/**
 * WhatsAppPreview — muestra como se vera la promo cuando el bot la envia.
 *
 * Sprint 5. Se usa en PromotionFormPage como columna lateral.
 * El estilo imita un mensaje recibido en WhatsApp (bubble verde claro,
 * imagen arriba si hay, formato negrita/cursiva).
 */

import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WhatsAppPreviewProps {
  title: string;
  description: string;
  conditions?: string;
  validFrom?: string;
  validTo?: string;
  /** Object URL del archivo seleccionado, signed URL del bucket, o null */
  imageUrl?: string | null;
}

function formatDate(s?: string): string {
  if (!s) return "";
  try {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  } catch {
    return s;
  }
}

export function WhatsAppPreview({
  title,
  description,
  conditions,
  validFrom,
  validTo,
  imageUrl,
}: WhatsAppPreviewProps) {
  const dateText =
    validFrom && validTo
      ? `📅 Válida del ${formatDate(validFrom)} al ${formatDate(validTo)}`
      : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Vista previa WhatsApp</h3>
      </div>

      <div className="bg-[#ECE5DD] dark:bg-muted p-4">
        <div className="flex justify-center mb-2">
          <span className="text-[10px] bg-white/80 dark:bg-card text-muted-foreground px-2 py-0.5 rounded-full">
            HOY
          </span>
        </div>

        <div className="max-w-[280px] bg-white dark:bg-card rounded-lg shadow-sm overflow-hidden">
          {imageUrl ? (
            <div className="aspect-square bg-muted">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          <div className="p-3 space-y-1.5 text-sm">
            <p className="font-semibold leading-tight">
              ✨ *{title || "Título de la promoción"}*
            </p>
            <p className="leading-snug whitespace-pre-line">
              {description ||
                "La descripción que la asistente escriba aparecerá acá tal cual."}
            </p>
            {conditions ? (
              <p className="text-xs text-muted-foreground italic leading-snug">
                ⚠️ {conditions}
              </p>
            ) : null}
            {dateText ? (
              <p className="text-xs text-muted-foreground pt-1">{dateText}</p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
