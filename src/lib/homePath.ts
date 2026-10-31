/**
 * Reglas de ruta por vertical de la organización.
 *
 * `ventas` (PatPat Live) no usa calendario/citas/pacientes: aterriza en Pedidos.
 * El resto (clinica, bienes_raices, null mientras carga) conserva /calendario.
 */

/** Pantallas de clínica que una org `ventas` no debe abrir (ni a mano por URL). */
const CLINIC_ONLY_PREFIXES = [
  "/calendario",
  "/agenda-secretaria",
  "/agenda-medico",
  "/citas",
  "/pacientes",
  "/propiedades",
  "/admin/clinics",
  "/admin/calendars",
  "/admin/doctors",
  "/admin/specialties",
  "/admin/motor",
  "/admin/reports",
];

/** Pantallas exclusivas de ventas: las demás verticales no las ven. */
const VENTAS_ONLY_PREFIXES = ["/productos", "/pedidos"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function getHomePath(vertical: string | null | undefined): string {
  return vertical === "ventas" ? "/pedidos" : "/calendario";
}

/**
 * true si `pathname` no corresponde a la vertical. El home de cada vertical
 * nunca está bloqueado para ella, así que redirigir ahí no puede hacer bucle.
 */
export function isRouteBlockedForVertical(
  vertical: string | null | undefined,
  pathname: string,
): boolean {
  if (vertical === "ventas") return matchesPrefix(pathname, CLINIC_ONLY_PREFIXES);
  return matchesPrefix(pathname, VENTAS_ONLY_PREFIXES);
}
