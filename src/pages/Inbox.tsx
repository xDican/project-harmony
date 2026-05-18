/**
 * Inbox / Bandeja — Centro de atencion WhatsApp.
 *
 * Sprint 3.
 *
 * Desktop (md+): 2 columnas — lista 384px + detalle flex-1.
 * Mobile: 1 columna — muestra lista o detalle segun seleccion.
 *
 * Fase 2 ✅ — lista real con filtros + buscador
 * Fase 3 ✅ — detalle con timeline + audio player + composer
 *
 * Fases siguientes:
 *   - Fase 4: tomar / devolver al bot
 *   - Fase 5: realtime Supabase channels
 *   - Fase 6: marcar leido + badge global
 *   - Fase 7: polish + estados edge
 */

import { useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { InboxList } from "@/components/inbox/InboxList";
import { ConversationDetail } from "@/components/inbox/ConversationDetail";
import {
  useConversations,
  type ConversationListRow,
} from "@/hooks/useConversations";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import {
  useRealtimeInbox,
  playNotificationBeep,
} from "@/hooks/useRealtimeInbox";
import { useCurrentUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const [selectedConv, setSelectedConv] =
    useState<ConversationListRow | null>(null);

  const { user } = useCurrentUser();
  const organizationId = user?.organizationId;

  // Hook elevado a parent para compartir data con detalle (sin duplicar fetch)
  const {
    conversations,
    isLoading,
    error,
    refetch,
    upsertConversation,
    applyMessageToConversation,
  } = useConversations(organizationId);

  // Cuando se actualiza la lista, refrescar selectedConv con la version mas reciente
  const liveSelected = selectedConv
    ? conversations.find((c) => c.id === selectedConv.id) ?? selectedConv
    : null;

  // Hook de mensajes tambien al padre — asi el realtime channel del org puede
  // propagar inserts al timeline activo sin re-suscribirse al cambiar de conv.
  const messagesHook = useConversationMessages(liveSelected?.id ?? null);

  // Sprint 3 Fase 5: realtime UNIFICADO en un solo channel a nivel org.
  // No hay channel adicional por conv — los inserts/updates se propagan al
  // timeline activo via messagesHook.insertRealtimeMessage / updateRealtimeMessage.
  useRealtimeInbox(organizationId, {
    onConversationInserted: (row) => {
      upsertConversation(row);
    },
    onConversationUpdated: (row) => {
      upsertConversation(row);
    },
    onMessageInserted: (row) => {
      applyMessageToConversation(row);
      if (row.source === "patient") {
        playNotificationBeep();
      }
      // Si la conv del mensaje es la abierta, agregar al timeline
      if (row.conversation_id && row.conversation_id === liveSelected?.id) {
        messagesHook.insertRealtimeMessage(row);
      }
    },
    onMessageUpdated: (row) => {
      // Si llego transcripcion despues, refrescar preview de la lista
      applyMessageToConversation(row);
      if (row.conversation_id && row.conversation_id === liveSelected?.id) {
        messagesHook.updateRealtimeMessage(row);
      }
    },
  });

  return (
    <MainLayout mainClassName="overflow-hidden">
      <div className="flex h-full min-h-0">
        {/* === Columna lista de conversaciones === */}
        <aside
          className={cn(
            "flex flex-col border-r bg-card min-h-0",
            liveSelected
              ? "hidden md:flex md:w-96 md:flex-shrink-0"
              : "flex w-full md:w-96 md:flex-shrink-0",
          )}
        >
          <div className="hidden md:block px-4 py-4 border-b">
            <h2 className="text-2xl font-bold">Bandeja</h2>
          </div>

          <InboxList
            conversations={conversations}
            isLoading={isLoading}
            error={error}
            selectedConvId={liveSelected?.id ?? null}
            onSelect={setSelectedConv}
          />
        </aside>

        {/* === Columna detalle === */}
        <section
          className={cn(
            "flex-1 flex-col bg-background min-w-0 min-h-0",
            liveSelected ? "flex" : "hidden md:flex",
          )}
        >
          {liveSelected ? (
            <ConversationDetail
              conversation={liveSelected}
              messages={messagesHook.messages}
              isLoadingMessages={messagesHook.isLoading}
              messagesError={messagesHook.error}
              refetchMessages={messagesHook.refetch}
              onBack={() => setSelectedConv(null)}
              onConversationUpdated={refetch}
            />
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
