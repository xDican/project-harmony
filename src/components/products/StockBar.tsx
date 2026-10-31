/**
 * StockBar — disponibles vs reservadas de un producto, en una barra.
 *
 * `stock` en BD ya descuenta lo reservado, así que el total de piezas es
 * stock + reserved. Verde = se puede vender, ámbar = apartado en pedidos abiertos.
 */

interface StockBarProps {
  stock: number;
  reserved: number;
  /** Versión grande para el detalle del producto */
  large?: boolean;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function StockBar({ stock, reserved, large = false }: StockBarProps) {
  const total = stock + reserved;
  if (total === 0) return null;

  return (
    <div className="space-y-1">
      {large && (
        <p className="text-sm text-muted-foreground">
          {plural(total, "pieza en total", "piezas en total")}
        </p>
      )}
      <div
        className={`flex w-full overflow-hidden rounded-full bg-muted ${large ? "h-3" : "h-1.5"}`}
        role="img"
        aria-label={`${plural(stock, "disponible", "disponibles")}, ${plural(reserved, "reservada", "reservadas")}`}
      >
        <div className="bg-emerald-500" style={{ width: `${(stock / total) * 100}%` }} />
        <div className="bg-amber-500" style={{ width: `${(reserved / total) * 100}%` }} />
      </div>
      <p className={`flex flex-wrap gap-x-3 ${large ? "text-sm" : "text-xs"}`}>
        <span className="text-emerald-700 dark:text-emerald-300">
          {plural(stock, "disponible", "disponibles")}
        </span>
        {reserved > 0 && (
          <span className="text-amber-700 dark:text-amber-300">
            {plural(reserved, "reservada", "reservadas")}
          </span>
        )}
      </p>
    </div>
  );
}
