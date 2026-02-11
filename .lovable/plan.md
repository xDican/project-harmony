

## Plan: Meta OAuth Flow - WhatsApp Settings and Callback Pages

### Overview
Create two new pages and two new edge functions to support the Meta App Review OAuth flow for WhatsApp Business integration.

### New Files

#### 1. `src/pages/WhatsAppSettings.tsx`
- Wrapped in `MainLayout`
- **Card "Meta Connection"**:
  - Reads `localStorage.getItem('meta_connected')` to show status badge ("Not connected" or "Connected")
  - "Connect WhatsApp Business" button that:
    1. Shows loading spinner
    2. Computes `redirectUri = window.location.origin + '/auth/meta/callback'`
    3. POSTs to `https://soxrlxvivuplezssgssq.supabase.co/functions/v1/meta-oauth-start` with `{ redirect_uri: redirectUri }`
    4. Parses `{ authorize_url }` from response
    5. Redirects via `window.location.href = authorize_url`
    6. On error: shows alert message
- **Card "Templates"**:
  - Disabled "Manage Templates" button
  - Helper text: "Coming next -- required for Meta review"

#### 2. `src/pages/MetaOAuthCallback.tsx`
- Minimal page (no MainLayout needed, just centered content)
- Reads URL params: `code`, `state`, `error`, `error_description`
- **Error flow**: If `error` param exists or `code`/`state` missing, show error message + "Back to WhatsApp Settings" link
- **Exchange flow**: If `code` and `state` present:
  1. Show "Connecting..." with spinner
  2. POST to `https://soxrlxvivuplezssgssq.supabase.co/functions/v1/meta-oauth-exchange` with `{ code, state, redirect_uri }`
  3. On success (`response.connected === true`): set `localStorage.setItem('meta_connected', 'true')`, show "Connected", navigate to `/settings/whatsapp` after 1.5s
  4. On failure: show error message + link back

#### 3. `supabase/functions/meta-oauth-start/index.ts`
- Receives `{ redirect_uri }` in POST body
- Reads secrets: `META_APP_ID`, `META_APP_SECRET` (already configured)
- Generates a random `state` value, stores it temporarily (or signs it)
- Builds Meta OAuth authorize URL with required scopes (`whatsapp_business_management`, `whatsapp_business_messaging`)
- Returns `{ authorize_url }`
- Includes CORS headers

#### 4. `supabase/functions/meta-oauth-exchange/index.ts`
- Receives `{ code, state, redirect_uri }` in POST body
- Validates `state`
- Exchanges `code` for access token via Meta Graph API
- Stores token securely in database (e.g., a `meta_connections` table or similar)
- Returns `{ connected: true }` on success, `{ connected: false, error: "..." }` on failure
- Never exposes the access token to the frontend
- Includes CORS headers

### Route Registration in `src/App.tsx`

Add two new routes:
```
/settings/whatsapp -> WhatsAppSettings (allowedRoles: ['admin', 'doctor'])
/auth/meta/callback -> MetaOAuthCallback (no role check needed, or all roles)
```

### MainLayout Updates

Add route title mapping:
- `/settings/whatsapp` -> `'WhatsApp Settings'`

### Edge Function Config

Update `supabase/config.toml` to disable JWT verification for both new functions (they handle auth internally or are part of the OAuth redirect flow):
```toml
[functions.meta-oauth-start]
verify_jwt = false

[functions.meta-oauth-exchange]
verify_jwt = false
```

### Database Migration

Create a table to store Meta connection data:
```sql
CREATE TABLE public.meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  access_token text NOT NULL,
  token_type text DEFAULT 'bearer',
  expires_at timestamptz,
  waba_id text,
  phone_number_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(doctor_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own connection"
  ON public.meta_connections FOR SELECT
  USING (doctor_id = public.current_doctor_id());
```

### Summary of Files

| File | Action |
|------|--------|
| `src/pages/WhatsAppSettings.tsx` | Create |
| `src/pages/MetaOAuthCallback.tsx` | Create |
| `supabase/functions/meta-oauth-start/index.ts` | Create |
| `supabase/functions/meta-oauth-exchange/index.ts` | Create |
| `src/App.tsx` | Add 2 routes |
| `src/components/MainLayout.tsx` | Add route title |
| `supabase/config.toml` | Add function configs |
| Database migration | Create `meta_connections` table |

