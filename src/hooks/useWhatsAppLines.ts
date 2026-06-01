/**
 * useWhatsAppLines — lista las lineas de WhatsApp activas de la org.
 *
 * Usado por el inbox para el selector de linea (filtro multi-linea).
 * Reusa getWhatsAppLinesByOrganization (resuelve la org activa internamente).
 * Solo retorna lineas con isActive=true.
 */

import { useEffect, useState } from "react";
import { getWhatsAppLinesByOrganization } from "@/lib/api.supabase";
import type { WhatsAppLine } from "@/types/organization";

export function useWhatsAppLines(organizationId: string | undefined) {
  const [lines, setLines] = useState<WhatsAppLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setLines([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getWhatsAppLinesByOrganization()
      .then((data) => {
        if (cancelled) return;
        setLines(data.filter((l) => l.isActive));
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[useWhatsAppLines] Error:", e);
        setLines([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return { lines, isLoading };
}
