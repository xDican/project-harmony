/**
 * InboxList — columna lista del inbox.
 *
 * Sprint 3 Fase 2.
 *
 * Junta: hook useConversations + InboxFilters + items + estados (loading, empty, error).
 */

import { useMemo, useState } from "react";
import { Inbox as InboxIcon, Loader2, AlertCircle } from "lucide-react";
import { useConversations, filterConversations, type InboxFilter } from "@/hooks/useConversations";
import { ConversationListItem } from "./ConversationListItem";
import { InboxFilters } from "./InboxFilters";
import { Skeleton } from "@/components/ui/skeleton";

interface InboxListProps {
  organizationId: string | undefined;
  selectedConvId: string | null;
  onSelect: (conversationId: string) => void;
}

export function InboxList({
  organizationId,
  selectedConvId,
  onSelect,
}: InboxListProps) {
  const { conversations, isLoading, error } = useConversations(organizationId);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { filtered, counts } = useMemo(
    () => filterConversations(conversations, filter, searchQuery),
    [conversations, filter, searchQuery],
  );

  return (
    <>
      <InboxFilters
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 overflow-auto">
        {isLoading && conversations.length === 0 && <LoadingSkeleton />}

        {error && (
          <div className="p-6 text-center text-destructive flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No se pudieron cargar las conversaciones</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <EmptyState
            hasConversations={conversations.length > 0}
            isFiltered={filter !== "all" || searchQuery.length > 0}
          />
        )}

        {filtered.length > 0 && (
          <ul className="divide-y">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <ConversationListItem
                  conversation={conv}
                  isSelected={selectedConvId === conv.id}
                  onClick={() => onSelect(conv.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Indicador de refresh on top si esta cargando con datos previos */}
        {isLoading && conversations.length > 0 && (
          <div className="absolute top-32 right-4 z-10">
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
