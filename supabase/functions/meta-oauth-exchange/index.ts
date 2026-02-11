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
    const { code, state, redirect_uri } = await req.json()

    if (!code || !state || !redirect_uri) {
      return new Response(JSON.stringify({ connected: false, error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Validate state
    const { data: stateRow, error: stateError } = await supabase
      .from('meta_oauth_states')
      .select('id, used_at')
      .eq('state', state)
      .maybeSingle()

    if (stateError || !stateRow) {
      return new Response(JSON.stringify({ connected: false, error: 'Invalid or expired state' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (stateRow.used_at) {
      return new Response(JSON.stringify({ connected: false, error: 'State already used' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark state as used
    await supabase
      .from('meta_oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('id', stateRow.id)

    // Exchange code for access token
    const appId = Deno.env.get('META_APP_ID')!
    const appSecret = Deno.env.get('META_APP_SECRET')!
    const graphVersion = Deno.env.get('META_GRAPH_VERSION') || 'v21.0'

    const tokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`

    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return new Response(JSON.stringify({ connected: false, error: tokenData.error?.message || 'Token exchange failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For now store with a placeholder doctor_id — in production this should come from the authenticated user
    // We'll use the auth header if present to identify the doctor
    let doctorId: string | null = null

    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await userSupabase.from('users').select('doctor_id').single()
      doctorId = userData?.doctor_id || null
    }

    if (!doctorId) {
      // Fallback: get first doctor (for development/review)
      const { data: firstDoctor } = await supabase.from('doctors').select('id').limit(1).single()
      doctorId = firstDoctor?.id || null
    }

    if (!doctorId) {
      return new Response(JSON.stringify({ connected: false, error: 'No doctor found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upsert meta connection
    const { error: upsertError } = await supabase
      .from('meta_connections')
      .upsert({
        doctor_id: doctorId,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'bearer',
        expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'doctor_id' })

    if (upsertError) {
      console.error('Failed to store connection:', upsertError)
      return new Response(JSON.stringify({ connected: false, error: 'Failed to store connection' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ connected: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('meta-oauth-exchange error:', err)
    return new Response(JSON.stringify({ connected: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
