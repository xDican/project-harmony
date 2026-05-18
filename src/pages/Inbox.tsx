/**
 * Inbox / Bandeja — Centro de atencion WhatsApp.
 *
 * Sprint 3.
 *
 * Desktop (md+): 2 columnas — lista 384px + detalle flex-1.
 * Mobile: 1 columna — muestra lista o detalle segun seleccion.
 *
 * Fase 2 ✅ — lista real con filtros + buscador (datos de Supabase).
 *
 * Fases siguientes:
 *   - Fase 3: detalle conversacion (timeline + composer)
 *   - Fase 4: tomar / devolver al bot
 *   - Fase 5: realtime Supabase channels
 *   - Fase 6: marcar leido + badge global
 *   - Fase 7: polish + estados edge
 */

import { useState } from "react";
import { Inbox as InboxIcon, ChevronLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/components/inbox/InboxList";
import { useCurrentUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

export default function Inbox() {
  // Conversation seleccionada (state local en Fase 2; en Fase 7 sincronizar con URL).
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const { user } = useCurrentUser();
  const organizationId = user?.organizationId;

  return (
    <MainLayout mainClassName="overflow-hidden">
      <div className="flex h-full">
        {/* === Columna lista de conversaciones === */}
        <aside
          className={cn(
            "flex flex-col border-r bg-card",
            selectedConvId
              ? "hidden md:flex md:w-96 md:flex-shrink-0"
              : "flex w-full md:w-96 md:flex-shrink-0",
          )}
        >
          {/* Header desktop (mobile usa el de MainLayout) */}
          <div className="hidden md:block px-4 py-4 border-b">
            <h2 className="text-2xl font-bold">Bandeja</h2>
          </div>

          <InboxList
            organizationId={organizationId}
            selectedConvId={selectedConvId}
            onSelect={setSelectedConvId}
          />
        </aside>

        {/* === Columna detalle === */}
        <section
          className={cn(
            "flex-1 flex-col bg-background min-w-0",
            selectedConvId ? "flex" : "hidden md:flex",
          )}
        >
          {selectedConvId ? (
            <>
              {/* Header detalle (mobile incluye back, desktop no) */}
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConvId(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="sr-only">Volver</span>
                </Button>
                <div className="flex-1">
                  <div className="font-semibold">
                    Conversation {selectedConvId.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Detalle en Fase 3
                  </div>
                </div>
              </div>

              {/* Placeholder timeline */}
              <div className="flex-1 overflow-auto p-6 text-center text-muted-foreground text-sm">
                <p>Timeline de mensajes</p>
                <p className="text-xs mt-2 opacity-60">Se carga en Fase 3</p>
              </div>

              {/* Placeholder composer */}
              <div className="border-t p-4 text-center text-muted-foreground text-sm">
                <p className="text-xs opacity-60">Composer en Fase 3</p>
              </div>
            </>
          ) : (
            <EmptyDetailState />
          )}
        </section>
      </div>
    </MainLayout>
  );
}

function EmptyDetailState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
      <InboxIcon className="h-16 w-16 opacity-20 mb-4" />
      <p className="text-lg font-medium text-foreground/60">
        Selecciona una conversación
      </p>
      <p className="text-sm mt-1 opacity-60">
        Las conversaciones de WhatsApp aparecerán aquí
      </p>
    </div>
  );
}
