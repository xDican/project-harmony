/**
 * CallPatientButton — boton "Llamar" / "Solicitar permiso" en ConversationDetail.
 *
 * Sprint 6 refactor: consume CallContext (single source of truth). Sin listener
 * Realtime propio; las permissions se mantienen sincronizadas a nivel provider.
 */

import { useCallback, useState } from "react";
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
import { useCallContext } from "@/context/CallContext";
import { toast } from "sonner";

interface Props {
  conversationId: string;
  patientPhone: string;
  patientName: string | null;
}

export function CallPatientButton({ conversationId, patientPhone, patientName }: Props) {
  const { activeCall, getPermissionFor, initiateOutgoing, requestPermission } = useCallContext();
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);

  const perm = getPermissionFor(conversationId);

  // Derivar permState desde el provider (no fetch local)
  const nowIso = new Date().toISOString();
  let permState: "granted" | "missing" | "expired" | "rejected";
  if (!perm) {
    permState = "missing";
  } else if (perm.status === "rejected") {
    permState = "rejected";
  } else if (perm.status === "granted") {
    permState = !perm.expiresAt || perm.expiresAt > nowIso ? "granted" : "expired";
  } else {
    permState = "missing";
  }

  const handleClick = useCallback(() => {
    if (permState === "granted") {
      void initiateOutgoing({ conversationId, patientPhone, patientName });
    } else {
      setPermModalOpen(true);
    }
  }, [permState, conversationId, patientPhone, patientName, initiateOutgoing]);

  const handleRequestPermission = useCallback(async () => {
    setRequestingPerm(true);
    try {
      await requestPermission(conversationId);
      toast.success("Solicitud enviada al paciente. Cuando acepte, podras llamar.");
      setPermModalOpen(false);
    } catch (e) {
      console.error("[CallPatientButton] request permission failed:", (e as Error).message);
      toast.error((e as Error).message ?? "No se pudo enviar la solicitud");
    } finally {
      setRequestingPerm(false);
    }
  }, [conversationId, requestPermission]);

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
        disabled={isCallActive}
        className="gap-2"
        aria-label={buttonLabel}
      >
        <ButtonIcon className="h-4 w-4" />
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
                  Le enviaremos un mensaje pidiendole que acepte recibir tu llamada.
                </span>
              )}
              {permState === "expired" && (
                <span>
                  El permiso anterior expiró ({perm?.expiresAt && new Date(perm.expiresAt).toLocaleDateString("es")}).
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
