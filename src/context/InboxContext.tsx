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

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { useCurrentUser } from "@/context/UserContext";
import {
  useConversations,
  type ConversationListRow,
} from "@/hooks/useConversations";
import {
  useRealtimeInbox,
  playNotificationBeep,
} from "@/hooks/useRealtimeInbox";
import type { MessageRow } from "@/hooks/useConversationMessages";

/** Evento de message_logs propagado a subscribers externos (CallContext, etc.). */
export interface MessageLogEvent {
  type: "INSERT" | "UPDATE";
  row: MessageRow;
}

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
  /**
   * EventBus de message_logs. Otros providers (CallContext) se suscriben para
   * reaccionar a tipos especificos (voice_call) sin tener su propio listener
   * Realtime sobre la misma tabla. Retorna unsubscribe.
   */
  subscribeToMessageLog: (
    handler: (event: MessageLogEvent) => void,
  ) => () => void;
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

  // EventBus de message_logs — subscribers externos (CallContext) reaccionan
  // sin crear su propio listener Realtime sobre la misma tabla.
  const messageLogHandlersRef = useRef<Set<(e: MessageLogEvent) => void>>(new Set());

  const subscribeToMessageLog = useCallback(
    (handler: (event: MessageLogEvent) => void) => {
      messageLogHandlersRef.current.add(handler);
      return () => {
        messageLogHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const emitMessageLog = useCallback((event: MessageLogEvent) => {
    for (const h of messageLogHandlersRef.current) {
      try {
        h(event);
      } catch (err) {
        console.error("[InboxContext] message_log handler error:", err);
      }
    }
  }, []);

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
      emitMessageLog({ type: "INSERT", row: row as MessageRow });
    },
    onMessageUpdated: (row) => {
      applyMessageToConversation(row);
      emitMessageLog({ type: "UPDATE", row: row as MessageRow });
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
    subscribeToMessageLog,
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
      subscribeToMessageLog: () => () => undefined,
    };
  }
  return ctx;
}
