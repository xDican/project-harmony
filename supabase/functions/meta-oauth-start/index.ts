import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { redirect_uri } = await req.json()
    if (!redirect_uri) {
      return new Response(JSON.stringify({ error: 'redirect_uri is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const appId = Deno.env.get('META_APP_ID')
    const graphVersion = Deno.env.get('META_GRAPH_VERSION') || 'v21.0'

    if (!appId) {
      return new Response(JSON.stringify({ error: 'META_APP_ID not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate random state
    const stateBytes = new Uint8Array(32)
    crypto.getRandomValues(stateBytes)
    const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('')

    // Store state in DB for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { error: insertError } = await supabase
      .from('meta_oauth_states')
      .insert({ state })

    if (insertError) {
      console.error('Failed to store state:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to initialize OAuth' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const scopes = 'whatsapp_business_management,whatsapp_business_messaging'
    const authorizeUrl = `https://www.facebook.com/${graphVersion}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`

    return new Response(JSON.stringify({ authorize_url: authorizeUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('meta-oauth-start error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
