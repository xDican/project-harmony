/**
 * Capa de ventas del bot (PatPat Live, vertical `ventas`) — paralela a sdr.ts
 * (medico) y realestate.ts (Bruno); NO los modifica ni los importa mas alla de
 * los tipos compartidos.
 *
 * ESTADO (2 Nov 2026, Fase 1): STUB. Devuelve null siempre, o sea que el flujo
 * clasico responde exactamente como antes. Existe para que la rama `ventas` de
 * index.ts quede cableada y desplegable sin cambiar comportamiento. La
 * conversacion libre (Fase 3) y el comprobante (Fase 4) se implementan aqui.
 *
 * Invariantes que debe respetar la version completa (mismos que sdr/realestate):
 * - Inerte para cualquier org con vertical != 'ventas' (gate en index.ts).
 * - El LLM jamas inventa precio, stock ni codigo: todo sale de la BD.
 * - Todo fallo (LLM caido, presupuesto, JSON invalido) -> return null.
 * - Handoff SILENCIOSO hacia el comprador (principio Coexistence).
 */

// deno-lint-ignore-file no-explicit-any

import type { SdrArgs, SdrBotResponse } from "./sdr.ts";

export async function maybeHandleVentas(_args: SdrArgs): Promise<SdrBotResponse | null> {
  return null;
}
