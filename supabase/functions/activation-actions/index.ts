import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // --- Auth ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(401, { error: 'UNAUTHORIZED' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json(401, { error: 'UNAUTHORIZED' });

  // Verify superadmin
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: isSuperadmin } = await adminClient.rpc('is_superadmin', { _user_id: user.id });
  if (!isSuperadmin) return json(403, { error: 'FORBIDDEN' });

  const url = new URL(req.url);

  // -------------------------------------------------------
  // GET /activation-actions — list orgs
  // Query params: onboarding_status?, messaging_enabled?
  // -------------------------------------------------------
  if (req.method === 'GET') {
    let query = adminClient
      .from('organizations')
      .select(`
        id,
        name,
        onboarding_status,
        billing_status,
        messaging_enabled,
        daily_message_cap,
        monthly_message_cap,
        created_at
      `)
      .order('created_at', { ascending: false });

    const statusFilter = url.searchParams.get('onboarding_status');
    if (statusFilter) query = query.eq('onboarding_status', statusFilter);

    const messagingFilter = url.searchParams.get('messaging_enabled');
    if (messagingFilter !== null) query = query.eq('messaging_enabled', messagingFilter === 'true');

    const { data: orgs, error } = await query;
    if (error) return json(500, { error: error.message });

    // Enrich with audit log (last 3 actions per org)
    const orgIds = orgs?.map((o: any) => o.id) ?? [];
    const auditMap: Record<string, any[]> = {};

    if (orgIds.length > 0) {
      const { data: logs } = await adminClient
        .from('activation_audit_log')
        .select('*')
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false });

      for (const log of logs ?? []) {
        if (!auditMap[log.organization_id]) auditMap[log.organization_id] = [];
        if (auditMap[log.organization_id].length < 3) {
          auditMap[log.organization_id].push(log);
        }
      }
    }

    const enriched = (orgs ?? []).map((org: any) => ({
      ...org,
      recent_audit: auditMap[org.id] ?? [],
    }));

    return json(200, { orgs: enriched });
  }

  // -------------------------------------------------------
  // POST /activation-actions — execute action
  // Body: { organization_id, action, details? }
  //   action: 'activate' | 'suspend' | 'enable_messaging' | 'disable_messaging' | 'update_caps' | 'note'
  //   details: { daily_message_cap?, monthly_message_cap?, note? }
  // -------------------------------------------------------
  if (req.method === 'POST') {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const { organization_id, action, details = {} } = body;

    if (!organization_id || !action) {
      return json(400, { error: 'organization_id and action are required' });
    }

    const validActions = ['activate', 'suspend', 'enable_messaging', 'disable_messaging', 'update_caps', 'note'];
    if (!validActions.includes(action)) {
      return json(400, { error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    // Build org update payload based on action
    const orgUpdate: Record<string, any> = {};

    switch (action) {
      case 'activate':
        orgUpdate.onboarding_status = 'active';
        orgUpdate.messaging_enabled = true;
        break;
      case 'suspend':
        orgUpdate.onboarding_status = 'suspended';
        orgUpdate.messaging_enabled = false;
        break;
      case 'enable_messaging':
        orgUpdate.messaging_enabled = true;
        break;
      case 'disable_messaging':
        orgUpdate.messaging_enabled = false;
        break;
      case 'update_caps':
        if (details.daily_message_cap !== undefined) orgUpdate.daily_message_cap = details.daily_message_cap;
        if (details.monthly_message_cap !== undefined) orgUpdate.monthly_message_cap = details.monthly_message_cap;
        break;
      case 'note':
        // No org update — just log
        break;
    }

    // Apply org update if needed
    if (Object.keys(orgUpdate).length > 0) {
      const { error: updateError } = await adminClient
        .from('organizations')
        .update(orgUpdate)
        .eq('id', organization_id);

      if (updateError) return json(500, { error: updateError.message });
    }

    // Write audit log
    const { error: logError } = await adminClient
      .from('activation_audit_log')
      .insert({
        organization_id,
        action,
        performed_by: user.id,
        performed_by_email: user.email,
        details,
      });

    if (logError) {
      console.error('Audit log error (non-fatal):', logError);
    }

    // Return updated org
    const { data: updatedOrg, error: fetchError } = await adminClient
      .from('organizations')
      .select('id, name, onboarding_status, billing_status, messaging_enabled, daily_message_cap, monthly_message_cap')
      .eq('id', organization_id)
      .single();

    if (fetchError) return json(500, { error: fetchError.message });

    return json(200, { org: updatedOrg, action_applied: action });
  }

  return json(405, { error: 'Method not allowed' });
});
