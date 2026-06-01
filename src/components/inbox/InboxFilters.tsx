/**
 * InboxFilters — tabs de filtros + buscador para el inbox.
 *
 * Sprint 3 Fase 2.
 *
 * Tabs: Todos | No leidos | Bot atiende | Humano atiende (con conteos).
 * Buscador: cliente-side por nombre o telefono.
 */

import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InboxFilter, InboxCounts } from "@/hooks/useConversations";
import type { WhatsAppLine } from "@/types/organization";

const ALL_LINES = "__all__";

interface InboxFiltersProps {
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  counts: InboxCounts;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lines: WhatsAppLine[];
  selectedLineId: string | null;
  onLineChange: (lineId: string | null) => void;
  showLineSelector: boolean;
  syncingHistory?: boolean;
}

export function InboxFilters({
  filter,
  onFilterChange,
  counts,
  searchQuery,
  onSearchChange,
  lines,
  selectedLineId,
  onLineChange,
  showLineSelector,
  syncingHistory,
}: InboxFiltersProps) {
  return (
    <div className="px-3 py-3 border-b space-y-3 bg-card">
      {/* Coexistence (B6): aviso mientras llega el flood de historial tras vincular */}
      {syncingHistory && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
          <span>Sincronizando historial de WhatsApp… los mensajes recientes seguirán llegando normal.</span>
        </div>
      )}
      {/* Selector de linea (solo con >1 linea) */}
      {showLineSelector && (
        <Select
          value={selectedLineId ?? ALL_LINES}
          onValueChange={(v) => onLineChange(v === ALL_LINES ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LINES}>Todas las líneas</SelectItem>
            {lines.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label} · {l.phoneNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar paciente o teléfono..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => onFilterChange(v as InboxFilter)}
      >
        <TabsList className="grid grid-cols-4 w-full h-9">
          <TabsTrigger value="all" className="text-xs px-1">
            Todos ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs px-1">
            No leídos ({counts.unread})
          </TabsTrigger>
          <TabsTrigger value="bot" className="text-xs px-1">
            Bot ({counts.bot})
          </TabsTrigger>
          <TabsTrigger value="human" className="text-xs px-1">
            Humano ({counts.human})
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
