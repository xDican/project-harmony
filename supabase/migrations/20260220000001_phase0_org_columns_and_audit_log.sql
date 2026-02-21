-- ============================================================
-- Phase 0.1: Columnas operativas en organizations
-- Backward-compatible: defaults aseguran que orgs existentes
-- sigan funcionando sin cambios (messaging_enabled=true, status='active')
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN onboarding_status TEXT DEFAULT 'active'
    CHECK (onboarding_status IN ('new','setup_in_progress','ready_to_activate','active','suspended')),
  ADD COLUMN billing_status TEXT DEFAULT 'manual_paid'
    CHECK (billing_status IN ('unpaid','manual_paid','trial','stripe_active','past_due')),
  ADD COLUMN messaging_enabled BOOLEAN DEFAULT true,
  ADD COLUMN daily_message_cap INTEGER DEFAULT 250,
  ADD COLUMN monthly_message_cap INTEGER DEFAULT 5000;

-- ============================================================
-- Phase 0.2: Tabla activation_audit_log
-- Solo accesible via service_role (RLS habilitado, sin policies de cliente)
-- ============================================================
CREATE TABLE activation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  action TEXT NOT NULL CHECK (action IN ('activate','suspend','enable_messaging','disable_messaging','update_caps','note')),
  performed_by UUID REFERENCES auth.users(id),
  performed_by_email TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activation_audit_log ENABLE ROW LEVEL SECURITY;
-- Sin policies: solo service_role puede acceder (bypasses RLS)
