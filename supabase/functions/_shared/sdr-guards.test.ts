// Tests para sdr-guards.ts — guards deterministas del bot SDR.
// Correr: deno test --no-check supabase/functions/_shared/sdr-guards.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { checkPriceGuard, checkTimeGuard } from "./sdr-guards.ts";

// Catálogo piloto: Evaluación L460 + Blanqueamiento L3800 públicos.
const PRECIOS = [460, 3800];

// =====================================================================
// checkPriceGuard
// =====================================================================

Deno.test("precio público exacto pasa", () => {
  assert(checkPriceGuard("La evaluación cuesta L460. ¿Le agendo?", PRECIOS).ok);
});

Deno.test("precio con separador de miles pasa (L3,800)", () => {
  assert(checkPriceGuard("El blanqueamiento tiene un costo de L3,800.", PRECIOS).ok);
});

Deno.test("precio con decimales .00 pasa (L460.00)", () => {
  assert(checkPriceGuard("Son L460.00 por la evaluación.", PRECIOS).ok);
});

Deno.test("variantes de marca: Lps y lempiras", () => {
  assert(checkPriceGuard("Cuesta Lps 460", PRECIOS).ok);
  assert(checkPriceGuard("Son 3800 lempiras... perdón, Lps 3,800", PRECIOS).ok);
  assert(checkPriceGuard("El total es L. 460", PRECIOS).ok);
});

Deno.test("precio INVENTADO se bloquea", () => {
  const r = checkPriceGuard("La limpieza cuesta L700. ¿Le agendo?", PRECIOS);
  assertEquals(r.ok, false);
  assertEquals(r.violations.length, 1);
});

Deno.test("precio inventado junto a uno válido se bloquea igual", () => {
  const r = checkPriceGuard("Evaluación L460 y la prótesis anda por L15,000.", PRECIOS);
  assertEquals(r.ok, false);
});

Deno.test("números sin marca de moneda NO se validan (horas, pisos, conteos)", () => {
  assert(checkPriceGuard("Estamos en el piso 12, torre 1. Son 2 sesiones.", PRECIOS).ok);
});

Deno.test("sin precios públicos, cualquier L-cifra es violación", () => {
  assertEquals(checkPriceGuard("Cuesta L500", []).ok, false);
});

// =====================================================================
// checkTimeGuard
// =====================================================================

const SLOTS = ["14:00", "15:30"]; // 2:00 PM y 3:30 PM

Deno.test("horas ofrecidas en formato 12h pasan", () => {
  assert(checkTimeGuard("Tengo 2:00 PM o 3:30 PM disponibles, ¿cuál le queda?", SLOTS).ok);
});

Deno.test("variantes de meridiem pasan (p.m., pm, p. m.)", () => {
  assert(checkTimeGuard("A las 2:00 p.m. o 3:30 pm", SLOTS).ok);
});

Deno.test("hora en 24h ofrecida pasa", () => {
  assert(checkTimeGuard("Le espero a las 14:00.", SLOTS).ok);
});

Deno.test("hora ambigua sin AM/PM pasa si alguna lectura está ofrecida", () => {
  assert(checkTimeGuard("¿Le parece a las 2:00?", SLOTS).ok);
});

Deno.test("hora INVENTADA se bloquea", () => {
  const r = checkTimeGuard("También tengo 5:00 PM si prefiere.", SLOTS);
  assertEquals(r.ok, false);
  assertEquals(r.violations, ["5:00 PM"]);
});

Deno.test("hora pelada con am/pm inventada se bloquea (2 pm ok, 6 pm no)", () => {
  assert(checkTimeGuard("Nos vemos a las 2 pm", SLOTS).ok);
  assertEquals(checkTimeGuard("¿Puede a las 6 pm?", SLOTS).ok, false);
});

Deno.test("hora pelada SIN am/pm no se valida (piso 12)", () => {
  assert(checkTimeGuard("Estamos en el piso 12, torre 1.", SLOTS).ok);
});

Deno.test("set vacío: cualquier hora es violación", () => {
  assertEquals(checkTimeGuard("Tengo 2:00 PM", []).ok, false);
});

Deno.test("reply sin horas ni precios pasa ambos guards", () => {
  const msg = "¡Hola! ¿En qué tratamiento está interesada?";
  assert(checkPriceGuard(msg, PRECIOS).ok);
  assert(checkTimeGuard(msg, []).ok);
});
