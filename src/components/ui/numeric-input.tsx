import * as React from "react";
import { Input } from "@/components/ui/input";

export interface NumericInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "inputMode" | "onChange" | "value"> {
  /** Valor crudo sin formato (ej. "1500000") — lo que se guarda/envía. */
  value: string;
  onChange: (value: string) => void;
  /** Admite un punto decimal. Default false (solo enteros). */
  allowDecimal?: boolean;
}

function formatWithCommas(raw: string): string {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

function stripCommas(formatted: string): string {
  return formatted.replace(/,/g, "");
}

/**
 * NumericInput — input que solo admite dígitos (y opcionalmente 1 punto
 * decimal), con teclado numérico en mobile confiable y separador de miles
 * en vivo (ej. "1,500,000") para mejor referencia visual — pedido explícito
 * de Diego (10 Ago 2026, piloto Propiedades).
 *
 * `type="number"` no siempre dispara el teclado numérico en todos los
 * navegadores y además acepta cosas raras como notación científica ("1e5").
 * `type="text"` + `inputMode` es el patrón mobile-friendly real; el filtro
 * de teclas bloquea cualquier caracter no numérico al escribir. El valor
 * mostrado lleva comas de miles; `value`/`onChange` siempre trabajan con el
 * número crudo sin comas — quien use el componente nunca ve el formato.
 *
 * Hoy solo se usa en `PropertyDrawer`, pero queda como primitivo reusable
 * para el resto de la app a futuro (pedido explícito de estandarizar).
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, allowDecimal = false, ...props }, ref) => {
    const pattern = allowDecimal ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={formatWithCommas(value)}
        onChange={(e) => {
          const raw = stripCommas(e.target.value);
          if (pattern.test(raw)) onChange(raw);
        }}
        {...props}
      />
    );
  },
);
NumericInput.displayName = "NumericInput";
