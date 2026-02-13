import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  date: string;
  time: string;
  appointment_at: string;
  status: string;
  duration_minutes: number;
}

interface ReminderResult {
  appointmentId: string;
  patientName: string;
  success: boolean;
  error?: string;
}

function formatAppointmentDate(date: string): string {
  const dt = DateTime.fromISO(date);
  return dt.toFormat("dd/MM/yyyy");
}

function formatAppointmentTime(date: string, time: string): string {
  const dt = DateTime.fromISO(`${date}T${time}`);
  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Calls send-whatsapp-message using INTERNAL_FUNCTION_SECRET (server-to-server).
 */
async function sendReminderMessage(params: {
  functionsBaseUrl: string;
  internalSecret: string;
  to: string;
  templateName: string;
  templateParams: Record<string, string>;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${params.functionsBaseUrl}/send-whatsapp-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": params.internalSecret,
      },
      body: JSON.stringify({
        to: params.to,
        type: "reminder_24h",
        templateName: params.templateName,
        templateParams: params.templateParams,
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        doctorId: params.doctorId,
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: ReminderResult[] = [];
  let totalAppointments = 0;
  let successCount = 0;
  let failedCount = 0;

  try {
    // 1) Env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioTemplateReminder = Deno.env.get("TWILIO_TEMPLATE_REMINDER_24H");
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-reminders] Missing Supabase env vars");
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error: Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!internalSecret) {
      console.error("[send-reminders] Missing INTERNAL_FUNCTION_SECRET");
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error: INTERNAL_FUNCTION_SECRET" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!twilioTemplateReminder) {
      console.error("[send-reminders] Missing TWILIO_TEMPLATE_REMINDER_24H");
      return new Response(JSON.stringify({ ok: false, error: "Server configuration error: Twilio template not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Functions base URL
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const functionsBaseUrl = `https://${projectRef}.supabase.co/functions/v1`;
    console.log("[send-reminders] Functions base URL:", functionsBaseUrl);

    // 3) Supabase client (service role)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Tomorrow (HN timezone)
    const now = DateTime.now().setZone("America/Tegucigalpa");
    const tomorrowDateString = now.plus({ days: 1 }).toFormat("yyyy-MM-dd");

    console.log("[send-reminders] Today:", now.toFormat("yyyy-MM-dd"));
    console.log("[send-reminders] Looking for appointments on:", tomorrowDateString);

    // 5) Fetch appointments
    // ✅ Extra filter: reminder_24h_sent = false (to hard-prevent duplicates)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, date, time, appointment_at, status, duration_minutes")
      .eq("date", tomorrowDateString)
      .in("status", ["agendada", "confirmada", "pending", "confirmed"])
      .eq("reminder_24h_sent", false)
      .is("reminder_24h_sent_at", null);

    if (appointmentsError) {
      console.error("[send-reminders] Error fetching appointments:", appointmentsError);
      return new Response(JSON.stringify({ ok: false, error: "Error fetching appointments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointments || appointments.length === 0) {
      console.log("[send-reminders] No appointments found for tomorrow");
      return new Response(JSON.stringify({
        ok: true,
        message: "No appointments to remind",
        date: tomorrowDateString,
        total: 0,
        sent: 0,
        failed: 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    totalAppointments = appointments.length;
    console.log("[send-reminders] Found", totalAppointments, "appointments to process");

    // 6) Loop
    for (const appointment of appointments as Appointment[]) {
      console.log("[send-reminders] Processing appointment:", appointment.id);

      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id, name, phone")
        .eq("id", appointment.patient_id)
        .single();

      if (patientError || !patient) {
        console.error("[send-reminders] Error fetching patient:", patientError);
        results.push({ appointmentId: appointment.id, patientName: "Unknown", success: false, error: "Patient not found" });
        failedCount++;
        continue;
      }

      if (!patient.phone) {
        console.warn("[send-reminders] Patient has no phone:", patient.id);
        results.push({ appointmentId: appointment.id, patientName: patient.name, success: false, error: "No phone number" });
        failedCount++;
        continue;
      }

      const { data: doctor, error: doctorError } = await supabase
        .from("doctors")
        .select("id, name, prefix")
        .eq("id", appointment.doctor_id)
        .single();

      if (doctorError || !doctor) {
        console.error("[send-reminders] Error fetching doctor:", doctorError);
        results.push({ appointmentId: appointment.id, patientName: patient.name, success: false, error: "Doctor not found" });
        failedCount++;
        continue;
      }

      const doctorDisplayName = doctor.prefix ? `${doctor.prefix} ${doctor.name}` : `Dr. ${doctor.name}`;
      const formattedDate = formatAppointmentDate(appointment.date);
      const formattedTime = formatAppointmentTime(appointment.date, appointment.time);

      const templateParams = {
        "1": patient.name,
        "2": doctorDisplayName,
        "3": formattedDate,
        "4": formattedTime,
        "5": `c-${appointment.id}`,  // c- prefix for "Confirmar" button
        "6": `r-${appointment.id}`,  // r- prefix for "Reagendar" button
      };

      // patient.phone is stored as 8 digits; build WhatsApp E.164
      const digits = patient.phone.replace(/\D/g, "");
      const whatsappTo = `whatsapp:+504${digits}`;

      console.log("[send-reminders] Sending reminder to:", whatsappTo);

      const sendResult = await sendReminderMessage({
        functionsBaseUrl,
        internalSecret,
        to: whatsappTo,
        templateName: twilioTemplateReminder,
        templateParams,
        appointmentId: appointment.id,
        patientId: patient.id,
        doctorId: doctor.id,
      });

      if (sendResult.success) {
        const nowIso = DateTime.now().setZone("America/Tegucigalpa").toISO();

        // ✅ Update BOTH flags (prevents duplicates even if one gets out of sync)
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            reminder_24h_sent: true,
            reminder_24h_sent_at: nowIso,
          })
          .eq("id", appointment.id);

        if (updateError) {
          console.error("[send-reminders] Error updating appointment:", updateError);
        }

        results.push({ appointmentId: appointment.id, patientName: patient.name, success: true });
        successCount++;
        console.log("[send-reminders] Reminder sent successfully for:", appointment.id);
      } else {
        results.push({ appointmentId: appointment.id, patientName: patient.name, success: false, error: sendResult.error });
        failedCount++;
        console.error("[send-reminders] Failed to send reminder:", sendResult.error);
      }
    }

    console.log("[send-reminders] Completed. Success:", successCount, "Failed:", failedCount);

    return new Response(JSON.stringify({
      ok: true,
      date: tomorrowDateString,
      total: totalAppointments,
      sent: successCount,
      failed: failedCount,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[send-reminders] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: "Internal server error", details: errorMessage, results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
