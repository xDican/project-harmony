/**
 * ConversationDetail — vista de detalle de una conversacion.
 *
 * Sprint 3 Fase 4.
 *
 * Header: avatar + nombre + telefono + badge status + botones Tomar/Devolver.
 * Timeline scrolleable con separadores de fecha.
 * Composer fijo al pie (Fase 3).
 *
 * - "Tomar conversacion" — visible si bot_active. Llama inbox-handoff.
 * - "Devolver al bot" — visible si human_active. Abre AlertDialog confirm,
 *   despues llama inbox-return-bot.
 *
 * Auto-handoff sigue funcionando: si la asistente escribe sin presionar Tomar,
 * inbox-send hace el handoff automaticamente (Fase 3 backend).
 */

import { useEffect, useRef, useState } from "react";
import { Bot, User, ChevronLeft, Loader2, AlertCircle, UserPlus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { takeConversation, returnToBot } from "@/lib/inboxActions";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import type { ConversationListRow } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface ConversationDetailProps {
  conversation: ConversationListRow;
  onBack: () => void;
  /** Callback tras envio o cambio de status, para que el padre refresque la lista */
  onConversationUpdated?: () => void;
}

export function ConversationDetail({
  conversation,
  onBack,
  onConversationUpdated,
}: ConversationDetailProps) {
  const { messages, isLoading, error, refetch } = useConversationMessages(
    conversation.id,
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al ultimo mensaje al cargar / cuando llega nuevo
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
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

        <HandoffControls
          conversation={conversation}
          onUpdated={() => {
            refetch();
            onConversationUpdated?.();
          }}
        />
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
          onConversationUpdated?.();
        }}
      />
    </>
  );
}

/**
 * Botones Tomar / Devolver al bot segun status.
 */
function HandoffControls({
  conversation,
  onUpdated,
}: {
  conversation: ConversationListRow;
  onUpdated: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleTake = async () => {
    setIsLoading(true);
    try {
      await takeConversation(conversation.id);
      toast.success("Conversación tomada");
      onUpdated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("No se pudo tomar la conversación", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = async () => {
    setIsLoading(true);
    setConfirmOpen(false);
    try {
      await returnToBot(conversation.id);
      toast.success("Conversación devuelta al bot");
      onUpdated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("No se pudo devolver al bot", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  if (conversation.status === "bot_active") {
    return (
      <Button
        size="sm"
        onClick={handleTake}
        disabled={isLoading}
        className="flex-shrink-0 gap-1.5"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Tomar conversación</span>
        <span className="sm:hidden">Tomar</span>
      </Button>
    );
  }

  if (conversation.status === "human_active") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={isLoading}
          className="flex-shrink-0 gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Undo2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Devolver al bot</span>
          <span className="sm:hidden">Devolver</span>
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Devolver al bot?</AlertDialogTitle>
              <AlertDialogDescription>
                El bot automático volverá a responder al paciente. Tú dejarás de
                atender esta conversación, pero puedes retomarla en cualquier
                momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReturn}>
                Sí, devolver al bot
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return null;
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
