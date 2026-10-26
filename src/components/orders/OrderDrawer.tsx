/**
 * OrderDrawer — detalle de un pedido y acciones de verificación (Hub + Drawer).
 *
 * Acciones según ORDER_TRANSITIONS (espejo del trigger de BD, que sigue siendo
 * la verdad: si el pedido cambió por otro lado, el error PS003 llega al toast).
 * Pagar y cancelar piden confirmación: pagar es una decisión de dinero y
 * cancelar devuelve las piezas al stock.
 */

import { useEffect, useState } from "react";
import { Check, MessageCircle, Undo2, Truck, X } from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ORDER_TRANSITIONS,
  type DeliveryMethod,
  type OrderDetailsPatch,
  type OrderStatus,
  type OrderWithItems,
} from "@/lib/ordersApi";
import { formatMoney } from "@/lib/formatMoney";
import { ProductPhoto } from "@/components/products/ProductPhoto";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ExpiryCountdown } from "@/components/orders/ExpiryCountdown";

interface OrderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderWithItems;
  onChangeStatus: (id: string, status: OrderStatus) => Promise<unknown>;
  onUpdateDetails: (id: string, patch: OrderDetailsPatch) => Promise<unknown>;
}

const NO_METHOD = "none";

export function OrderDrawer({ open, onOpenChange, order, onChangeStatus, onUpdateDetails }: OrderDrawerProps) {
  const [method, setMethod] = useState<string>(NO_METHOD);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<"pagado" | "cancelado" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset solo al abrir / al cambiar de pedido (los refetch por polling no pisan lo escrito)
  const orderId = order?.id;
  useEffect(() => {
    if (!open || !order) return;
    setMethod(order.delivery_method ?? NO_METHOD);
    setAddress(order.delivery_address ?? "");
    setNotes(order.notes ?? "");
    setError(null);
    setConfirming(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  if (!order) {
    return (
      <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Pedido">
        <p className="text-sm text-muted-foreground">Pedido no encontrado.</p>
      </ResponsiveModal>
    );
  }

  const status = order.status as OrderStatus;
  const allowed = ORDER_TRANSITIONS[status];
  const editable = status === "reservado" || status === "en_revision" || status === "pagado";

  const detailsDirty =
    (order.delivery_method ?? NO_METHOD) !== method ||
    (order.delivery_address ?? "") !== address ||
    (order.notes ?? "") !== notes;

  const run = async (fn: () => Promise<unknown>, okTitle: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast({ title: okTitle });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar la acción.";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (next: OrderStatus, okTitle: string) =>
    run(() => onChangeStatus(order.id, next), okTitle);

  const saveDetails = () =>
    run(
      () =>
        onUpdateDetails(order.id, {
          delivery_method: method === NO_METHOD ? null : (method as DeliveryMethod),
          delivery_address: address.trim() || null,
          notes: notes.trim() || null,
        }),
      "Datos de entrega guardados",
    );

  const waPhone = order.customer_phone.replace(/\D/g, "");

  const footer = (
    <div className="flex flex-col gap-2 w-full">
      {allowed.includes("pagado") && (
        <Button className="w-full" disabled={busy} onClick={() => setConfirming("pagado")}>
          <Check className="h-4 w-4 mr-1.5" />
          Confirmar pago
        </Button>
      )}
      {allowed.includes("entregado") && (
        <Button className="w-full" disabled={busy} onClick={() => changeStatus("entregado", "Pedido entregado")}>
          <Truck className="h-4 w-4 mr-1.5" />
          Marcar entregado
        </Button>
      )}
      <div className="flex gap-2">
        {status === "en_revision" && (
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => changeStatus("reservado", "Comprobante rechazado: el pedido volvió a reservado")}
          >
            <Undo2 className="h-4 w-4 mr-1.5" />
            Rechazar comprobante
          </Button>
        )}
        {allowed.includes("cancelado") && (
          <Button
            variant="outline"
            className="flex-1 text-destructive"
            disabled={busy}
            onClick={() => setConfirming("cancelado")}
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancelar pedido
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title={order.customer_name || order.customer_phone}
        subtitle={<OrderStatusBadge status={status} />}
        footer={allowed.length > 0 ? footer : undefined}
        mobileFullScreen
        desktopMaxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          {status === "en_revision" && (
            <Alert>
              <AlertDescription>
                El cliente envió una imagen. Verificá en tu banco que el pago llegó y confirmá. Mientras tanto
                las piezas siguen apartadas y el pedido no vence. Si la imagen no es un comprobante, usá
                “Rechazar comprobante”: el pedido vuelve a Reservado y el cliente puede enviar el bueno.
              </AlertDescription>
            </Alert>
          )}
          {status === "reservado" && (
            <p className="text-sm text-muted-foreground">
              Esperando el comprobante · <ExpiryCountdown expiresAt={order.expires_at} />
            </p>
          )}

          <div className="space-y-2">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-14 shrink-0">
                  {item.products?.photos?.[0] ? (
                    <ProductPhoto path={item.products.photos[0]} />
                  ) : (
                    <div className="aspect-square rounded-lg bg-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight">{item.products?.code ?? "—"}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{item.products?.name}</p>
                </div>
                <div className="text-right text-sm shrink-0">
                  <p className="font-medium">{formatMoney(item.subtotal, order.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatMoney(item.unit_price, order.currency)}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold text-primary">{formatMoney(order.total, order.currency)}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-fit" asChild>
            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 mr-1.5" />
              {order.customer_phone}
            </a>
          </Button>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Entrega</Label>
              <Select value={method} onValueChange={setMethod} disabled={!editable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_METHOD}>Sin definir</SelectItem>
                  <SelectItem value="envio">Envío</SelectItem>
                  <SelectItem value="retiro">Retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === "envio" && (
              <div className="space-y-1.5">
                <Label>Dirección de envío</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} disabled={!editable} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!editable} />
            </div>
            {editable && detailsDirty && (
              <Button variant="secondary" size="sm" onClick={saveDetails} disabled={busy}>
                Guardar datos de entrega
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </ResponsiveModal>

      <AlertDialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === "pagado" ? "¿Confirmar el pago?" : "¿Cancelar este pedido?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === "pagado"
                ? `Confirmás que recibiste ${formatMoney(order.total, order.currency)} de ${order.customer_name || order.customer_phone}.`
                : "Las piezas vuelven al stock y quedan disponibles para otros clientes. Esto no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = confirming;
                setConfirming(null);
                if (target === "pagado") void changeStatus("pagado", "Pago confirmado");
                if (target === "cancelado") void changeStatus("cancelado", "Pedido cancelado");
              }}
            >
              {confirming === "pagado" ? "Sí, confirmar pago" : "Sí, cancelar pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
