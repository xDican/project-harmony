/**
 * MessageBubble — renderer de un mensaje en el timeline.
 *
 * Sprint 3 Fase 3.
 *
 * Por source:
 *   - patient: burbuja blanca a la izquierda
 *   - bot: burbuja verde-claro a la derecha + etiqueta "ASISTENTE VIRTUAL"
 *   - assistant: burbuja verde-oscuro a la derecha + etiqueta "TÚ" o nombre
 *   - template/system: similar a bot pero distinguible
 *
 * Por message_type:
 *   - text: body en parrafo
 *   - audio: AudioMessagePlayer con transcripcion
 *   - image: thumbnail clickable (Dialog modal con full + descargar)
 *   - document: card con icono + descargar
 *   - voice_call: placeholder con duracion (Sprint 6 amplia)
 *
 * Footer: hora + palomitas para outbound.
 */

import { useEffect, useState } from "react";
import { Bot, FileText, PhoneIncoming, PhoneOutgoing, PhoneMissed, Check, CheckCheck, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { MessageRow } from "@/hooks/useConversationMessages";
import { AudioMessagePlayer } from "./AudioMessagePlayer";

interface MessageBubbleProps {
  message: MessageRow;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isPatient = message.source === "patient";
  const isBot = message.source === "bot";
  const isAssistant = message.source === "assistant";

  return (
    <div className={cn("flex w-full mb-3", isPatient ? "justify-start" : "justify-end")}>
      <div className={cn("flex flex-col max-w-[78%] sm:max-w-[70%]", !isPatient && "items-end")}>
        {/* Etiqueta arriba (solo bot/assistant) */}
        {isBot && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1 px-3">
            <Bot className="h-3.5 w-3.5" />
            <span>ASISTENTE VIRTUAL</span>
          </div>
        )}
        {isAssistant && (
          <div className="text-xs font-medium text-primary mb-1 px-3">
            Tú
          </div>
        )}

        {/* Burbuja */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 shadow-sm",
            isPatient && "bg-card border rounded-tl-sm",
            isBot && "bg-primary/10 border border-primary/20 rounded-tr-sm",
            isAssistant && "bg-primary text-primary-foreground rounded-tr-sm",
            !isPatient && !isBot && !isAssistant && "bg-muted",
          )}
        >
          <MessageContent message={message} isOutbound={!isPatient} />

          {/* Footer: hora + palomitas */}
          <div
            className={cn(
              "flex items-center gap-1 justify-end mt-1 text-[10px]",
              isPatient && "text-muted-foreground",
              isBot && "text-muted-foreground",
              isAssistant && "text-primary-foreground/70",
            )}
          >
            <span>{formatTime(message.created_at)}</span>
            {!isPatient && <StatusTicks status={message.status} isAssistant={isAssistant} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageContent({
  message,
  isOutbound,
}: {
  message: MessageRow;
  isOutbound: boolean;
}) {
  const { message_type, body, media_url, transcription } = message;

  if (message_type === "audio") {
    // Estado "procesando": placeholder meta-media:* sin transcripcion todavia
    const isProcessing =
      !media_url ||
      (media_url.startsWith("meta-media:") && transcription === null);
    return (
      <AudioMessagePlayer
        storagePath={media_url}
        transcription={transcription}
        isProcessing={isProcessing}
      />
    );
  }

  if (message_type === "image") {
    return <ImageBubbleContent storagePath={media_url} caption={body} isOutbound={isOutbound} />;
  }

  if (message_type === "document") {
    return <DocumentBubbleContent storagePath={media_url} caption={body} isOutbound={isOutbound} />;
  }

  if (message_type === "voice_call") {
    return <VoiceCallBubbleContent message={message} isOutbound={isOutbound} />;
  }

  // text (default)
  return (
    <p className={cn("text-sm whitespace-pre-wrap break-words leading-relaxed")}>
      {body || ""}
    </p>
  );
}

function ImageBubbleContent({
  storagePath,
  caption,
  isOutbound,
}: {
  storagePath: string | null;
  caption: string | null;
  isOutbound: boolean;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!storagePath || storagePath.startsWith("meta-media:")) return;
    let cancelled = false;
    supabase.storage
      .from("conversation-media")
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const isProcessing = !storagePath || storagePath.startsWith("meta-media:");

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 text-sm py-2">
        <ImageIcon className="h-4 w-4" />
        <span className={cn(isOutbound && "text-primary-foreground/80")}>
          Procesando imagen...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {signedUrl ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/40 transition-colors"
        >
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img
            src={signedUrl}
            alt="Imagen del paciente"
            className="max-w-full max-h-64 object-cover"
            loading="lazy"
          />
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm py-2">
          <ImageIcon className="h-4 w-4" />
          <span>Cargando imagen...</span>
        </div>
      )}

      {caption && (
        <p className={cn(
          "text-sm whitespace-pre-wrap break-words leading-relaxed",
        )}>
          {caption}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Vista completa de imagen</DialogTitle>
          </VisuallyHidden>
          {signedUrl && (
            <img
              src={signedUrl}
              alt="Imagen completa"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentBubbleContent({
  storagePath,
  caption,
  isOutbound,
}: {
  storagePath: string | null;
  caption: string | null;
  isOutbound: boolean;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath || storagePath.startsWith("meta-media:")) return;
    let cancelled = false;
    supabase.storage
      .from("conversation-media")
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const isProcessing = !storagePath || storagePath.startsWith("meta-media:");
  const filename = caption || extractFilename(storagePath) || "Documento";

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 text-sm py-2">
        <FileText className="h-4 w-4" />
        <span className={cn(isOutbound && "text-primary-foreground/80")}>
          Procesando documento...
        </span>
      </div>
    );
  }

  return (
    <a
      href={signedUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 py-1.5 hover:underline",
        !signedUrl && "pointer-events-none opacity-60",
      )}
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm truncate">{filename}</span>
    </a>
  );
}

/**
 * Card para mensaje voice_call. Muestra direccion, estado, duracion.
 * Sprint 6 — Calling API.
 */
function VoiceCallBubbleContent({
  message,
  isOutbound,
}: {
  message: MessageRow;
  isOutbound: boolean;
}) {
  const { call_status, call_direction, call_duration_seconds } = message;

  // Estado visible al usuario
  const isMissed = call_status === "missed";
  const isRejected = call_status === "rejected";
  const isFailed = call_status === "failed";
  const isCompleted = call_status === "ended" || call_status === "accepted" || call_status === "connected";

  // Icono direccional
  const IconComp = isMissed
    ? PhoneMissed
    : call_direction === "outbound"
      ? PhoneOutgoing
      : PhoneIncoming;

  const iconColorClass = isMissed
    ? "text-destructive"
    : isRejected || isFailed
      ? cn(isOutbound && "text-primary-foreground/70", !isOutbound && "text-muted-foreground")
      : cn(isOutbound && "text-primary-foreground", !isOutbound && "text-primary");

  // Titulo
  let title: string;
  if (call_direction === "outbound") {
    title = isMissed ? "Llamada saliente sin respuesta" : "Llamada saliente";
  } else {
    title = isMissed ? "Llamada perdida" : "Llamada entrante";
  }

  // Subtitulo
  let subtitle: string;
  if (isCompleted && call_duration_seconds && call_duration_seconds > 0) {
    subtitle = `Duración ${formatDuration(call_duration_seconds)}`;
  } else if (isRejected) {
    subtitle = "Rechazada";
  } else if (isFailed) {
    subtitle = "Falló";
  } else if (isMissed) {
    subtitle = "No respondida";
  } else if (call_status === "ringing") {
    subtitle = "Sonando…";
  } else {
    subtitle = "";
  }

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <div className={cn("rounded-full p-2 bg-background/50", iconColorClass)}>
        <IconComp className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        {subtitle && (
          <span
            className={cn(
              "text-xs",
              isMissed && "text-destructive",
              !isMissed && isOutbound && "text-primary-foreground/70",
              !isMissed && !isOutbound && "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusTicks({
  status,
  isAssistant,
}: {
  status: string | null;
  isAssistant: boolean;
}) {
  const tintClass = isAssistant ? "text-primary-foreground/70" : "text-muted-foreground";
  const readClass = "text-sky-400";

  if (status === "sending") {
    // Spinner pequeño en lugar de check opaco — feedback de "en vuelo"
    return (
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin",
          tintClass,
        )}
        aria-label="Enviando"
      />
    );
  }
  if (!status || status === "queued") {
    return <Check className={cn("h-3 w-3 opacity-60", tintClass)} />;
  }
  if (status === "sent") return <Check className={cn("h-3 w-3", tintClass)} />;
  if (status === "delivered") return <CheckCheck className={cn("h-3 w-3", tintClass)} />;
  if (status === "read") return <CheckCheck className={cn("h-3 w-3", readClass)} />;
  if (status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-destructive text-[10px] font-medium"
        title="No se pudo enviar"
      >
        ⚠ Fallido
      </span>
    );
  }
  return null;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function extractFilename(path: string | null): string | null {
  if (!path) return null;
  return path.split("/").pop() || null;
}
