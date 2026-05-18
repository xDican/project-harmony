/**
 * MessageComposer — input para enviar mensajes desde el inbox.
 *
 * Sprint 3 Fase 3.
 *
 * Textarea expandible (1-5 filas), boton enviar (Send), boton adjuntar (Paperclip).
 *
 * Submit con Enter (Shift+Enter para nueva linea).
 * Hint debajo si conversation.status === 'bot_active': "Al escribir, tomaras
 * control del chat" — el backend hace auto-handoff cuando se envia.
 *
 * Adjuntar archivos: solo UI en Sprint 3 (dropdown con opciones). Upload real
 * en Sprint 4. Por ahora muestra toast "Disponible pronto".
 *
 * Optimistic: al enviar, se llama sendMessage() y on success el polling de
 * useConversationMessages levanta el mensaje real. El hook tambien permite
 * agregar mensaje optimistically antes de respuesta del servidor.
 */

import { useRef, useState } from "react";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendMessage } from "@/lib/inboxActions";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  conversationId: string;
  conversationStatus: "bot_active" | "human_active" | "closed" | "pending";
  /** Callback tras envio exitoso, para refrescar mensajes y conversation status */
  onSent?: () => void;
}

export function MessageComposer({
  conversationId,
  conversationStatus,
  onSent,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    const payload = trimmed;
    setBody(""); // clear immediately for snappy UX

    try {
      await sendMessage({
        conversationId,
        body: payload,
        messageType: "text",
      });
      onSent?.();
    } catch (e) {
      console.error("[MessageComposer] send failed:", e);
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("No se pudo enviar el mensaje", { description: msg });
      // Restaurar texto para que el usuario no lo pierda
      setBody(payload);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachmentClick = (type: string) => {
    toast.info("Adjuntar archivos disponible en Sprint 4", {
      description: `Tipo: ${type}`,
    });
  };

  const showHandoffHint = conversationStatus === "bot_active";

  return (
    <div className="border-t bg-card">
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-end gap-2">
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
              <DropdownMenuItem onClick={() => handleAttachmentClick("imagen")}>
                Imagen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAttachmentClick("documento")}>
                Documento (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAttachmentClick("audio")}>
                Audio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
