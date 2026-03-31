/**
 * Send Reminder Follow-up — Sends a second reminder to patients who received
 * the 24h reminder but did NOT confirm.
 *
 * Runs at 7:15 PM Honduras time (15 min after the evening send-reminders cron).
 * Only targets orgs with auto_cancel_enabled = true.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { formatTimeForTemplate, tomorrowHonduras } from "../_shared/datetime.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return jsonResponse(500, { ok: false, error: "Missing env vars" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

    const tomorrowDate = tomorrowHonduras();
    console.log("[send-reminder-followup] Looking for unconfirmed appointments on:", tomorrowDate);

    // Get orgs with auto-cancel enabled
    const { data: enabledOrgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("auto_cancel_enabled", true);

    const enabledOrgIds = (enabledOrgs ?? []).map((o: { id: string }) => o.id);

    if (enabledOrgIds.length === 0) {
      return jsonResponse(200, { ok: true, message: "No orgs with auto_cancel_enabled", sent: 0 });
    }

    // Get tomorrow's unconfirmed appointments that already received the first reminder
    // Only include appointments where the reminder was sent 4+ hours ago to avoid
    // follow-up arriving 15 min after the evening reminder (7pm → 7:15pm bug)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, date, time, organization_id")
      .eq("date", tomorrowDate)
      .eq("status", "agendada")
      .eq("reminder_24h_sent", true)
      .eq("reminder_followup_sent", false)
      .lt("reminder_24h_sent_at", fourHoursAgo)
      .in("organization_id", enabledOrgIds);

    if (error) {
      console.error("[send-reminder-followup] Error fetching appointments:", error);
      return jsonResponse(500, { ok: false, error: "Error fetching appointments" });
    }

    if (!appointments || appointments.length === 0) {
      console.log("[send-reminder-followup] No unconfirmed appointments found");
      return jsonResponse(200, { ok: true, message: "No follow-ups needed", sent: 0 });
    }

    console.log("[send-reminder-followup] Found", appointments.length, "unconfirmed appointments");

    let sent = 0;
    let failed = 0;

    for (const appt of appointments) {
      // Get patient
      const { data: patient } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("id", appt.patient_id)
        .single();

      if (!patient?.phone) {
        console.warn("[send-reminder-followup] No phone for patient:", appt.patient_id);
        failed++;
        continue;
      }

      // Get doctor
      const { data: doctor } = await supabase
        .from("doctors")
        .select("id, name, prefix")
        .eq("id", appt.doctor_id)
        .single();

      if (!doctor) {
        failed++;
        continue;
      }

      const doctorDisplayName = doctor.prefix ? `${doctor.prefix} ${doctor.name}` : `Dr. ${doctor.name}`;
      const formattedTime = formatTimeForTemplate(appt.time);

      // Send follow-up via messaging-gateway (3 params: patient, time, doctor)
      try {
        const res = await fetch(gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
            "x-internal-secret": internalSecret,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            to: normalizeToE164(patient.phone),
            type: "reminder_followup",
            templateParams: {
              "1": patient.name,
              "2": formattedTime,
              "3": doctorDisplayName,
            },
            appointmentId: appt.id,
            patientId: patient.id,
            doctorId: doctor.id,
            organizationId: appt.organization_id,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          await supabase
            .from("appointments")
            .update({
              reminder_followup_sent: true,
              reminder_followup_sent_at: new Date().toISOString(),
            })
            .eq("id", appt.id);

          sent++;
          console.log("[send-reminder-followup] Follow-up sent for:", appt.id);
        } else {
          failed++;
          console.error("[send-reminder-followup] Failed:", data.error || res.status);
        }
      } catch (err) {
        failed++;
        console.error("[send-reminder-followup] Error sending:", err);
      }
    }

    return jsonResponse(200, { ok: true, date: tomorrowDate, total: appointments.length, sent, failed });
  } catch (error) {
    console.error("[send-reminder-followup] Unexpected error:", error);
    return jsonResponse(500, { ok: false, error: "Internal server error" });
  }
});
