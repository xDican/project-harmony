import type { OrderStatus } from "@/lib/ordersApi";

/** Colores del badge de estado (mismo criterio que statusVariant de PropertyCard). */
export function orderStatusStyle(status: OrderStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case "reservado":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "en_revision":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/40",
        text: "text-blue-700 dark:text-blue-300",
        dot: "bg-blue-500",
      };
    case "pagado":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        text: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "entregado":
      return { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" };
    case "expirado":
    case "cancelado":
      return {
        bg: "bg-slate-100 dark:bg-slate-900/40",
        text: "text-slate-600 dark:text-slate-400",
        dot: "bg-slate-400",
      };
  }
}
