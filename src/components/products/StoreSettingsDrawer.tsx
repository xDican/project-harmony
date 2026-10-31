/**
 * StoreSettingsDrawer — ajustes de la tienda (solo admin).
 *
 * Instrucciones de pago/retiro/envío que usa el bot, minutos de reserva con su
 * tope, y prefijo de los códigos de producto. Si la org aún no tiene fila,
 * el form arranca con los defaults de BD y `save` la crea (upsert).
 */

import { useEffect, useState } from "react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { StoreSettings, StoreSettingsUpdate } from "@/lib/storeSettingsApi";

interface StoreSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: StoreSettings | null;
  onSave: (patch: StoreSettingsUpdate) => Promise<StoreSettings>;
}

// Mismos defaults que la BD (store_settings)
const DEFAULT_PREFIX = "A";
const DEFAULT_MINUTES = 30;
const DEFAULT_MAX_MINUTES = 60;

export function StoreSettingsDrawer({ open, onOpenChange, settings, onSave }: StoreSettingsDrawerProps) {
  const isMobile = useIsMobile();
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const [maxMinutes, setMaxMinutes] = useState(String(DEFAULT_MAX_MINUTES));
  const [prefix, setPrefix] = useState(DEFAULT_PREFIX);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset solo al abrir (los refetch no deben pisar lo que se está escribiendo)
  useEffect(() => {
    if (!open) return;
    setPaymentInstructions(settings?.payment_instructions ?? "");
    setPickupAddress(settings?.pickup_address ?? "");
    setDeliveryNotes(settings?.delivery_notes ?? "");
    setMinutes(String(settings?.reservation_minutes ?? DEFAULT_MINUTES));
    setMaxMinutes(String(settings?.max_reservation_minutes ?? DEFAULT_MAX_MINUTES));
    setPrefix(settings?.code_prefix ?? DEFAULT_PREFIX);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    const min = Number(minutes);
    const max = Number(maxMinutes);
    if (!Number.isInteger(min) || min < 1) {
      setError("Los minutos de reserva deben ser 1 o más.");
      return;
    }
    if (!Number.isInteger(max) || max < min) {
      setError("El tope de reserva no puede ser menor que los minutos de reserva.");
      return;
    }
    // Misma regla que el CHECK de BD: una letra A-Z sin I ni O (se confunden con 1 y 0)
    if (!/^[A-HJ-NP-Z]$/.test(prefix)) {
      setError("El prefijo debe ser una letra de la A a la Z, sin I ni O.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        payment_instructions: paymentInstructions.trim() || null,
        pickup_address: pickupAddress.trim() || null,
        delivery_notes: deliveryNotes.trim() || null,
        reservation_minutes: min,
        max_reservation_minutes: max,
        code_prefix: prefix,
      });
      toast({ title: "Ajustes guardados" });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los ajustes.");
    } finally {
      setSaving(false);
    }
  };

  const footer = isMobile ? (
    <Button className="w-full" onClick={handleSave} disabled={saving}>
      {saving ? "Guardando..." : "Guardar ajustes"}
    </Button>
  ) : (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar ajustes"}
      </Button>
    </>
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Ajustes de la tienda"
      footer={footer}
      mobileFullScreen
      desktopMaxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label>Instrucciones de pago</Label>
          <Textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            rows={4}
            placeholder="Ej. Transferencia a Banco X, cuenta 123..., a nombre de ... Enviá el comprobante por aquí."
          />
          <p className="text-xs text-muted-foreground">El bot se las manda al cliente al cerrar el pedido.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Dirección de retiro</Label>
          <Textarea value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label>Notas de envío</Label>
          <Textarea
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            rows={2}
            placeholder="Ej. Envíos a todo el país por Cargo Expreso, 2-3 días."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Reserva (minutos)</Label>
            <NumericInput value={minutes} onChange={setMinutes} />
          </div>
          <div className="space-y-1.5">
            <Label>Tope total (minutos)</Label>
            <NumericInput value={maxMinutes} onChange={setMaxMinutes} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Cada producto nuevo reinicia la reserva, pero nunca pasa del tope desde el primer producto.
          Un comprobante en revisión no vence.
        </p>

        <div className="space-y-1.5">
          <Label>Prefijo de códigos</Label>
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 1))}
            maxLength={1}
            className="w-20 text-center text-lg font-bold"
          />
          <p className="text-xs text-muted-foreground">Solo afecta los códigos nuevos (A101, A102…).</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </ResponsiveModal>
  );
}
