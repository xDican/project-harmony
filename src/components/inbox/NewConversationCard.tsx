import { useState } from "react";
import { Send, Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/context/UserContext";
import { useInbox } from "@/context/InboxContext";
import {
  initiateConversation,
  sendTemplateMessage,
  templateBodyText,
  type TemplateType,
} from "@/lib/inboxActions";
import type { InputDetection } from "@/lib/waLinkParser";
import type { ConversationListRow } from "@/hooks/useConversations";

interface NewConversationCardProps {
  detection: InputDetection & { type: "wa_link" | "phone" };
  onConversationCreated: (conv: ConversationListRow) => void;
}

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  confirmation: "Confirmación de cita",
  reminder_24h: "Recordatorio 24h",
  reminder_3d: "Recordatorio del día",
};

export function NewConversationCard({
  detection,
  onConversationCreated,
}: NewConversationCardProps) {
  const { organizationId } = useCurrentUser();
  const { upsertConversation } = useInbox();

  const phone =
    detection.type === "wa_link" ? detection.data.phone : detection.phone;
  const parsed = detection.type === "wa_link" ? detection.parsed : null;

  const [patientName, setPatientName] = useState(parsed?.patientName ?? "");
  const [doctor, setDoctor] = useState(parsed?.doctor ?? "Skin Medic");
  const [date, setDate] = useState(parsed?.date ?? "");
  const [time, setTime] = useState(parsed?.time ?? "");
  const [templateType, setTemplateType] = useState<TemplateType>(
    parsed?.templateType ?? "confirmation",
  );
  const [isSending, setIsSending] = useState(false);

  const formattedPhone = phone.startsWith("504")
    ? `+${phone.slice(0, 3)} ${phone.slice(3)}`
    : `+${phone}`;

  const canSend =
    !!organizationId &&
    !!doctor.trim() &&
    !!date.trim() &&
    !!time.trim();

  async function handleSend() {
    if (!canSend || !organizationId) return;
    setIsSending(true);

    try {
      const name = patientName.trim() || undefined;
      const conv = await initiateConversation({
        organizationId,
        patientPhone: phone,
        patientName: name,
      });

      const templateParams: Record<string, string> = {
        "1": name ?? "Estimado paciente",
        "2": doctor.trim(),
        "3": date.trim(),
        "4": time.trim(),
      };

      await sendTemplateMessage({
        conversationId: conv.id,
        organizationId,
        templateType,
        templateParams,
        patientPhone: conv.patient_phone,
      });

      const placeholder: ConversationListRow = {
        id: conv.id,
        organization_id: conv.organization_id,
        whatsapp_line_id: conv.whatsapp_line_id,
        patient_phone: conv.patient_phone,
        patient_id: null,
        patient_name: conv.patient_name,
        status: conv.status as ConversationListRow["status"],
        assigned_to: null,
        last_message_at: new Date().toISOString(),
        last_inbound_at: null,
        unread_count: 0,
        last_message: {
          body: templateBodyText(templateType, templateParams),
          transcription: null,
          message_type: "text",
          source: "template",
          created_at: new Date().toISOString(),
          call_status: null,
          call_direction: null,
        },
      };

      upsertConversation(placeholder);
      onConversationCreated(placeholder);

      toast.success("Plantilla enviada", {
        description: `Mensaje enviado a ${patientName.trim()}`,
        position: "top-right",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al enviar", {
        description: msg,
        position: "top-right",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="p-4">
      <Card className="border-green-500/40 bg-green-50/30 dark:bg-green-950/10">
        <CardContent className="pt-4 pb-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
            <MessageSquarePlus className="h-4 w-4" />
            {detection.type === "wa_link"
              ? "Link wa.me detectado"
              : "Nueva conversación"}
          </div>

          {/* Teléfono (readonly) */}
          <div className="text-sm text-muted-foreground">
            Tel: <span className="font-mono font-medium text-foreground">{formattedPhone}</span>
          </div>

          {/* Decoded text preview */}
          {detection.type === "wa_link" && detection.data.text && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-20 overflow-auto break-words">
              {detection.data.text}
            </div>
          )}

          {/* Campos editables */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Nombre paciente"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Doctor"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Fecha (ej: lunes 26 mayo)"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Hora (ej: 10:00 AM)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Tipo de template */}
          <Select
            value={templateType}
            onValueChange={(v) => setTemplateType(v as TemplateType)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(TEMPLATE_LABELS) as [TemplateType, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value} className="text-sm">
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          {/* Botón enviar */}
          <Button
            onClick={handleSend}
            disabled={!canSend || isSending}
            className="w-full h-9 bg-green-600 hover:bg-green-700 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar {TEMPLATE_LABELS[templateType].toLowerCase()}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
