import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  to: string;
  type: "confirmation" | "reminder" | "reschedule";
  templateParams?: {
    name?: string;
    date?: string;
    time?: string;
    [key: string]: string | undefined;
  };
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { to, type, templateParams } = body;

    console.log("Received request:", { to, type, templateParams });

    // Validate required fields
    if (!to) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing 'to' field" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const whatsappFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!accountSid || !authToken) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Missing Twilio credentials" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template based on type
    let templateName: string | undefined;
    switch (type) {
      case "confirmation":
        templateName = Deno.env.get("TWILIO_TEMPLATE_CONFIRMATION");
        break;
      case "reminder":
        templateName = Deno.env.get("TWILIO_TEMPLATE_REMINDER_24H");
        break;
      case "reschedule":
        templateName = Deno.env.get("TWILIO_TEMPLATE_RESCHEDULE_SECRETARY");
        break;
    }

    console.log("Using template:", templateName);

    // Build message body
    let messageBody: string;
    if (templateName && templateParams) {
      // Format content SID with variables
      // For WhatsApp templates, we use ContentSid
      messageBody = `Hola ${templateParams.name || "paciente"}, su cita está confirmada para el ${templateParams.date || "fecha"} a las ${templateParams.time || "hora"}.`;
    } else {
      messageBody = "Mensaje de prueba desde el sistema de citas.";
    }

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", whatsappFrom || `whatsapp:+14155238886`);
    formData.append("Body", messageBody);
    
    if (messagingServiceSid) {
      formData.append("MessagingServiceSid", messagingServiceSid);
    }

    console.log("Sending to Twilio:", { to, from: whatsappFrom, body: messageBody });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();
    console.log("Twilio response:", twilioData);

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: twilioData.message || "Failed to send message",
          twilioError: twilioData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        twilioSid: twilioData.sid,
        status: twilioData.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in send-whatsapp-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
