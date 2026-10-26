/**
 * storeErrors — traduce los errores de negocio de la vertical ventas
 * (PatPat Live) a texto en español.
 *
 * La BD levanta `RAISE EXCEPTION 'CODIGO: detalle' USING ERRCODE = 'PSxxx'`.
 * PostgREST devuelve el ERRCODE en `error.code` y el texto en `error.message`.
 */

const BY_CODE: Record<string, string> = {
  PS001: "No hay stock suficiente de este producto.",
  PS002: "El producto no está disponible.",
  PS003: "Ese cambio de estado no está permitido para el pedido.",
  PS004: "La solicitud no es válida.",
  PS005: "Solo se pueden cambiar el estado, la entrega, la dirección y las notas del pedido.",
};

const BY_PREFIX: Array<[string, string]> = [
  ["STOCK_INSUFICIENTE", BY_CODE.PS001],
  ["PRODUCTO_NO_DISPONIBLE", BY_CODE.PS002],
  ["ORDEN_TRANSICION_INVALIDA", BY_CODE.PS003],
  ["SOLICITUD_INVALIDA", BY_CODE.PS004],
  ["ORDEN_CAMPO_PROTEGIDO", BY_CODE.PS005],
];

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

/**
 * Devuelve `${contexto}: ${texto amigable}`. Si el error no es de negocio,
 * conserva el mensaje original para no esconder fallas reales.
 */
export function friendlyStoreError(
  context: string,
  error: PostgrestLikeError,
): Error {
  const message = error.message ?? "";
  if (error.code === "23505") {
    return new Error(`${context}: ese código ya existe.`);
  }
  if (error.code && BY_CODE[error.code]) {
    return new Error(`${context}: ${BY_CODE[error.code]}`);
  }
  const hit = BY_PREFIX.find(([prefix]) => message.startsWith(prefix));
  if (hit) return new Error(`${context}: ${hit[1]}`);
  return new Error(`${context}: ${message}`);
}
