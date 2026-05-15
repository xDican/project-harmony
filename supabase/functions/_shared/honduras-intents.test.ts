// Tests para honduras-intents.ts
// Casos extraidos del analisis 14-28 Abr (56 sesiones) y diccionario de hondurenismos.
// Correr: deno test --no-check supabase/functions/_shared/honduras-intents.test.ts

import { assertEquals, assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  detectIntent,
  normalizeTypos,
  isAcknowledgment,
  stripPreamble,
  type Intent,
} from './honduras-intents.ts';

function expectIntent(text: string, intent: Intent) {
  const result = detectIntent(text);
  assertEquals(
    result.intent,
    intent,
    `"${text}" → esperado ${intent}, fue ${result.intent} (matched: ${result.matched})`,
  );
}

// =====================================================================
// normalizeTypos
// =====================================================================

Deno.test('normalizeTypos: typos hondurenos', () => {
  assertEquals(normalizeTypos('sita'), 'cita');
  assertEquals(normalizeTypos('Reajendar mi SITA'), 'reagendar mi cita');
  assertEquals(normalizeTypos('canselar'), 'cancelar');
  assertEquals(normalizeTypos('presio'), 'precio');
  assertEquals(normalizeTypos('orario'), 'horario');
  assertEquals(normalizeTypos('Quiero ajendar'), 'quiero agendar');
});

Deno.test('normalizeTypos: acentos y mayusculas', () => {
  assertEquals(normalizeTypos('Cancelación'), 'cancelacion');
  assertEquals(normalizeTypos('Médico'), 'medico');
  assertEquals(normalizeTypos('  Hola   '), 'hola');
});

// =====================================================================
// isAcknowledgment
// =====================================================================

Deno.test('isAcknowledgment: acks puros', () => {
  assert(isAcknowledgment('ok'));
  assert(isAcknowledgment('gracias'));
  assert(isAcknowledgment('OK'));
  assert(isAcknowledgment('muchas gracias'));
  assert(isAcknowledgment('👍'));
  assert(!isAcknowledgment('ok quiero reagendar'));
  assert(!isAcknowledgment('gracias, cuanto cuesta?'));
});

// =====================================================================
// CONFIRM intent
// =====================================================================

Deno.test('confirm: directos del dataset', () => {
  expectIntent('confirmo', 'confirm');
  expectIntent('Confirmo mi asistencia', 'confirm');
  expectIntent('ahí estaré', 'confirm');
  expectIntent('Ahí estaremos', 'confirm');
  expectIntent('si, ahí estaré', 'confirm');
  expectIntent('Ok ahi estare', 'confirm');
  expectIntent('Confirmo ✅', 'confirm');
});

Deno.test('confirm: hondurenismos', () => {
  expectIntent('sale pues', 'confirm');
  expectIntent('dale pues', 'confirm');
  expectIntent('listo, gracias', 'confirm');
  expectIntent('perfecto', 'confirm');
  expectIntent('primero dios', 'confirm');
});

Deno.test('confirm: regla cultural "siempre voy"', () => {
  // "Siempre" = "igual/todavia" en Honduras, NO reschedule
  expectIntent('siempre voy', 'confirm');
  expectIntent('siempre estare', 'confirm');
  expectIntent('siempre el lunes', 'confirm');
  // Caso real: "buenas tardes si ahi estare el lunes" debe ser confirm
  expectIntent('buenas tardes si ahi estare el lunes', 'confirm');
});

// =====================================================================
// RESCHEDULE intent
// =====================================================================

Deno.test('reschedule: directos', () => {
  expectIntent('reagendar', 'reschedule');
  expectIntent('quiero reagendar', 'reschedule');
  expectIntent('Reajendar mi sita', 'reschedule');
  expectIntent('cambiar fecha', 'reschedule');
  expectIntent('mover la cita', 'reschedule');
});

Deno.test('reschedule: imposibilidad = reschedule (regla cultural)', () => {
  // En Honduras "no puedo asistir" casi siempre es reschedule, no cancel
  expectIntent('no puedo asistir', 'reschedule');
  expectIntent('No puedo asistir', 'reschedule');
  expectIntent('no podré asistir', 'reschedule');
  expectIntent('no voy a poder ir', 'reschedule');
  expectIntent('manana no puedo', 'reschedule');
});

Deno.test('reschedule: razones humanas', () => {
  expectIntent('estoy fuera del pais', 'reschedule');
  expectIntent('tengo emergencia', 'reschedule');
  expectIntent('tengo gripe', 'reschedule');
  expectIntent('tengo clases', 'reschedule');
});

// =====================================================================
// SOFT_NO intent
// =====================================================================

Deno.test('soft_no: "yo aviso" y variantes', () => {
  expectIntent('yo aviso', 'soft_no');
  expectIntent('yo le aviso', 'soft_no');
  expectIntent('yo le escribire', 'soft_no');
  expectIntent('lo voy a pensar', 'soft_no');
  expectIntent('cuando me decida le llamo', 'soft_no');
  expectIntent('por los momentos no', 'soft_no');
});

Deno.test('soft_no: variantes con "confirmo" (caso 14-May 2026)', () => {
  expectIntent('yo le confirmo despues', 'soft_no');
  expectIntent('le confirmo despues', 'soft_no');
  expectIntent('confirmo despues', 'soft_no');
  expectIntent('confirmo luego', 'soft_no');
  // Sanity: variantes con "aviso" que ya matcheaban por substring
  expectIntent('yo le aviso despues', 'soft_no');
  expectIntent('le aviso luego', 'soft_no');
});

// =====================================================================
// CANCEL intent
// =====================================================================

