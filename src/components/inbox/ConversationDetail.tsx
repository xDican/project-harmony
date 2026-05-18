/**
 * ConversationDetail — vista de detalle de una conversacion.
 *
 * Sprint 3 Fase 3.
 *
 * Layout: header (avatar + nombre + telefono + badge status + botones) +
 * timeline scrolleable de mensajes + composer fijo al pie.
 *
 * En Fase 4 se completa: boton Tomar / Devolver al bot con AlertDialog confirm.
 * Hoy ya muestra el badge "BOT ATIENDE" o "TÚ ATENDIENDO" para reflejar el estado.
 */

import { useEffect, useRef } from "react";
import { Bot, User, ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import type { ConversationListRow } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface ConversationDetailProps {
  conversation: ConversationListRow;
  /** Callback mobile back button (volver a lista) */
  onBack: () => void;
  /** Callback tras envio exitoso, para que el padre refresque conversations list */
  onMessageSent?: () => void;
}

export function ConversationDetail({
  conversation,
  onBack,
  onMessageSent,
}: ConversationDetailProps) {
  const { messages, isLoading, error, refetch } = useConversationMessages(
    conversation.id,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al ultimo mensaje al cargar / cuando llega nuevo
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // requestAnimationFrame para esperar al render
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages.length]);

  const displayName = conversation.patient_name?.trim() || conversation.patient_phone;
  const isHumanActive = conversation.status === "human_active";

  return (
    <>
      {/* Header */}
      <div className="px-3 md:px-4 py-3 border-b flex items-center gap-3 bg-card">
        {/* Back mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={onBack}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Volver</span>
        </Button>

        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback
            className={cn(
              "text-sm font-medium",
              isHumanActive
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{displayName}</span>
            <StatusBadge status={conversation.status} />
          </div>
          <div className="text-xs text-muted-foreground">
            {conversation.patient_phone}
          </div>
        </div>

        {/* Fase 4: botones Tomar / Devolver al bot */}
      </div>

      {/* Timeline */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 md:px-6 py-4 bg-muted/20"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-destructive gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No se pudieron cargar los mensajes</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
            <p className="text-sm">No hay mensajes en esta conversación</p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-1">
            {renderMessagesWithDateSeparators(messages)}
          </div>
        )}
      </div>

      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        conversationStatus={conversation.status}
        onSent={() => {
          refetch();
          onMessageSent?.();
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { status: ConversationListRow["status"] }) {
  if (status === "human_active") {
    return (
      <Badge
        variant="default"
        className="gap-1 text-[10px] font-semibold uppercase tracking-wide"
      >
        <User className="h-3 w-3" />
        Tú atendiendo
      </Badge>
    );
  }
  if (status === "bot_active") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-[10px] font-semibold uppercase tracking-wide"
      >
        <Bot className="h-3 w-3" />
        Bot atiende
      </Badge>
    );
  }
  if (status === "closed") {
    return (
      <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
        Cerrada
      </Badge>
    );
  }
  return null;
}

/**
 * Inserta separadores "Hoy", "Ayer", "12 de mayo" entre mensajes de fechas distintas.
 */
function renderMessagesWithDateSeparators(messages: Parameters<typeof MessageBubble>[0]["message"][]) {
  const result: JSX.Element[] = [];
  let lastDate: string | null = null;

  for (const msg of messages) {
    const msgDate = new Date(msg.created_at);
    const dateKey = msgDate.toDateString();

    if (dateKey !== lastDate) {
      result.push(
        <DateSeparator key={`sep-${dateKey}`} date={msgDate} />,
      );
      lastDate = dateKey;
    }

    result.push(<MessageBubble key={msg.id} message={msg} />);
  }

  return result;
}

function DateSeparator({ date }: { date: Date }) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let label: string;
  if (date.toDateString() === today.toDateString()) {
    label = "Hoy";
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = "Ayer";
  } else {
    label = date.toLocaleDateString("es", {
      day: "numeric",
      month: "long",
    });
  }

  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-xs font-medium text-muted-foreground bg-card px-3 py-1 rounded-full border uppercase">
        {label}
      </span>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
