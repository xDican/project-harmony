/**
 * Canonical template definitions for OrionCare WhatsApp messaging.
 *
 * When a client connects a new WABA via Embedded Signup, these templates
 * are created in their WABA via the Meta Graph API. The bodies replicate
 * the approved templates from the OrionCare WABA to maximize approval chances.
 */

/** The OrionCare primary WABA — legacy templates already exist here. */
export const ORIONCARE_WABA_ID = "1292296356040815";

/** Meta Graph API component structure for template creation */
export interface TemplateComponent {
  type: "BODY" | "BUTTONS";
  text?: string;
  example?: { body_text: string[][] };
  buttons?: Array<{ type: "QUICK_REPLY"; text: string }>;
}

export interface CanonicalTemplate {
  logical_type: string;
  template_name: string;
  language: string;
  category: "UTILITY" | "MARKETING";
  components: TemplateComponent[];
}

/**
 * The 6 canonical templates that every client WABA should have.
 * Bodies are identical to the approved OrionCare originals.
 */
export const CANONICAL_TEMPLATES: CanonicalTemplate[] = [
  {
    logical_type: "confirmation",
    template_name: "confirmacion_cita",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "👋 Hola {{1}}\n\n✅ Su cita ha sido agendada con éxito\n\n🩺 {{2}}\n📅 {{3}}\n⏰ {{4}}\n\nSi necesita cambiar la fecha u hora, puede hacerlo fácilmente:\n👉 Presione el botón *Reagendar* o escriba la palabra *REAGENDAR*.\n\nEstamos para ayudarle 😊",
        example: { body_text: [["Juan", "Dr. Lopez", "25 de febrero", "10:00 AM"]] },
      },
      {
        type: "BUTTONS",
        buttons: [{ type: "QUICK_REPLY", text: "Reagendar" }],
      },
    ],
  },
  {
    logical_type: "reminder_24h",
    template_name: "recordatorio_cita_24h",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "{{1}}, la {{2}} le espera mañana {{3}} a las {{4}} 🩺\n\n⚠️ Confirme antes de las 7AM o su espacio sera ofrecido a otro paciente.",
        example: { body_text: [["Maria", "Dra. Yeni", "miércoles 2 de abril", "10:00 AM"]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Sí, ahí estaré ✅" },
          { type: "QUICK_REPLY", text: "No puedo 😔" },
        ],
      },
    ],
  },
  {
    logical_type: "reschedule_doctor",
    template_name: "aviso_reagenda_medico",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "📞 Solicitud de reagendación\n\nEl paciente {{1}} ha solicitado reagendar su cita.\n\n👉 Por favor comuníquese con el paciente para coordinar la nueva fecha y hora.\n\n📱 Teléfono: {{2}}\n\n—\nSistema de Citas",
        example: { body_text: [["Juan Perez", "+50412345678"]] },
      },
    ],
  },
  {
    logical_type: "patient_confirmed",
    template_name: "cita_confirmada",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "✅ Cita Confirmada. \n\nNos dará mucho gusto recibirle *mañana* a las {{1}} en nuestro consultorio.\n\n¡Que tenga un gran día!",
        example: { body_text: [["10:00 AM"]] },
      },
    ],
  },
  {
    logical_type: "patient_reschedule",
    template_name: "solicitud_reagenda",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "🔄 Su solicitud de reagendación ha sido recibida.\n\n📞 En breve, el consultorio se pondrá en contacto para confirmar la nueva fecha y hora.\n\nGracias por su comprensión 😊",
      },
    ],
  },
  {
    logical_type: "handoff_notification",
    template_name: "solicitud_atencion_paciente",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "📋 Nuevo paciente requiere atención\n\nUn paciente ha solicitado comunicarse con usted desde el asistente virtual de OrionCare.\n\n📞 Teléfono: {{1}}\n👤 Nombre: {{2}}\n\nPor favor comuníquese con el paciente para atenderle.",
        example: { body_text: [["50412345678", "Juan Perez"]] },
      },
    ],
  },
  {
    logical_type: "reminder_followup",
    template_name: "recordatorio_sin_confirmar",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "⏰ {{1}}, aún no ha confirmado su cita de mañana a las {{2}} con {{3}}.\n\n⚠️ Si no confirma antes de las 7AM, su espacio sera ofrecido a otro paciente.",
        example: { body_text: [["Maria", "10:00 AM", "Dra. Yeni"]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Confirmo ✅" },
          { type: "QUICK_REPLY", text: "No puedo 😔" },
        ],
      },
    ],
  },
  {
    logical_type: "appointment_released",
    template_name: "cita_liberada_no_confirmacion",
    language: "es_MX",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "📋 {{1}}, su cita de hoy a las {{2}} con {{3}} fue liberada por falta de confirmación.\n\n📲 Si desea reagendar, escriba *agendar* a este número.",
        example: { body_text: [["Maria", "10:00 AM", "Dra. Yeni"]] },
      },
    ],
  },
];

/**
 * Generate a unique template name by appending a timestamp suffix (DDMMYY_HHMMSS).
 * Each second produces a unique name, so no retry/collision logic is needed.
 * Meta template names: max 512 chars, lowercase alphanumeric + underscore only.
 *
 * Example: confirmacion_cita_250226_143052
 */
export function generateTemplateName(base: string): string {
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(now.getUTCFullYear()).slice(-2);
  const HH = String(now.getUTCHours()).padStart(2, "0");
  const MM = String(now.getUTCMinutes()).padStart(2, "0");
  const SS = String(now.getUTCSeconds()).padStart(2, "0");
  return `${base}_${dd}${mm}${yy}_${HH}${MM}${SS}`;
}

/** Legacy template names used in the OrionCare primary WABA. */
export const LEGACY_TEMPLATE_NAMES: Record<string, { template_name: string; template_language: string }> = {
  confirmation:       { template_name: "notificacion_creacion_cita_utility_hx0e54700971a4adf2d4f4fcb8f021beff_", template_language: "es_MX" },
  reminder_24h:       { template_name: "notificacion_24h_antes_utility_hx9f009d3fb6845f75c34a1868b98e64a6",    template_language: "es_MX" },
  reschedule_doctor:  { template_name: "notificacion_reagenda_medico_utility_hx95828e73090fb5a66e3157fe33ac956d", template_language: "es_MX" },
  patient_confirmed:  { template_name: "confirmacion_cita_utility_hx7ef2d47944d28ef80f84a9bacb89d587",          template_language: "es_MX" },
  patient_reschedule: { template_name: "paciente_solicita_reagenda_utility_hxe08b07d4ae63dbd73e11709817ac2f75", template_language: "es_MX" },
  handoff_notification: { template_name: "TBD_LEGACY_NAME", template_language: "es_MX" },
};
