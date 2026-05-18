/**
 * InboxContext — fuente unica de verdad para conversations + unread count.
 *
 * Sprint 3 (post Fase 7): centralizar el state realtime del inbox a nivel
 * global para que el badge del sidebar, la lista del inbox, y cualquier
 * otra UI que muestre conteos/previews esten siempre en sync.
 *
 * Antes existian 3 subscripciones realtime separadas:
 *   - useRealtimeInbox (Inbox.tsx) — lista
 *   - useConversationMessages (timeline activo)
 *   - useInboxUnreadCount (MainLayout) — badge
 *
 * Cada una tenia su propio fetch + state local + latencia distinta,
 * causando que el badge y la burbuja se actualicen en momentos distintos
 * para el mismo evento.
 *
 * Ahora: UN solo channel `clinic:{orgId}` actualiza UN solo array de
 * conversations. El unreadCount se DERIVA de ese array (no fetch separado).
 *
 * El timeline activo (useConversationMessages) sigue siendo un hook
 * separado porque su scope es por-conversation, no por-org.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCurrentUser } from "@/context/UserContext";
import {
  useConversations,
  type ConversationListRow,
} from "@/hooks/useConversations";
import {
  useRealtimeInbox,
  playNotificationBeep,
} from "@/hooks/useRealtimeInbox";

interface InboxContextValue {
  conversations: ConversationListRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /** Numero de conversaciones con unread_count > 0 (derivado del state) */
  unreadCount: number;
  /** Para que Inbox.tsx pueda refrescar conv concreta tras handoff/send */
  upsertConversation: (
    incoming: Partial<ConversationListRow> & { id: string },
  ) => void;
}

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const organizationId = user?.organizationId ?? undefined;

  const {
    conversations,
    isLoading,
    error,
    refetch,
    upsertConversation,
    applyMessageToConversation,
  } = useConversations(organizationId);

  // Channel unico a nivel org. Las callbacks mutan el state local.
  // El badge y la lista derivan del mismo state, asi que se actualizan a la vez.
  useRealtimeInbox(organizationId, {
    onConversationInserted: (row) => upsertConversation(row),
    onConversationUpdated: (row) => upsertConversation(row),
    onMessageInserted: (row) => {
      applyMessageToConversation(row);
      if (row.source === "patient") {
        playNotificationBeep();
      }
    },
    onMessageUpdated: (row) => {
      applyMessageToConversation(row);
    },
  });

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread_count > 0).length,
    [conversations],
  );

  const value: InboxContextValue = {
    conversations,
    isLoading,
    error,
    refetch,
    unreadCount,
    upsertConversation,
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

/**
 * Hook para consumir el InboxContext.
 *
 * Devuelve valores "default" inertes (conversations: [], unreadCount: 0) si
 * el provider no esta presente — asi MainLayout funciona aunque la app no
 * haya montado el provider todavia (e.g. durante onboarding o en login).
 */
export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) {
    return {
      conversations: [],
      isLoading: false,
      error: null,
      refetch: () => undefined,
      unreadCount: 0,
      upsertConversation: () => undefined,
    };
  }
  return ctx;
}
