/**
 * getHomePath — pantalla de aterrizaje según la vertical de la organización.
 *
 * `ventas` (PatPat Live) no usa calendario: aterriza en Pedidos. El resto
 * (clinica, bienes_raices, null mientras carga) conserva /calendario.
 */
export function getHomePath(vertical: string | null | undefined): string {
  return vertical === "ventas" ? "/pedidos" : "/calendario";
}
