/**
 * Auto-Cancel Unconfirmed — Cancels appointments that were not confirmed
 * before the 7AM deadline on the day of the appointment.
 *
 * Runs at 7:00 AM Honduras time. Only targets orgs with auto_cancel_enabled.
 * Only cancels appointments that received a reminder (reminder_24h_sent = true).
 * Sends an "appointment_released" notification to the patient.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { formatTimeForTemplate, todayHonduras } from "../_shared/datetime.ts";

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

    const todayDate = todayHonduras();
    console.log("[auto-cancel] Looking for unconfirmed appointments on:", todayDate);

    // Get orgs with auto-cancel enabled
    const { data: enabledOrgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("auto_cancel_enabled", true);

    const enabledOrgIds = (enabledOrgs ?? []).map((o: { id: string }) => o.id);

    if (enabledOrgIds.length === 0) {
      return jsonResponse(200, { ok: true, message: "No orgs with auto_cancel_enabled", cancelled: 0 });
    }

    // Get today's unconfirmed appointments that received a reminder
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, date, time, organization_id")
      .eq("date", todayDate)
      .eq("status", "agendada")
      .eq("reminder_24h_sent", true)
      .in("organization_id", enabledOrgIds);

    if (error) {
      console.error("[auto-cancel] Error fetching appointments:", error);
      return jsonResponse(500, { ok: false, error: "Error fetching appointments" });
    }

    if (!appointments || appointments.length === 0) {
      console.log("[auto-cancel] No unconfirmed appointments to cancel");
      return jsonResponse(200, { ok: true, message: "No appointments to cancel", cancelled: 0 });
    }

    console.log("[auto-cancel] Found", appointments.length, "unconfirmed appointments to cancel");

    let cancelled = 0;
    let notified = 0;
    let notifyFailed = 0;

    for (const appt of appointments) {
      // Cancel the appointment
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status: "cancelada",
          auto_cancelled: true,
          auto_cancelled_at: new Date().toISOString(),
          notes: "Auto-cancelada: no confirmada antes del plazo (7AM)",
        })
        .eq("id", appt.id);

      if (updateError) {
        console.error("[auto-cancel] Error cancelling:", appt.id, updateError);
        continue;
      }

      cancelled++;
      console.log("[auto-cancel] Cancelled:", appt.id);

      // Notify patient that their slot was released
      const { data: patient } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("id", appt.patient_id)
        .single();

      if (!patient?.phone) {
        console.warn("[auto-cancel] No phone for patient:", appt.patient_id);
        notifyFailed++;
        continue;
      }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("id, name, prefix")
        .eq("id", appt.doctor_id)
        .single();

      if (!doctor) {
        notifyFailed++;
        continue;
      }

      const doctorDisplayName = doctor.prefix ? `${doctor.prefix} ${doctor.name}` : `Dr. ${doctor.name}`;
      const formattedTime = formatTimeForTemplate(appt.time);

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
            type: "appointment_released",
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
          notified++;
          console.log("[auto-cancel] Patient notified:", appt.id);
        } else {
          notifyFailed++;
          console.error("[auto-cancel] Notification failed:", data.error || res.status);
        }
      } catch (err) {
        notifyFailed++;
        console.error("[auto-cancel] Error notifying:", err);
      }
    }

    return jsonResponse(200, {
      ok: true,
      date: todayDate,
      total: appointments.length,
      cancelled,
      notified,
      notifyFailed,
    });
  } catch (error) {
    console.error("[auto-cancel] Unexpected error:", error);
    return jsonResponse(500, { ok: false, error: "Internal server error" });
  }
});
