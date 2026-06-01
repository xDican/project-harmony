/**
 * useWhatsAppLines — lista las lineas de WhatsApp activas de la org.
 *
 * Usado por el inbox para:
 *   - el selector de linea (filtro multi-linea)
 *   - el badge "Sincronizando historial" (coexistence, B6)
 *
 * Reusa getWhatsAppLinesByOrganization (resuelve la org activa internamente).
 * Solo retorna lineas con isActive=true.
 *
 * Poll: mientras alguna linea tenga sync_in_progress=true, refresca cada 30s para
 * que el badge desaparezca cuando el watchdog apaga la bandera. El poll se auto-
 * detiene cuando ninguna linea esta sincronizando (el caso normal → cero polling).
 */

import { useCallback, useEffect, useState } from "react";
import { getWhatsAppLinesByOrganization } from "@/lib/api.supabase";
import type { WhatsAppLine } from "@/types/organization";

const SYNC_POLL_INTERVAL_MS = 30_000;

export function useWhatsAppLines(organizationId: string | undefined) {
  const [lines, setLines] = useState<WhatsAppLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLines = useCallback(async () => {
    if (!organizationId) {
      setLines([]);
      return;
    }
    try {
      const data = await getWhatsAppLinesByOrganization();
      setLines(data.filter((l) => l.isActive));
    } catch (e) {
      console.error("[useWhatsAppLines] Error:", e);
      setLines([]);
    }
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchLines().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLines]);

  // Poll solo mientras haya sync en curso (badge B6). Se auto-detiene.
  const anySyncing = lines.some((l) => l.syncInProgress);
  useEffect(() => {
    if (!anySyncing) return;
    const t = setInterval(fetchLines, SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [anySyncing, fetchLines]);

  return { lines, isLoading };
}
