/**
 * quickRepliesApi — CRUD tipado sobre la tabla `quick_replies`.
 *
 * Sprint 4 (Centro de Atencion). Usa supabase-js directo — RLS cubre todo
 * el envelope de seguridad (SELECT/INSERT/UPDATE por org members, DELETE solo
 * admin). El constraint CHECK valida la categoria a nivel Postgres.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type QuickReply = Database["public"]["Tables"]["quick_replies"]["Row"];
export type QuickReplyInsert =
  Database["public"]["Tables"]["quick_replies"]["Insert"];
export type QuickReplyUpdate =
  Database["public"]["Tables"]["quick_replies"]["Update"];

export type QuickReplyCategory =
  | "direccion"
  | "horarios"
  | "pago"
  | "pre_cita"
  | "post_cita"
  | "otro";

export const QUICK_REPLY_CATEGORIES: QuickReplyCategory[] = [
  "direccion",
  "horarios",
  "pago",
  "pre_cita",
  "post_cita",
  "otro",
];

export const QUICK_REPLY_CATEGORY_LABELS: Record<QuickReplyCategory, string> = {
  direccion: "Dirección",
  horarios: "Horarios",
  pago: "Pago",
  pre_cita: "Antes de la cita",
  post_cita: "Después de la cita",
  otro: "Otro",
};

interface ListOptions {
  /** Si true, solo retorna is_active=true. Default false (todos). */
  onlyActive?: boolean;
}

export async function listQuickReplies(
  organizationId: string,
  opts: ListOptions = {},
): Promise<QuickReply[]> {
  let query = supabase
    .from("quick_replies")
    .select("*")
    .eq("organization_id", organizationId);

  if (opts.onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las respuestas rápidas: ${error.message}`);
  }
  return data ?? [];
}

export async function createQuickReply(
  input: QuickReplyInsert,
): Promise<QuickReply> {
  const { data, error } = await supabase
    .from("quick_replies")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo crear la respuesta: ${error.message}`);
  }
  return data;
}

export async function updateQuickReply(
  id: string,
  patch: QuickReplyUpdate,
): Promise<QuickReply> {
  const { data, error } = await supabase
    .from("quick_replies")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar la respuesta: ${error.message}`);
  }
  return data;
}

export async function deleteQuickReply(id: string): Promise<void> {
  const { error } = await supabase.from("quick_replies").delete().eq("id", id);
  if (error) {
    // El RLS DELETE policy es admin-only; si el user no es admin, falla aqui.
    throw new Error(`No se pudo eliminar la respuesta: ${error.message}`);
  }
}
