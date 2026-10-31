/** Formato de precio para la vertical ventas: "L 1,200" (HNL) o "USD 12.50". */
export function formatMoney(amount: number, currency: string): string {
  const prefix = currency === "HNL" ? "L" : currency;
  return `${prefix} ${amount.toLocaleString("es-HN", { maximumFractionDigits: 2 })}`;
}
