/**
 * Send Reminders — Cron job that sends 24-hour appointment reminders.
 *
 * Finds tomorrow's appointments (Honduras timezone) that haven't received
 * a reminder yet, and sends them via the messaging-gateway.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { normalizeToE164 } from "../_shared/phone.ts";
import { formatDateForTemplate, formatTimeForTemplate, tomorrowHonduras } from "../_shared/datetime.ts";

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  date: string;
  time: string;
  appointment_at: string;
  status: string;
  duration_minutes: number;
  organization_id: string | null;
}

interface ReminderResult {
  appointmentId: string;
  patientName: string;
  success: boolean;
  error?: string;
}

/**
 * Sends a reminder via the messaging-gateway Edge Function
 */
async function sendReminderMessage(params: {
  gatewayUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  internalSecret: string;
  to: string;
  templateParams: Record<string, string>;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  organizationId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(params.gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.serviceRoleKey}`,
        "x-internal-secret": params.internalSecret,
        apikey: params.anonKey,
      },
      body: JSON.stringify({
        to: params.to,
        type: "reminder_24h",
        templateParams: params.templateParams,
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        doctorId: params.doctorId,
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const results: ReminderResult[] = [];
  let totalAppointments = 0;
  let successCount = 0;
  let failedCount = 0;

  try {
    // 1) Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("[send-reminders] Missing Supabase env vars");
      return jsonResponse(500, { ok: false, error: "Server configuration error: Supabase" });
    }

    // 2) Derive gateway URL
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const gatewayUrl = `https://${projectRef}.supabase.co/functions/v1/messaging-gateway`;

    console.log("[send-reminders] Gateway URL:", gatewayUrl);

    // 3) Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Calculate tomorrow's date (Honduras timezone)
    const tomorrowDateString = tomorrowHonduras();

    console.log("[send-reminders] Looking for appointments on:", tomorrowDateString);

    // 4b) Pre-fetch orgs with messaging disabled to skip their appointments
    const { data: disabledOrgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("messaging_enabled", false);

    const disabledOrgIds = (disabledOrgs ?? []).map((o: { id: string }) => o.id);

    if (disabledOrgIds.length > 0) {
      console.log("[send-reminders] Skipping appointments for disabled orgs:", disabledOrgIds);
    }

    // 5) Get tomorrow's appointments that need reminders (excluding disabled orgs)
    let appointmentsQuery = supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, date, time, appointment_at, status, duration_minutes, organization_id")
      .eq("date", tomorrowDateString)
      .in("status", ["agendada", "confirmada", "pending", "confirmed"])
      .eq("reminder_24h_sent", false)
      .is("reminder_24h_sent_at", null);

    if (disabledOrgIds.length > 0) {
      appointmentsQuery = appointmentsQuery.not("organization_id", "in", `(${disabledOrgIds.join(",")})`);
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery;

    if (appointmentsError) {
      console.error("[send-reminders] Error fetching appointments:", appointmentsError);
      return jsonResponse(500, { ok: false, error: "Error fetching appointments" });
    }

    if (!appointments || appointments.length === 0) {
      console.log("[send-reminders] No appointments found for tomorrow");
      return jsonResponse(200, {
        ok: true,
        message: "No appointments to remind",
        date: tomorrowDateString,
        total: 0,
        sent: 0,
        failed: 0,
      });
    }

    totalAppointments = appointments.length;
    console.log("[send-reminders] Found", totalAppointments, "appointments to process");

    // 6) Process each appointment
    for (const appointment of appointments as Appointment[]) {
      console.log("[send-reminders] Processing appointment:", appointment.id);

      // Get patient data
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("id", appointment.patient_id)
        .single();

      if (patientError || !patient) {
        console.error("[send-reminders] Error fetching patient:", patientError);
        results.push({
          appointmentId: appointment.id,
          patientName: "Unknown",
          success: false,
          error: "Patient not found",
        });
        failedCount++;
        continue;
      }

      // Check if patient has phone
      if (!patient.phone) {
        console.warn("[send-reminders] Patient has no phone:", patient.id);
        results.push({
          appointmentId: appointment.id,
          patientName: patient.name,
          success: false,
          error: "No phone number",
        });
        failedCount++;
        continue;
      }

      // Get doctor data
      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .select("id, name, prefix")
        .eq("id", appointment.doctor_id)
        .single();

      if (doctorError || !doctor) {
        console.error("[send-reminders] Error fetching doctor:", doctorError);
        results.push({
          appointmentId: appointment.id,
          patientName: patient.name,
          success: false,
          error: "Doctor not found",
        });
        failedCount++;
        continue;
      }

      // Build doctor display name
      const doctorDisplayName = doctor.prefix
        ? `${doctor.prefix} ${doctor.name}`
        : `Dr. ${doctor.name}`;

      // Format appointment date/time — 4 params: paciente, médico, fecha, hora
      const formattedDate = formatDateForTemplate(appointment.date);
      const formattedTime = formatTimeForTemplate(appointment.time);

      // Build template params
      const templateParams = {
        "1": patient.name,
        "2": doctorDisplayName,
        "3": formattedDate,
        "4": formattedTime,
      };

      console.log("[send-reminders] Sending reminder to:", patient.phone);

      // Send reminder via messaging-gateway
      const sendResult = await sendReminderMessage({
        gatewayUrl,
        serviceRoleKey: supabaseServiceKey,
        anonKey: supabaseAnonKey,
        internalSecret,
        to: normalizeToE164(patient.phone),
        templateParams,
        appointmentId: appointment.id,
        patientId: patient.id,
        doctorId: doctor.id,
        organizationId: appointment.organization_id,
      });

      if (sendResult.success) {
        // Update appointment to mark reminder as sent (both flags)
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            reminder_24h_sent: true,
            reminder_24h_sent_at: new Date().toISOString(),
          })
          .eq("id", appointment.id);

        if (updateError) {
          console.error("[send-reminders] Error updating appointment:", updateError);
        }

        results.push({
          appointmentId: appointment.id,
          patientName: patient.name,
          success: true,
        });
        successCount++;
        console.log("[send-reminders] Reminder sent successfully for:", appointment.id);
      } else {
        results.push({
          appointmentId: appointment.id,
          patientName: patient.name,
          success: false,
          error: sendResult.error,
        });
        failedCount++;
        console.error("[send-reminders] Failed to send reminder:", sendResult.error);
      }
    }

    // 7) Return summary
    console.log("[send-reminders] Completed. Success:", successCount, "Failed:", failedCount);

    return jsonResponse(200, {
      ok: true,
      date: tomorrowDateString,
      total: totalAppointments,
      sent: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("[send-reminders] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, {
      ok: false,
      error: "Internal server error",
      details: errorMessage,
      results,
    });
  }
});
