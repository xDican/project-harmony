/**
 * InboxList — columna lista del inbox.
 *
 * Sprint 3 Fase 3 (refactor): recibe conversations como prop. El parent
 * (Inbox.tsx) maneja el hook useConversations para compartir data con
 * ConversationDetail sin duplicar fetch.
 */

import { useEffect, useMemo, useState } from "react";
import { Inbox as InboxIcon, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  filterConversations,
  type ConversationListRow,
  type InboxFilter,
} from "@/hooks/useConversations";
import { useWhatsAppLines } from "@/hooks/useWhatsAppLines";
import { useCurrentUser } from "@/context/UserContext";
import { ConversationListItem } from "./ConversationListItem";
import { InboxFilters } from "./InboxFilters";
import { NewConversationCard } from "./NewConversationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { detectInputType } from "@/lib/waLinkParser";

const SELECTED_LINE_STORAGE_KEY = "inbox:selectedLineId";

interface InboxListProps {
  conversations: ConversationListRow[];
  isLoading: boolean;
  error: string | null;
  selectedConvId: string | null;
  onSelect: (conversation: ConversationListRow) => void;
  onRetry?: () => void;
}

export function InboxList({
  conversations,
  isLoading,
  error,
  selectedConvId,
  onSelect,
  onRetry,
}: InboxListProps) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useCurrentUser();
  const { lines } = useWhatsAppLines(user?.organizationId ?? undefined);

  // Linea seleccionada (null = todas). Persistida en localStorage.
  const [selectedLineId, setSelectedLineId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_LINE_STORAGE_KEY) || null,
  );

  // Si la linea guardada ya no existe (ej. se elimino), volver a "Todas".
  useEffect(() => {
    if (selectedLineId && lines.length > 0 && !lines.some((l) => l.id === selectedLineId)) {
      setSelectedLineId(null);
      localStorage.removeItem(SELECTED_LINE_STORAGE_KEY);
    }
  }, [lines, selectedLineId]);

  const handleLineChange = (lineId: string | null) => {
    setSelectedLineId(lineId);
    if (lineId) localStorage.setItem(SELECTED_LINE_STORAGE_KEY, lineId);
    else localStorage.removeItem(SELECTED_LINE_STORAGE_KEY);
  };

  const showLineSelector = lines.length > 1;
  const linesById = useMemo(
    () => new Map(lines.map((l) => [l.id, l.label])),
    [lines],
  );

  // Coexistence (B6): badge "Sincronizando historial". Si hay una linea seleccionada,
  // refleja esa; si es "Todas", refleja cualquiera que este sincronizando.
  const syncingHistory = selectedLineId
    ? lines.some((l) => l.id === selectedLineId && l.syncInProgress)
    : lines.some((l) => l.syncInProgress);

  const { filtered, counts } = useMemo(
    () => filterConversations(conversations, filter, searchQuery, selectedLineId),
    [conversations, filter, searchQuery, selectedLineId],
  );

  const detection = useMemo(
    () => detectInputType(searchQuery),
    [searchQuery],
  );

  const showNewConvCard =
    detection.type === "wa_link" || detection.type === "phone";

  return (
    <>
      <InboxFilters
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        lines={lines}
        selectedLineId={selectedLineId}
        onLineChange={handleLineChange}
        showLineSelector={showLineSelector}
        syncingHistory={syncingHistory}
      />

      <div className="flex-1 overflow-auto relative">
        {isLoading && conversations.length === 0 && <LoadingSkeleton />}

        {error && (
          <div className="p-6 text-center text-destructive flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm">No se pudieron cargar las conversaciones</p>
            <p className="text-xs text-muted-foreground break-words max-w-xs">{error}</p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Reintentar
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && showNewConvCard && (
          <NewConversationCard
            detection={detection as Extract<typeof detection, { type: "wa_link" | "phone" }>}
            onConversationCreated={(conv) => {
              setSearchQuery("");
              onSelect(conv);
            }}
          />
        )}

        {!isLoading && !error && filtered.length === 0 && !showNewConvCard && (
          <EmptyState
            hasConversations={conversations.length > 0}
            isFiltered={filter !== "all" || searchQuery.length > 0}
          />
        )}

        {filtered.length > 0 && (
          <ul className="divide-y" aria-label="Lista de conversaciones">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <ConversationListItem
                  conversation={conv}
                  isSelected={selectedConvId === conv.id}
                  onClick={() => onSelect(conv)}
                  lineLabel={linesById.get(conv.whatsapp_line_id)}
                  showLineBadge={showLineSelector}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Indicador refresh on top si esta cargando con datos previos */}
        {isLoading && conversations.length > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-3 flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasConversations,
  isFiltered,
}: {
  hasConversations: boolean;
  isFiltered: boolean;
}) {
  return (
    <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
      <InboxIcon className="h-12 w-12 opacity-30" />
      {hasConversations && isFiltered ? (
        <>
          <p className="text-sm font-medium text-foreground/70">
            Sin resultados
          </p>
          <p className="text-xs">
            Prueba con otro filtro o término de búsqueda
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground/70">
            Sin conversaciones aún
          </p>
          <p className="text-xs">
            Cuando un paciente escriba al WhatsApp aparecerá aquí
          </p>
        </>
      )}
    </div>
  );
}
