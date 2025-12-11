import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DateTime } from "https://esm.sh/luxon@3.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

interface Patient {
  id: string;
  name: string;
  phone: string | null;
}

interface Doctor {
  id: string;
  name: string;
  prefix: string | null;
}

interface ReminderResult {
  appointmentId: string;
  patientName: string;
  success: boolean;
  error?: string;
}

/**
 * Formats appointment datetime for the template
 */
function formatAppointmentDateTime(date: string, time: string): string {
  // Combine date and time, then format
  const dt = DateTime.fromISO(`${date}T${time}`);

  // Format: "12/12/2025 a las 3:00 PM"
  const formattedDate = dt.toFormat("dd/MM/yyyy");

  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  const formattedTime = `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;

  return `${formattedDate} a las ${formattedTime}`;
}

/**
 * Sends a reminder via the send-whatsapp-message Edge Function
 */
async function sendReminderMessage(params: {
  functionsBaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
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
        // Use service role key as Bearer token for Authorization
        "Authorization": `Bearer ${params.serviceRoleKey}`,
        // Also include apikey header for Supabase Edge Functions
        "apikey": params.anonKey,
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

    const data = await response.json();

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: ReminderResult[] = [];
  let totalAppointments = 0;
  let successCount = 0;
  let failedCount = 0;

  try {
    // 1) Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const twilioTemplateReminder = Deno.env.get("TWILIO_TEMPLATE_REMINDER_24H");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("[send-reminders] Missing Supabase env vars");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error: Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!twilioTemplateReminder) {
      console.error("[send-reminders] Missing TWILIO_TEMPLATE_REMINDER_24H");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error: Twilio template not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Derive functions base URL from Supabase URL
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const functionsBaseUrl = `https://${projectRef}.supabase.co/functions/v1`;

    console.log("[send-reminders] Functions base URL:", functionsBaseUrl);

    // 3) Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4) Calculate tomorrow's date
    // Using Honduras timezone (UTC-6)
    const now = DateTime.now().setZone("America/Tegucigalpa");
    const tomorrow = now.plus({ days: 1 });
    const tomorrowDateString = tomorrow.toFormat("yyyy-MM-dd");

    console.log("[send-reminders] Today:", now.toFormat("yyyy-MM-dd"));
    console.log("[send-reminders] Looking for appointments on:", tomorrowDateString);

    // 5) Get tomorrow's appointments that need reminders
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, date, time, appointment_at, status, duration_minutes")
      .eq("date", tomorrowDateString)
      .in("status", ["agendada", "confirmada", "pending", "confirmed"])
      .is("reminder_24h_sent_at", null);

    if (appointmentsError) {
      console.error("[send-reminders] Error fetching appointments:", appointmentsError);
      return new Response(
        JSON.stringify({ ok: false, error: "Error fetching appointments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!appointments || appointments.length === 0) {
      console.log("[send-reminders] No appointments found for tomorrow");
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No appointments to remind",
          date: tomorrowDateString,
          total: 0,
          sent: 0,
          failed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      // Format appointment date/time
      const formattedDateTime = formatAppointmentDateTime(appointment.date, appointment.time);

      // Build template params
      // Template placeholders:
      // {{1}} = Patient name
      // {{2}} = Doctor display name
      // {{3}} = Formatted date/time
      const templateParams = {
        "1": patient.name,
        "2": doctorDisplayName,
        "3": formattedDateTime,
      };

      // Format phone for WhatsApp
      let whatsappTo = patient.phone;
      if (!whatsappTo.startsWith("+")) {
        whatsappTo = `+504${whatsappTo.replace(/\D/g, "")}`;
      }
      whatsappTo = `whatsapp:${whatsappTo}`;

      console.log("[send-reminders] Sending reminder to:", whatsappTo);

      // Send reminder via send-whatsapp-message
      const sendResult = await sendReminderMessage({
        functionsBaseUrl,
        serviceRoleKey: supabaseServiceKey,
        anonKey: supabaseAnonKey,
        to: whatsappTo,
        templateName: twilioTemplateReminder,
        templateParams,
        appointmentId: appointment.id,
        patientId: patient.id,
        doctorId: doctor.id,
      });

      if (sendResult.success) {
        // Update appointment to mark reminder as sent
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ reminder_24h_sent_at: new Date().toISOString() })
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

    return new Response(
      JSON.stringify({
        ok: true,
        date: tomorrowDateString,
        total: totalAppointments,
        sent: successCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-reminders] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        details: errorMessage,
        results,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
