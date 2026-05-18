/**
 * OpenAI Whisper API helper.
 * Sprint 2 MVP Centro de Atencion.
 *
 * Transcribe audio bytes a texto. Honduras → forzamos idioma `es` para
 * mejor precision con acentos locales (evita auto-detect que a veces
 * trata audios cortos como ingles).
 *
 * Pricing: $0.006/min de audio. Audios WhatsApp tipicos 30s → $0.003/audio.
 */

import { extFromMime } from "./meta-media.ts";

const WHISPER_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_MODEL = "whisper-1";

/**
 * Transcribe audio bytes via Whisper API.
 * Retorna { text } o null si falla (no throw).
 *
 * mime: el MIME del audio (`audio/ogg`, `audio/mp4`, etc.). Whisper auto-detecta
 *       formato pero la extension correcta en filename ayuda.
 */
export async function transcribeAudio(
  bytes: Uint8Array,
  mime: string,
  openaiApiKey: string,
): Promise<{ text: string } | null> {
  if (!openaiApiKey) {
    console.error("[whisper] OPENAI_API_KEY not configured");
    return null;
  }

  try {
    const ext = extFromMime(mime);
    const blob = new Blob([bytes], { type: mime });

    const formData = new FormData();
    formData.append("file", blob, `audio.${ext}`);
    formData.append("model", WHISPER_MODEL);
    formData.append("language", "es");
    formData.append("response_format", "json");

    const res = await fetch(WHISPER_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[whisper] transcribeAudio failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    if (typeof data.text !== "string") {
      console.error("[whisper] transcribeAudio: no text in response", data);
      return null;
    }

    const trimmed = data.text.trim();
    if (!trimmed) {
      console.warn("[whisper] transcribeAudio: empty transcription");
      return null;
    }

    return { text: trimmed };
  } catch (e) {
    console.error("[whisper] transcribeAudio exception:", e);
    return null;
  }
}
