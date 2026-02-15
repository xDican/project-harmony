import { supabase } from "@/integrations/supabase/client";
import type { BotFAQ, BotFAQInsert, BotFAQUpdate } from "@/types/bot.types";

/**
 * Get all FAQs for a specific scope (organization, clinic, or doctor)
 * Results are sorted by scope_priority (doctor > clinic > org) and display_order
 */
export async function getFAQs(params: {
  organizationId: string;
  clinicId?: string;
  doctorId?: string;
  includeInactive?: boolean;
}): Promise<BotFAQ[]> {
  const { organizationId, clinicId, doctorId, includeInactive = false } = params;

  let query = supabase
    .from("bot_faqs")
    .select("*")
    .eq("organization_id", organizationId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  // FIXED: Apply scope filtering correctly
  // If doctor_id is provided, get doctor + clinic + org FAQs
  if (doctorId) {
    // Get FAQs where:
    // 1. doctor_id matches (doctor-level)
    // 2. clinic_id matches AND doctor_id is null (clinic-level)
    // 3. Both doctor_id and clinic_id are null (org-level)
    query = query.or(
      `doctor_id.eq.${doctorId},and(clinic_id.eq.${clinicId || "null"},doctor_id.is.null),and(doctor_id.is.null,clinic_id.is.null)`
    );
  }
  // If only clinic_id is provided, get clinic + org FAQs
  else if (clinicId) {
    query = query.or(
      `and(clinic_id.eq.${clinicId},doctor_id.is.null),and(doctor_id.is.null,clinic_id.is.null)`
    );
  }
  // Otherwise, get only org-level FAQs (both null)
  else {
    query = query.is("doctor_id", null).is("clinic_id", null);
  }

  const { data, error } = await query
    .order("scope_priority", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching FAQs:", error);
    throw error;
  }

  return data as BotFAQ[];
}

/**
 * Get a single FAQ by ID
 */
export async function getFAQById(id: string): Promise<BotFAQ | null> {
  const { data, error } = await supabase.from("bot_faqs").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("Error fetching FAQ by ID:", error);
    throw error;
  }

  return data as BotFAQ | null;
}

/**
 * Create a new FAQ
 */
export async function createFAQ(faq: BotFAQInsert): Promise<BotFAQ> {
  const { data, error } = await supabase.from("bot_faqs").insert(faq).select().single();

  if (error) {
    console.error("Error creating FAQ:", error);
    throw error;
  }

  return data as BotFAQ;
}

/**
 * Update an existing FAQ
 */
export async function updateFAQ(id: string, updates: BotFAQUpdate): Promise<BotFAQ> {
  const { data, error } = await supabase.from("bot_faqs").update(updates).eq("id", id).select().single();

  if (error) {
    console.error("Error updating FAQ:", error);
    throw error;
  }

  return data as BotFAQ;
}

/**
 * Delete a FAQ (soft delete by setting is_active = false)
 */
export async function deleteFAQ(id: string, hard: boolean = false): Promise<void> {
  if (hard) {
    const { error } = await supabase.from("bot_faqs").delete().eq("id", id);

    if (error) {
      console.error("Error hard deleting FAQ:", error);
      throw error;
    }
  } else {
    const { error } = await supabase.from("bot_faqs").update({ is_active: false }).eq("id", id);

    if (error) {
      console.error("Error soft deleting FAQ:", error);
      throw error;
    }
  }
}

/**
 * Search FAQs by keywords or question text
 * Uses fuzzy matching on keywords array and question text
 */
export async function searchFAQs(params: {
  organizationId: string;
  clinicId?: string;
  doctorId?: string;
  searchTerm: string;
}): Promise<BotFAQ[]> {
  const { organizationId, clinicId, doctorId, searchTerm } = params;

  // First, get all applicable FAQs
  const faqs = await getFAQs({ organizationId, clinicId, doctorId });

  if (!searchTerm || searchTerm.trim().length === 0) {
    return faqs;
  }

  const searchLower = searchTerm.toLowerCase().trim();
  const searchWords = searchLower.split(/\s+/);

  // Score each FAQ based on keyword matches and question similarity
  const scoredFAQs = faqs.map((faq) => {
    let score = 0;

    // Check question text similarity
    const questionLower = faq.question.toLowerCase();
    if (questionLower.includes(searchLower)) {
      score += 10; // Exact phrase match in question
    } else {
      // Partial word matches in question
      searchWords.forEach((word) => {
        if (questionLower.includes(word)) {
          score += 2;
        }
      });
    }

    // Check keyword matches
    const keywordsLower = faq.keywords.map((k) => k.toLowerCase());
    keywordsLower.forEach((keyword) => {
      if (keyword === searchLower) {
        score += 15; // Exact keyword match
      } else if (searchWords.some((word) => keyword.includes(word) || word.includes(keyword))) {
        score += 5; // Partial keyword match
      }
    });

    // Check answer text (lower weight)
    const answerLower = faq.answer.toLowerCase();
    if (answerLower.includes(searchLower)) {
      score += 3;
    }

    return { faq, score };
  });

  // Filter out FAQs with no matches and sort by score descending
  return scoredFAQs
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      // First sort by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then by scope priority (doctor > clinic > org)
      if (a.faq.scope_priority !== b.faq.scope_priority) {
        return a.faq.scope_priority - b.faq.scope_priority;
      }
      // Finally by display order
      return a.faq.display_order - b.faq.display_order;
    })
    .map((item) => item.faq);
}

/**
 * Bulk update display order for multiple FAQs
 */
export async function reorderFAQs(updates: Array<{ id: string; display_order: number }>): Promise<void> {
  const promises = updates.map(({ id, display_order }) =>
    supabase.from("bot_faqs").update({ display_order }).eq("id", id)
  );

  const results = await Promise.all(promises);

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("Error reordering FAQs:", errors);
    throw new Error(`Failed to reorder ${errors.length} FAQ(s)`);
  }
}

/**
 * Get default FAQs for a new organization (useful for seeding)
 */
export function getDefaultFAQs(organizationId: string): BotFAQInsert[] {
  return [
    {
      organization_id: organizationId,
      scope_priority: 3,
      question: "¿Cuál es el horario de atención?",
      answer:
        "Nuestro horario de atención es de lunes a viernes de 9:00 AM a 6:00 PM. Para emergencias fuera de horario, por favor comuníquese con nuestra línea de emergencias.",
      keywords: ["horario", "atención", "horas", "emergencia"],
      display_order: 1,
    },
    {
      organization_id: organizationId,
      scope_priority: 3,
      question: "¿Cómo puedo cancelar mi cita?",
      answer:
        'Puede cancelar su cita a través de este mismo chat seleccionando la opción "Reagendar o Cancelar" en el menú principal. También puede llamarnos directamente.',
      keywords: ["cancelar", "cita", "reagendar", "cambiar"],
      display_order: 2,
    },
    {
      organization_id: organizationId,
      scope_priority: 3,
      question: "¿Aceptan seguros médicos?",
      answer:
        "Sí, aceptamos la mayoría de los seguros médicos. Por favor contacte a nuestra secretaria para verificar su plan específico.",
      keywords: ["seguro", "médico", "plan", "cobertura", "pago"],
      display_order: 3,
    },
  ];
}
