/**
 * AudioMessagePlayer — player de audio + transcripcion automatica.
 *
 * Sprint 3 Fase 3.
 *
 * Genera signed URL del path en Storage (bucket conversation-media) y
 * reproduce con HTML5 audio. UI custom (no controls nativos) para coincidir
 * con el mockup limpio: boton play + barra progreso + duracion.
 *
 * Si `transcription` esta presente, la muestra debajo del player con label
 * claro de que es procesada por IA. Si esta null y message_type='audio',
 * muestra "Transcribiendo..." (Whisper esta procesando).
 */

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AudioMessagePlayerProps {
  storagePath: string | null;
  transcription: string | null;
  /** true mientras Whisper todavia esta procesando (sin transcripcion ni Storage) */
  isProcessing: boolean;
}

export function AudioMessagePlayer({
  storagePath,
  transcription,
  isProcessing,
}: AudioMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);

  // Generar signed URL al montar (path → URL servible 1h)
  useEffect(() => {
    if (!storagePath || storagePath.startsWith("meta-media:")) {
      // Audio sin procesar todavia o no tiene path Storage real
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("conversation-media")
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          console.error("[AudioMessagePlayer] signed URL failed:", error?.message);
          setLoadError(true);
          return;
        }
        setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !signedUrl) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((e) => console.error("[AudioMessagePlayer] play failed:", e));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Estado mientras el audio todavia se esta descargando/procesando
  if (isProcessing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Procesando audio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-sm">
      {/* Player */}
      <div className="flex items-center gap-3 bg-background/50 rounded-lg px-3 py-2 border">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!signedUrl}
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Barra de progreso clickeable */}
          <div
            className="h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer relative"
            onClick={handleSeek}
            role="slider"
            aria-label="Posicion del audio"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Tiempos */}
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {loadError && (
          <span className="text-xs text-destructive">Error</span>
        )}
      </div>

      {/* Transcripcion (debajo del player) */}
      <TranscriptionDisplay transcription={transcription} />

      {/* Audio element invisible */}
      {signedUrl && (
        <audio
          ref={audioRef}
          src={signedUrl}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => setLoadError(true)}
        />
      )}
    </div>
  );
}

function TranscriptionDisplay({ transcription }: { transcription: string | null }) {
  if (transcription === null) {
    return (
      <div className="flex items-start gap-2 text-xs text-muted-foreground/80 italic">
        <Mic className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span className="opacity-70">Transcribiendo...</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-xs text-foreground/70 italic">
      <Mic className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary/60" />
      <span>{transcription}</span>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}
