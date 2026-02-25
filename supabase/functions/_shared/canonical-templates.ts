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
 * The 5 canonical templates that every client WABA should have.
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
        text: "\ud83d\udc4b Hola {{1}}\n\n\u2705 Su cita ha sido agendada con \u00e9xito\n\n\ud83e\ude7a {{2}}\n\ud83d\udcc5 {{3}}\n\u23f0 {{4}}\n\nSi necesita cambiar la fecha u hora, puede hacerlo f\u00e1cilmente:\n\ud83d\udc49 Presione el bot\u00f3n *Reagendar* o escriba la palabra *REAGENDAR*.\n\nEstamos para ayudarle \ud83d\ude0a",
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
        text: "\u23f0 Recordatorio de cita m\u00e9dica\n\nHola {{1}},\n\nTienes una cita programada con:\n\n\ud83e\ude7a {{2}}\n\ud83d\udcc5 {{3}}\n\u23f0 {{4}}\n\nPor favor confirme su asistencia o reagende su cita usando los botones de abajo \ud83d\udc47\n\nGracias por su tiempo \ud83d\ude0a",
        example: { body_text: [["Juan", "Dr. Lopez", "25 de febrero", "10:00 AM"]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Confirmar" },
          { type: "QUICK_REPLY", text: "Reagendar" },
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
        text: "\ud83d\udcde Solicitud de reagendaci\u00f3n\n\nEl paciente {{1}} ha solicitado reagendar su cita.\n\n\ud83d\udc49 Por favor comun\u00edquese con el paciente para coordinar la nueva fecha y hora.\n\n\ud83d\udcf1 Tel\u00e9fono: {{2}}\n\n\u2014\nSistema de Citas",
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
        text: "\u2705 Cita Confirmada. \n\nNos dar\u00e1 mucho gusto recibirle *ma\u00f1ana* a las {{1}} en nuestro consultorio.\n\n\u00a1Que tenga un gran d\u00eda!",
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
        text: "\ud83d\udd04 Su solicitud de reagendaci\u00f3n ha sido recibida.\n\n\ud83d\udcde En breve, el consultorio se pondr\u00e1 en contacto para confirmar la nueva fecha y hora.\n\nGracias por su comprensi\u00f3n \ud83d\ude0a",
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
};
