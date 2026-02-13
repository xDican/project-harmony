-- STEP 5: Add RLS policies for new tables

-- organizations: members can view their own org
CREATE POLICY "Members can view own org" ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Admins can update own org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id IN (SELECT get_user_organizations(auth.uid()))
    AND has_org_role(auth.uid(), id, 'admin'::app_role));

-- clinics: org members can view
CREATE POLICY "Org members can view clinics" ON public.clinics
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Admins can manage clinics" ON public.clinics
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid()))
    AND has_org_role(auth.uid(), organization_id, 'admin'::app_role))
  WITH CHECK (organization_id IN (SELECT get_user_organizations(auth.uid()))
    AND has_org_role(auth.uid(), organization_id, 'admin'::app_role));

-- org_members: users can see members in their org
CREATE POLICY "View own org members" ON public.org_members
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

-- Deny client modifications (managed by edge functions)
CREATE POLICY "Deny client modifications to org_members" ON public.org_members
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Deny client updates to org_members" ON public.org_members
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Deny client deletes to org_members" ON public.org_members
  FOR DELETE TO authenticated USING (false);

-- calendars: org members can view
CREATE POLICY "Org members can view calendars" ON public.calendars
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Admin/secretary can manage calendars" ON public.calendars
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid()))
    AND (has_org_role(auth.uid(), organization_id, 'admin'::app_role)
      OR has_org_role(auth.uid(), organization_id, 'secretary'::app_role)))
  WITH CHECK (organization_id IN (SELECT get_user_organizations(auth.uid()))
    AND (has_org_role(auth.uid(), organization_id, 'admin'::app_role)
      OR has_org_role(auth.uid(), organization_id, 'secretary'::app_role)));

-- calendar_doctors: org members can view
CREATE POLICY "Org members can view calendar_doctors" ON public.calendar_doctors
  FOR SELECT TO authenticated
  USING (calendar_id IN (
    SELECT id FROM public.calendars
    WHERE organization_id IN (SELECT get_user_organizations(auth.uid()))
  ));

-- whatsapp_lines: org members can view, admins manage
CREATE POLICY "Org members can view whatsapp_lines" ON public.whatsapp_lines
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Admins can manage whatsapp_lines" ON public.whatsapp_lines
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT get_user_organizations(auth.uid()))
    AND has_org_role(auth.uid(), organization_id, 'admin'::app_role))
  WITH CHECK (organization_id IN (SELECT get_user_organizations(auth.uid()))
    AND has_org_role(auth.uid(), organization_id, 'admin'::app_role));

-- whatsapp_line_doctors: org members can view
CREATE POLICY "Org members can view whatsapp_line_doctors" ON public.whatsapp_line_doctors
  FOR SELECT TO authenticated
  USING (whatsapp_line_id IN (
    SELECT id FROM public.whatsapp_lines
    WHERE organization_id IN (SELECT get_user_organizations(auth.uid()))
  ));

-- bot_sessions: no client access (managed by edge functions with service role)
-- No SELECT/INSERT/UPDATE/DELETE policies needed for authenticated users
