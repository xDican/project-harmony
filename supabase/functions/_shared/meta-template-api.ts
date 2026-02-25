/**
 * Meta Graph API client for WhatsApp message template management.
 *
 * Used during Embedded Signup to create canonical templates in client WABAs,
 * and by check-template-status to poll approval status.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** Duplicate template error code from Meta */
const META_DUPLICATE_TEMPLATE_CODE = 2388023;

export interface CreateTemplateResult {
  ok: boolean;
  templateId?: string;
  status?: string;
  error?: string;
  alreadyExists?: boolean;
}

export interface TemplateStatusEntry {
  id: string;
  name: string;
  status: string;
}

/**
 * Create a message template in a WABA via Meta Graph API.
 * POST /{waba_id}/message_templates
 */
export async function createTemplateInWaba(
  wabaId: string,
  accessToken: string,
  name: string,
  language: string,
  category: string,
  components: unknown[],
): Promise<CreateTemplateResult> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, language, category, components }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.id) {
      return {
        ok: true,
        templateId: data.id,
        status: data.status || "PENDING",
      };
    }

    // Detect duplicate template error
    if (data.error?.code === META_DUPLICATE_TEMPLATE_CODE) {
      return {
        ok: false,
        alreadyExists: true,
        error: data.error.message || "Template already exists",
      };
    }

    return {
      ok: false,
      error: data.error?.message || `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get all template statuses from a WABA in a single API call.
 * GET /{waba_id}/message_templates?fields=name,status,id
 */
export async function getTemplateStatuses(
  wabaId: string,
  accessToken: string,
): Promise<TemplateStatusEntry[]> {
  const allTemplates: TemplateStatusEntry[] = [];
  let url: string | null = `${GRAPH_BASE}/${wabaId}/message_templates?fields=name,status,id&limit=100&access_token=${accessToken}`;

  while (url) {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.data) {
      console.error("[meta-template-api] Error fetching template statuses:", data.error?.message);
      break;
    }

    for (const t of data.data) {
      allTemplates.push({ id: t.id, name: t.name, status: t.status });
    }

    url = data.paging?.next ?? null;
  }

  return allTemplates;
}
