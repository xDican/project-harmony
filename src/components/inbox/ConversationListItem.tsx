/**
 * ConversationListItem — un item de la lista de conversaciones del inbox.
 *
 * Sprint 3 Fase 2.
 *
 * Muestra:
 * - Avatar (iniciales del patient_name)
 * - Nombre del paciente (negrita si unread > 0)
 * - Telefono pequeño gris
 * - Preview del ultimo mensaje (con icono si es media)
 * - Hora relativa (5 min, 1 hora, Ayer, etc.)
 * - Badge unread count
 * - Border lateral verde si status='human_active'
 *
 * Estilo:
 * - Fondo verde-claro si isSelected
 * - Hover state
 */

import { formatDistanceToNow, isToday, isYesterday, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Mic, Image as ImageIcon, FileText, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ConversationListRow } from "@/hooks/useConversations";

interface ConversationListItemProps {
  conversation: ConversationListRow;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const {
    patient_name,
    patient_phone,
    status,
    last_message_at,
    unread_count,
    last_message,
  } = conversation;

  const displayName = patient_name?.trim() || patient_phone || "Sin nombre";
  const isUnread = unread_count > 0;
  const isHumanActive = status === "human_active";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b transition-colors flex gap-3 items-start relative",
        "hover:bg-accent/50",
        isSelected && "bg-primary/10",
      )}
    >
      {/* Border lateral verde para human_active */}
      {isHumanActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
        />
      )}

      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={cn(
          "text-sm font-medium",
          isHumanActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
            )}
          >
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatRelativeShort(last_message_at)}
          </span>
        </div>

        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {patient_phone}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <MessagePreview message={last_message} className="flex-1 min-w-0" />
          {isUnread && (
            <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
              {unread_count > 99 ? "99+" : unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Preview del ultimo mensaje. Si es audio/imagen/document, mostrar icono + label.
 * Si es audio con transcripcion, mostrar la transcripcion (mejor UX que "audio").
 */
function MessagePreview({
  message,
  className,
}: {
  message: ConversationListRow["last_message"];
  className?: string;
}) {
  if (!message) {
    return (
      <span className={cn("text-xs text-muted-foreground italic truncate", className)}>
        Sin mensajes
      </span>
    );
  }

  const type = message.message_type;

  // Audio: si hay transcripcion, mostrarla con icono. Sino, "audio".
  if (type === "audio") {
    return (
      <span className={cn("text-xs text-muted-foreground truncate flex items-center gap-1", className)}>
        <Mic className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{message.transcription || "audio"}</span>
      </span>
    );
  }

  if (type === "image") {
    return (
      <span className={cn("text-xs text-muted-foreground truncate flex items-center gap-1", className)}>
        <ImageIcon className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{message.body || "imagen"}</span>
      </span>
    );
  }

  if (type === "document") {
    return (
      <span className={cn("text-xs text-muted-foreground truncate flex items-center gap-1", className)}>
        <FileText className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{message.body || "documento"}</span>
      </span>
    );
  }

  if (type === "voice_call") {
    return (
      <span className={cn("text-xs text-muted-foreground truncate flex items-center gap-1", className)}>
        <Phone className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">Llamada</span>
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-muted-foreground truncate", className)}>
      {message.body || "(sin contenido)"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Hora relativa corta: "5 min", "1 h", "Ayer", "lun", "12 may"
 */
function formatRelativeShort(isoDate: string): string {
  try {
    const date = parseISO(isoDate);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);

    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `${diffMin} min`;

    if (isToday(date)) {
      const diffH = Math.floor(diffMin / 60);
      return `${diffH} h`;
    }
    if (isYesterday(date)) return "Ayer";

    const diffDays = differenceInDays(now, date);
    if (diffDays < 7) {
      return date.toLocaleDateString("es", { weekday: "short" });
    }

    return formatDistanceToNow(date, { locale: es, addSuffix: false });
  } catch {
    return "";
  }
}
