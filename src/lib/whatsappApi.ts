import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://soxrlxvivuplezssgssq.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHJseHZpdnVwbGV6c3Nnc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTMyMTEsImV4cCI6MjA3OTA4OTIxMX0.1w7xGqP6GBi7NcP6a5vDGwTZQWCvZ5wsykIwLz6hk9U';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  body: string;
  status: string;
  updated_at: string;
}

interface ApiResult<T> {
  data: T | null;
  error: string | null;
  isMockMode: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

// ─── OAuth ───────────────────────────────────────────────

export async function startOAuth(redirectUri: string): Promise<ApiResult<{ authorize_url: string }>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/meta-oauth-start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return { data, error: null, isMockMode: false };
  } catch (e: any) {
    return { data: null, error: e.message || 'Error al iniciar conexión con Meta', isMockMode: false };
  }
}

export async function exchangeOAuth(code: string, state: string, redirectUri: string): Promise<ApiResult<{ connected: boolean }>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/meta-oauth-exchange`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return { data, error: null, isMockMode: false };
  } catch (e: any) {
    return { data: null, error: e.message || 'Error al completar la conexión', isMockMode: false };
  }
}

// ─── Mock helpers (fallback only for 404) ────────────────

const MOCK_STORAGE_KEY = 'whatsapp_templates_mock';

function getMockTemplates(): WhatsAppTemplate[] {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMockTemplates(templates: WhatsAppTemplate[]) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(templates));
}

export function getTemplateById(id: string): WhatsAppTemplate | null {
  const templates = getMockTemplates();
  return templates.find(t => t.id === id) ?? null;
}

// ─── Templates ───────────────────────────────────────────

export async function listTemplates(): Promise<ApiResult<WhatsAppTemplate[]>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates-list`, {
      method: 'GET',
      headers,
    });
    if (res.status === 404) {
      return { data: getMockTemplates(), error: null, isMockMode: true };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: `Error ${res.status}: ${text || res.statusText}`, isMockMode: false };
    }
    const data = await res.json();
    return { data: data.templates ?? data, error: null, isMockMode: false };
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error', isMockMode: false };
  }
}

export async function createTemplate(template: Omit<WhatsAppTemplate, 'id' | 'status' | 'updated_at'>): Promise<ApiResult<WhatsAppTemplate>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates-create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(template),
    });
    if (res.status === 404) {
      const newTemplate: WhatsAppTemplate = {
        id: crypto.randomUUID(),
        ...template,
        status: 'borrador',
        updated_at: new Date().toISOString(),
      };
      const existing = getMockTemplates();
      existing.push(newTemplate);
      saveMockTemplates(existing);
      return { data: newTemplate, error: null, isMockMode: true };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: `Error ${res.status}: ${text || res.statusText}`, isMockMode: false };
    }
    const data = await res.json();
    return { data: data.template ?? data, error: null, isMockMode: false };
  } catch (e: any) {
    return { data: null, error: e.message || 'Network error', isMockMode: false };
  }
}

export async function getTemplate(id: string): Promise<ApiResult<WhatsAppTemplate>> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/templates-get?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers,
    });
    if (res.status === 404) {
      const local = getTemplateById(id);
      return { data: local, error: local ? null : 'Template not found', isMockMode: !!local };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: `Error ${res.status}: ${text || res.statusText}`, isMockMode: false };
    }
    const data = await res.json();
    return { data: data.template ?? data, error: null, isMockMode: false };
  } catch (e: any) {
    const local = getTemplateById(id);
    return { data: local, error: local ? null : (e.message || 'Network error'), isMockMode: !!local };
  }
}
