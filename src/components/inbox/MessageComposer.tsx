/**
 * MessageComposer — input para enviar mensajes desde el inbox.
 *
 * Sprint 3 Fase 3 + extensiones Sprint 4 (quick replies + multimedia outbound).
 *
 * Layout: [QuickReplyPicker] [Paperclip] [Textarea] [Send]
 *
 * - Textarea expandible (1-5 filas), submit con Enter (Shift+Enter para nueva linea)
 * - Quick reply picker (Sprint 4): popover con plantillas activas de la org,
 *   inserta el contenido al final del body, editable antes de enviar.
 * - Adjuntar (Sprint 4): dropdown con 3 opciones (Imagen / PDF / Audio) que
 *   dispara un input file oculto. Al seleccionar archivo: sube a Storage
 *   `conversation-media` y llama sendMessage con mediaUrl + messageType.
 *   Caso especial audio+caption: Meta no acepta caption en audio, se envian
 *   como 2 mensajes consecutivos.
 * - Hint debajo si conversation.status === 'bot_active': "Al escribir, tomaras
 *   control del chat" — el backend hace auto-handoff cuando se envia.
 *
 * Optimistic: al enviar, se llama sendMessage() y on success el realtime de
 * useConversationMessages / InboxContext levanta el mensaje real.
 */

import { useRef, useState } from "react";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/context/UserContext";
import type { MessageRow } from "@/hooks/useConversationMessages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendMessage } from "@/lib/inboxActions";
import {
  FILE_ACCEPT,
  MediaUploadError,
  uploadConversationMedia,
} from "@/lib/conversationMediaUpload";
import { cn } from "@/lib/utils";
import { QuickReplyPicker } from "./QuickReplyPicker";

interface MessageComposerProps {
  conversationId: string;
  conversationStatus: "bot_active" | "human_active" | "closed" | "pending";
  /** Org del usuario actual — necesaria para listar quick replies y subir media */
  organizationId: string | undefined;
  /** Callback tras envio exitoso, para refrescar mensajes y conversation status */
  onSent?: () => void;
  /** Para optimistic UI — agregar el mensaje al timeline antes del POST */
  addOptimisticMessage?: (message: MessageRow) => void;
  /** Actualizar status del mensaje optimistic (sent / failed) */
  updateOptimisticMessage?: (id: string, patch: Partial<MessageRow>) => void;
  /** Remover un mensaje optimistic (no usado todavia, util para retry) */
  removeMessage?: (id: string) => void;
}

function makeOptimisticTextMessage(args: {
  conversationId: string;
  body: string;
  userId: string | null;
  patientPhoneTo: string;
}): MessageRow {
  return {
    id: `temp-${crypto.randomUUID()}`,
    conversation_id: args.conversationId,
    direction: "outbound",
    source: "assistant",
    message_type: "text",
    body: args.body,
    transcription: null,
    media_url: null,
    media_mime: null,
    status: "sending",
    sent_by: args.userId,
    to_phone: args.patientPhoneTo,
    from_phone: "",
    call_duration_seconds: null,
    call_direction: null,
    call_status: null,
    call_id_meta: null,
    created_at: new Date().toISOString(),
  };
}

export function MessageComposer({
  conversationId,
  conversationStatus,
  organizationId,
  onSent,
  addOptimisticMessage,
  updateOptimisticMessage,
}: MessageComposerProps) {
  const { user } = useCurrentUser();
  const [body, setBody] = useState("");
  // isSending solo limita acciones que requieren el servidor (file upload).
  // Para envio de texto usamos optimistic UI, NO bloqueamos el composer.
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const payload = trimmed;
    setBody(""); // clear inmediato
    textareaRef.current?.focus(); // refocus inmediato para escribir el proximo

    // Optimistic: agregar al timeline ya con status='sending'
    const optimistic = makeOptimisticTextMessage({
      conversationId,
      body: payload,
      userId: user?.id ?? null,
      patientPhoneTo: "",  // se llena cuando llega el real via realtime
    });
    addOptimisticMessage?.(optimistic);

    // Fire-and-forget POST. La UI no espera.
    void (async () => {
      try {
        await sendMessage({
          conversationId,
          body: payload,
          messageType: "text",
        });
        // Marcar como enviado. El realtime traera la version canonica con
        // id real y eventualmente status delivered/read. El insertRealtimeMessage
        // dedupea por body matching y reemplaza al optimistic.
        updateOptimisticMessage?.(optimistic.id, { status: "sent" });
        onSent?.();
      } catch (e) {
        console.error("[MessageComposer] send failed:", e);
        const msg = e instanceof Error ? e.message : "Error desconocido";
        updateOptimisticMessage?.(optimistic.id, { status: "failed" });
        toast.error("No se pudo enviar el mensaje", { description: msg });
      }
    })();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    // Reset el input para permitir reintentar el mismo archivo
    event.target.value = "";
    if (!file) return;

    if (!organizationId) {
      toast.error("Sin organización activa", {
        description: "Volvé a iniciar sesión.",
      });
      return;
    }

    setIsSending(true);
    const uploadToastId = toast.loading("Subiendo archivo...");
    const caption = body.trim();

    try {
      const { path, kind } = await uploadConversationMedia({
        orgId: organizationId,
        conversationId,
        file,
      });

      if (kind === "audio" && caption) {
        // Meta no acepta caption en audio: enviar audio + caption como 2 mensajes
        await sendMessage({
          conversationId,
          mediaUrl: path,
          messageType: "audio",
        });
        await sendMessage({
          conversationId,
          body: caption,
          messageType: "text",
        });
      } else {
        await sendMessage({
          conversationId,
          body: caption || undefined,
          mediaUrl: path,
          messageType: kind,
        });
      }

      setBody("");
      toast.success("Archivo enviado", { id: uploadToastId });
      onSent?.();
    } catch (e) {
      console.error("[MessageComposer] file send failed:", e);
      const msg =
        e instanceof MediaUploadError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Error desconocido";
      toast.error("No se pudo enviar el archivo", {
        id: uploadToastId,
        description: msg,
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleQuickReplyPick = (content: string) => {
    setBody((prev) => (prev ? `${prev}\n\n${content}` : content));
    // Focus + caret al final (con timeout porque el popover cierra primero)
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    });
  };

  const showHandoffHint = conversationStatus === "bot_active";

  return (
    <div className="border-t bg-card">
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-end gap-2">
          {/* Quick reply picker */}
          <QuickReplyPicker
            organizationId={organizationId}
            disabled={isSending}
            onPick={handleQuickReplyPick}
          />

          {/* Adjuntar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-10 w-10"
                disabled={isSending}
              >
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Adjuntar archivo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                Imagen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pdfInputRef.current?.click()}>
                Documento (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
                Audio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file inputs disparados por el dropdown */}
          <input
            ref={imageInputRef}
            type="file"
            accept={FILE_ACCEPT.image}
            hidden
            onChange={handleFileSelected}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept={FILE_ACCEPT.document}
            hidden
            onChange={handleFileSelected}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept={FILE_ACCEPT.audio}
            hidden
            onChange={handleFileSelected}
          />

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribir mensaje..."
            rows={1}
            className={cn(
              "resize-none min-h-10 max-h-32 py-2.5",
              "focus-visible:ring-1",
            )}
            disabled={isSending}
          />

          {/* Send */}
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 h-10 w-10"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span className="sr-only">Enviar</span>
          </Button>
        </div>

        {showHandoffHint && (
          <p className="text-xs text-muted-foreground text-center">
            Al escribir, tomarás control del chat
          </p>
        )}
      </div>
    </div>
  );
}
