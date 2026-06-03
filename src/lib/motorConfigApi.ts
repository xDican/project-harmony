/**
 * motorConfigApi — CRUD tipado de la configuracion del Motor de Agendamiento
 * Multi-Recurso (Fase 3).
 *
 * Tres entidades, todas org-scoped (RLS via `get_user_organizations`):
 *   - resources           → recursos finitos (cabinas, equipos, salas) con `quantity`.
 *   - service_resources   → la RECETA: que recursos consume cada servicio (M2M + cantidad).
 *   - professional_services → la SKILL MATRIX: que servicios ejecuta cada profesional (M2M).
 *   - service_types (attrs) → buffer_minutes / price / requires_prior_consult.
 *
 * Acceso: Diego se loguea como el admin de la org del cliente (un admin por org;
 * ver estado-dev). El RLS permite todo a un miembro activo; el DELETE exige rol admin.
 * Por eso NO hay edge function: es el mismo camino org-scoped que serviceTypesApi.
 *
 * Recetas y skills se guardan con estrategia REEMPLAZO COMPLETO (borrar el set del
 * servicio/profesional + insertar el nuevo). Son sets chicos y son tablas de config
 * (no llevan historia que preservar). Recursos se dan de baja logica (is_active=false),
 * nunca DELETE, para no cascada-borrar las recetas que los referencian.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type ServiceTypeRow = Database["public"]["Tables"]["service_types"]["Row"];
export type DoctorRow = Database["public"]["Tables"]["doctors"]["Row"];

export type ResourceType = "equipment" | "room";

/** Snapshot completo de la config del motor para una org. */
export interface MotorBootstrap {
  resources: ResourceRow[];
  serviceTypes: ServiceTypeRow[];
  doctors: Pick<DoctorRow, "id" | "name" | "prefix" | "user_id">[];
  /** receta: service_type_id → [{ resourceId, quantityRequired }] */
  recipes: Record<string, { resourceId: string; quantityRequired: number }[]>;
  /** skills: doctor_id → Set<service_type_id> (solo activos) */
  skills: Record<string, string[]>;
}

/**
 * Carga todo lo que la pagina necesita para una org en pocas queries.
 * Incluye recursos inactivos (para poder reactivarlos) pero solo servicios activos.
 */
export async function loadMotorBootstrap(
  organizationId: string,
): Promise<MotorBootstrap> {
  const [resourcesRes, serviceTypesRes, doctorsRes, recipesRes, skillsRes] =
    await Promise.all([
      supabase
        .from("resources")
        .select("*")
        .eq("organization_id", organizationId)
        .order("display_name", { ascending: true }),
      supabase
        .from("service_types")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("doctors")
        .select("id, name, prefix, user_id")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      supabase
        .from("service_resources")
        .select("service_type_id, resource_id, quantity_required")
        .eq("organization_id", organizationId),
      supabase
        .from("professional_services")
        .select("doctor_id, service_type_id, is_active")
        .eq("organization_id", organizationId)
        .eq("is_active", true),
    ]);

  for (const res of [resourcesRes, serviceTypesRes, doctorsRes, recipesRes, skillsRes]) {
    if (res.error) {
      console.error("[loadMotorBootstrap] Error:", res.error);
      throw res.error;
    }
  }

  const recipes: MotorBootstrap["recipes"] = {};
  for (const row of recipesRes.data ?? []) {
    (recipes[row.service_type_id] ??= []).push({
      resourceId: row.resource_id,
      quantityRequired: row.quantity_required,
    });
  }

  const skills: MotorBootstrap["skills"] = {};
  for (const row of skillsRes.data ?? []) {
    (skills[row.doctor_id] ??= []).push(row.service_type_id);
  }

  return {
    resources: resourcesRes.data ?? [],
    serviceTypes: serviceTypesRes.data ?? [],
    doctors: doctorsRes.data ?? [],
    recipes,
    skills,
  };
}

// ---------------------------------------------------------------------------
// Recursos
// ---------------------------------------------------------------------------

export interface ResourceInput {
  displayName: string;
  resourceType: ResourceType;
  quantity: number;
}

/**
 * Crea o actualiza un recurso. `name` es la clave canonica en minusculas
 * (UNIQUE por org); `display_name` conserva el casing. Si `id` viene, actualiza.
 */