Deno.test('cancel: explicito', () => {
  expectIntent('cancelar', 'cancel');
  expectIntent('Canselar mi sita', 'cancel');
  expectIntent('quiero cancelar', 'cancel');
  expectIntent('ya no la necesito', 'cancel');
});

// =====================================================================
// FAQ intents
// =====================================================================

Deno.test('faq_price: variantes', () => {
  expectIntent('cuanto cuesta?', 'faq_price');
  expectIntent('Cuánto vale la consulta?', 'faq_price');
  expectIntent('precio del blanqueamiento', 'faq_price');
  expectIntent('me gustaria saber el precio', 'faq_price');
  expectIntent('Presio', 'faq_price'); // typo
});

Deno.test('faq_location', () => {
  expectIntent('donde estan ubicados?', 'faq_location');
  expectIntent('Cuál es la dirección?', 'faq_location');
  expectIntent('como llego?', 'faq_location');
  expectIntent('me puede enviar la ubicacion', 'faq_location');
});

Deno.test('faq_schedule', () => {
  expectIntent('cual es el horario?', 'faq_schedule');
  expectIntent('a que hora abren', 'faq_schedule');
  expectIntent('cuando atienden', 'faq_schedule');
});

Deno.test('faq_my_appointment', () => {
  expectIntent('cuando es mi cita?', 'faq_my_appointment');
  expectIntent('me confirma cuando es mi cita', 'faq_my_appointment');
  expectIntent('cual es mi cita', 'faq_my_appointment');
});

// =====================================================================
// HANDOFF intent
// =====================================================================

Deno.test('handoff: directo', () => {
  expectIntent('secretaria', 'handoff');
  expectIntent('hablar con la secretaria', 'handoff');
  expectIntent('quiero hablar con el dr', 'handoff');
  expectIntent('necesito ayuda', 'handoff');
});

// =====================================================================
// OUT_OF_SCOPE intent
// =====================================================================

Deno.test('out_of_scope: video llamada / fotos', () => {
  expectIntent('quiero consulta online', 'out_of_scope');
  expectIntent('por video llamada', 'out_of_scope');
  expectIntent('me puede mandar foto de la receta', 'out_of_scope');
});

// =====================================================================
// GREETING
// =====================================================================

Deno.test('greeting: solo saludo', () => {
  expectIntent('hola', 'greeting');
  expectIntent('Buenos días', 'greeting');
  expectIntent('buenas tardes', 'greeting');
  expectIntent('holis', 'greeting');
});

Deno.test('greeting + info: prioridad al intent', () => {
  // "hola, confirmo" → confirm, no greeting
  expectIntent('hola, confirmo', 'confirm');
  expectIntent('buenos dias quiero reagendar', 'reschedule');
});

// =====================================================================
// PREAMBLE handling
// =====================================================================

Deno.test('preamble: fijese que + intent', () => {
  // "fijese que tengo gripe" → reschedule (la razon humana)
  expectIntent('fijese que tengo gripe', 'reschedule');
  expectIntent('mire que no puedo asistir', 'reschedule');
  expectIntent('disculpe ya no puedo asistir', 'reschedule');
});

Deno.test('stripPreamble: extrae residual', () => {
  const r1 = stripPreamble('fijese que tengo emergencia');
  assertEquals(r1.preamble, 'fijese que');
  assertEquals(r1.stripped, 'tengo emergencia');

  const r2 = stripPreamble('hola buenos dias quiero reagendar');
  assert(r2.preamble);
  assertEquals(r2.stripped, 'quiero reagendar');
});

// =====================================================================
// SPAM externo
// =====================================================================

Deno.test('spam_external_bot: rebote de otros negocios', () => {
  expectIntent('Gracias por comunicarte con Soporte. Pronto te atenderemos', 'spam_external_bot');
  expectIntent('Le saluda Maria de Banco Ficohsa, oferta exclusiva', 'spam_external_bot');
});

// =====================================================================
// WRONG_NUMBER
// =====================================================================

Deno.test('wrong_number', () => {
  expectIntent('se equivoco de numero', 'wrong_number');
  expectIntent('no soy Maria', 'wrong_number');
});

// =====================================================================
// UNKNOWN — fallback
// =====================================================================

Deno.test('unknown: textos no clasificables', () => {
  expectIntent('asjdklasjdkl', 'unknown');
  expectIntent('xxxxxx', 'unknown');
});

// =====================================================================
// CASOS REALES DEL DATASET (V2 14-28 Abr)
// =====================================================================

Deno.test('casos reales: confirmaciones perdidas en Medilaser', () => {
  // 15 confirmaciones explicitas que el bot trato como saludo
  expectIntent('Confirmo mi asistencia', 'confirm');
  expectIntent('Confirmo ✅', 'confirm');
  expectIntent('Listo gracias', 'confirm');
  expectIntent('Ahi estare', 'confirm');
});

Deno.test('casos reales: "No puedo asistir" del boton reminder', () => {
  // 17 veces el boton se proceso como texto plano
  expectIntent('No puedo asistir', 'reschedule');
});

Deno.test('casos reales: Yeni/CF lenguaje natural', () => {
  expectIntent('Sita pa marz si purede', 'reschedule'); // typo en "marz" no captura pero el resto
  expectIntent('Holis', 'greeting');
  expectIntent('Mire q tengo clases', 'reschedule'); // q → que, tengo clases
});

Deno.test('casos reales: ack tras confirmacion no abre menu nuevo', () => {
  assert(isAcknowledgment('ok'));
  assert(isAcknowledgment('Muchas gracias'));
  assert(isAcknowledgment('OK gracias'));
});
