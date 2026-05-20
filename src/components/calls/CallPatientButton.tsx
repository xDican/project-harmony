/**
 * CallPatientButton — boton "Llamar" para iniciar llamada outbound al paciente.
 *
 * Verifica call_permissions vigente antes de iniciar:
 *   - granted + no expirado → click directo inicia llamada (activeCall outbound)
 *   - sin permission o expirado → click abre modal para solicitar permission via
 *     inbox-request-call-permission. Despues el paciente debe aceptar en su
 *     WhatsApp para que se habilite el llamado.
 *
 * Sprint 6 C.2.
 */

import { useCallback, useEffect, useState } from "react";
import { Phone, PhoneOutgoing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIncomingCall } from "@/context/IncomingCallContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPABASE_FUNCTIONS_BASE =
  "https://soxrlxvivuplezssgssq.supabase.co/functions/v1";

type PermissionState = "loading" | "granted" | "missing" | "expired" | "rejected";

interface Props {
  conversationId: string;
  patientPhone: string;
  patientName: string | null;
}

export function CallPatientButton({ conversationId, patientPhone, patientName }: Props) {
  const { activeCall, initiateOutgoingCall } = useIncomingCall();
  const [permState, setPermState] = useState<PermissionState>("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);

  const refreshPermission = useCallback(async () => {
    setPermState("loading");
    const { data, error } = await supabase
      .from("call_permissions")
      .select("status, expires_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[CallPatientButton] permission read failed:", error.message);
      setPermState("missing");
      return;
    }
    if (!data) {
      setPermState("missing");
      setExpiresAt(null);
      return;
    }
    setExpiresAt(data.expires_at);

    if (data.status === "rejected") {
      setPermState("rejected");
    } else if (data.status === "granted") {
      // expires_at NULL = permanente (is_permanent del accept del paciente)
      const isVigente = !data.expires_at || data.expires_at > new Date().toISOString();
      setPermState(isVigente ? "granted" : "expired");
    } else {
      setPermState("missing");
    }
  }, [conversationId]);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  // Listener Realtime: cuando llega INSERT/UPDATE en call_permissions para
  // esta conversation, refresh inmediato (no esperar el siguiente click).
  useEffect(() => {
    const channel = supabase
      .channel(`call-perms:${conversationId}`)
      .on(
        // @ts-expect-error supabase-js postgres_changes types
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_permissions",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refreshPermission();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refreshPermission]);

  const handleClick = useCallback(() => {
    if (permState === "granted") {
      initiateOutgoingCall({ conversationId, patientPhone, patientName });
    } else {
      setPermModalOpen(true);
    }
  }, [permState, conversationId, patientPhone, patientName, initiateOutgoingCall]);

  const handleRequestPermission = useCallback(async () => {
    setRequestingPerm(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/inbox-request-call-permission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ conversationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[CallPatientButton] request permission failed:", data);
        toast.error(data?.error ?? "No se pudo enviar la solicitud");
        return;
      }
      toast.success("Solicitud enviada al paciente. Cuando acepte, podrás llamar.");
      setPermModalOpen(false);
    } catch (e) {
      console.error("[CallPatientButton] request permission threw:", (e as Error).message);
      toast.error("Error enviando solicitud");
    } finally {
      setRequestingPerm(false);
    }
  }, [conversationId]);

  // Si hay una llamada activa, deshabilitar el boton
  const isCallActive = !!activeCall;

  const buttonLabel = permState === "granted" ? "Llamar" : "Solicitar permiso";
  const ButtonIcon = permState === "granted" ? PhoneOutgoing : Phone;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={permState === "loading" || isCallActive}
        className="gap-2"
        aria-label={buttonLabel}
      >
        {permState === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ButtonIcon className="h-4 w-4" />
        )}
        <span className="hidden md:inline">{buttonLabel}</span>
      </Button>

      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Llamar al paciente</DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              {permState === "missing" && (
                <span>
                  Para llamar al paciente por WhatsApp primero necesitas su permiso.
                  Le enviaremos un mensaje pidiéndole que acepte recibir tu llamada.
                </span>
              )}
              {permState === "expired" && (
                <span>
                  El permiso anterior expiró ({expiresAt && new Date(expiresAt).toLocaleDateString("es")}).
                  Reenviar la solicitud al paciente.
                </span>
              )}
              {permState === "rejected" && (
                <span className="text-destructive">
                  El paciente rechazó tu solicitud anterior. Esperá al menos 7 días
                  antes de enviar otra (limite Meta).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPermModalOpen(false)}
              disabled={requestingPerm}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestPermission}
              disabled={requestingPerm || permState === "rejected"}
            >
              {requestingPerm && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