export async function saveResource(params: {
  organizationId: string;
  id?: string;
  input: ResourceInput;
}): Promise<ResourceRow> {
  const { organizationId, id, input } = params;
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("El nombre del recurso es obligatorio.");
  const quantity = Math.max(1, Math.floor(input.quantity || 1));

  if (id) {
    const { data, error } = await supabase
      .from("resources")
      .update({
        display_name: displayName,
        name: displayName.toLowerCase(),
        resource_type: input.resourceType,
        quantity,
      })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("resources")
    .insert({
      organization_id: organizationId,
      name: displayName.toLowerCase(),
      display_name: displayName,
      resource_type: input.resourceType,
      quantity,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(`Ya existe un recurso llamado "${displayName}".`);
    }
    throw error;
  }
  return data;
}

/** Activa/desactiva un recurso (baja logica). El motor solo cuenta los activos. */
export async function setResourceActive(params: {
  organizationId: string;
  id: string;
  isActive: boolean;
}): Promise<void> {
  const { organizationId, id, isActive } = params;
  const { error } = await supabase
    .from("resources")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Recetas (service_resources)
// ---------------------------------------------------------------------------

/**
 * Reemplaza la receta completa de un servicio: borra las filas existentes e
 * inserta el set nuevo. items vacio = el servicio no consume recursos (degrada).
 */
export async function setServiceRecipe(params: {
  organizationId: string;
  serviceTypeId: string;
  items: { resourceId: string; quantityRequired: number }[];
}): Promise<void> {
  const { organizationId, serviceTypeId, items } = params;

  const { error: delError } = await supabase
    .from("service_resources")
    .delete()
    .eq("service_type_id", serviceTypeId)
    .eq("organization_id", organizationId);
  if (delError) throw delError;

  if (items.length === 0) return;

  const rows = items.map((it) => ({
    organization_id: organizationId,
    service_type_id: serviceTypeId,
    resource_id: it.resourceId,
    quantity_required: Math.max(1, Math.floor(it.quantityRequired || 1)),
  }));

  const { error: insError } = await supabase
    .from("service_resources")
    .insert(rows);
  if (insError) throw insError;
}

// ---------------------------------------------------------------------------
// Skills (professional_services)
// ---------------------------------------------------------------------------

/**
 * Reemplaza el set de servicios que un profesional puede ejecutar: borra las
 * filas del profesional e inserta las seleccionadas. Set vacio = sin skills
 * declarados (el motor degrada a doctor-first si nadie tiene skills).
 */
export async function setProfessionalSkills(params: {
  organizationId: string;
  doctorId: string;
  serviceTypeIds: string[];
}): Promise<void> {
  const { organizationId, doctorId, serviceTypeIds } = params;

  const { error: delError } = await supabase
    .from("professional_services")
    .delete()
    .eq("doctor_id", doctorId)
    .eq("organization_id", organizationId);
  if (delError) throw delError;

  if (serviceTypeIds.length === 0) return;

  const rows = serviceTypeIds.map((stId) => ({
    organization_id: organizationId,
    doctor_id: doctorId,
    service_type_id: stId,
    is_active: true,
  }));

  const { error: insError } = await supabase
    .from("professional_services")
    .insert(rows);
  if (insError) throw insError;
}

// ---------------------------------------------------------------------------
// Atributos de servicio (buffer / precio / consulta previa)
// ---------------------------------------------------------------------------

export interface ServiceTypeAttrs {
  bufferMinutes: number;
  price: number | null;
  requiresPriorConsult: boolean;
}

export async function updateServiceTypeAttrs(params: {
  organizationId: string;
  serviceTypeId: string;
  attrs: ServiceTypeAttrs;
}): Promise<void> {
  const { organizationId, serviceTypeId, attrs } = params;
  const { error } = await supabase
    .from("service_types")
    .update({
      buffer_minutes: Math.max(0, Math.floor(attrs.bufferMinutes || 0)),
      price: attrs.price != null && attrs.price >= 0 ? attrs.price : null,
      requires_prior_consult: attrs.requiresPriorConsult,
    })
    .eq("id", serviceTypeId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
