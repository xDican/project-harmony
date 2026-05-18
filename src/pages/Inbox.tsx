/**
 * Inbox / Bandeja — Centro de atencion WhatsApp.
 *
 * Sprint 3 Fase 1: estructura base + layout responsive.
 *
 * Desktop (md+): 2 columnas — lista 384px + detalle flex-1.
 * Mobile: 1 columna — muestra lista o detalle segun seleccion.
 *
 * Fases siguientes:
 *   - Fase 2: lista de conversaciones (datos reales + filtros + buscador)
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
import { cn } from "@/lib/utils";

export default function Inbox() {
  // Conversation seleccionada (state local en Fase 1; en Fase 7 sincronizar con URL).
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  return (
    <MainLayout mainClassName="overflow-hidden">
      <div className="flex h-full">
        {/* === Columna lista de conversaciones === */}
        {/* Desktop: w-96 fija. Mobile: full-width si no hay seleccion, oculta si la hay. */}
        <aside
          className={cn(
            "flex flex-col border-r bg-card",
            selectedConvId
              ? "hidden md:flex md:w-96 md:flex-shrink-0"
              : "flex w-full md:w-96 md:flex-shrink-0",
          )}
        >
          {/* Header lista */}
          <div className="px-4 py-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Bandeja</h2>
              {/* Fase 6: badge dinamico con unread count */}
              <span className="text-sm text-muted-foreground">— sin leer</span>
            </div>
          </div>

          {/* Placeholder lista — Fase 2 */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 text-center text-muted-foreground text-sm">
              <p>Lista de conversaciones</p>
              <p className="text-xs mt-2 opacity-60">Se carga en Fase 2</p>

              {/* Placeholder items para probar layout */}
              <div className="mt-6 space-y-2 text-left">
                {[1, 2, 3].map((i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedConvId(`conv-${i}`)}
                    className={cn(
                      "w-full px-3 py-3 rounded-lg border text-left hover:bg-accent transition-colors",
                      selectedConvId === `conv-${i}` &&
                        "bg-primary/10 border-primary/30",
                    )}
                  >
                    <div className="font-medium text-foreground">
                      Conversation placeholder #{i}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Click para abrir detalle (mobile: full screen)
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* === Columna detalle === */}
        {/* Desktop: flex-1 siempre. Mobile: full-width solo si hay seleccion. */}
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
                    Conversation {selectedConvId}
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

/**
 * Estado vacio en desktop cuando no hay conversacion seleccionada.
 * Mobile nunca renderiza esto (cuando no hay seleccion, ve la lista).
 */
function EmptyDetailState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
      <InboxIcon className="h-16 w-16 opacity-20 mb-4" />
      <p className="text-lg font-medium text-foreground/60">
        Selecciona una conversacion
      </p>
      <p className="text-sm mt-1 opacity-60">
        Las conversaciones de WhatsApp apareceran aqui
      </p>
    </div>
  );
}
