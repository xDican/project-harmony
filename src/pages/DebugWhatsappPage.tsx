import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react";

const DebugWhatsappPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; twilioSid?: string } | null>(null);

  const handleSendTestMessage = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          to: "whatsapp:+50433899824",
          type: "generic",
          body: "Hola Diego! Este es un mensaje de prueba desde el sistema de citas médicas. Tu cita está programada para el 2025-12-11 a las 3:00 PM.",
        },
      });

      if (error) {
        console.error("Error invoking edge function:", error);
        setResult({
          success: false,
          message: `Error: ${error.message}`,
        });
        return;
      }

      if (data?.ok) {
        setResult({
          success: true,
          message: "Mensaje enviado correctamente",
          twilioSid: data.twilioSid,
        });
      } else {
        setResult({
          success: false,
          message: data?.error || "Error desconocido al enviar el mensaje",
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setResult({
        success: false,
        message: `Error inesperado: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Debug WhatsApp
            </CardTitle>
            <CardDescription>
              Página de pruebas para la Edge Function <code className="bg-muted px-1 rounded">send-whatsapp-message</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
              <p><strong>Número destino:</strong> +504 3389 9824</p>
              <p><strong>Tipo:</strong> generic (texto plano)</p>
              <p><strong>Mensaje:</strong></p>
              <pre className="bg-background p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">
{`Hola Diego! Este es un mensaje de prueba desde el sistema de citas médicas. Tu cita está programada para el 2025-12-11 a las 3:00 PM.`}
              </pre>
            </div>

            <Button
              onClick={handleSendTestMessage}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Enviar mensaje de confirmación de cita (DEBUG)
                </>
              )}
            </Button>

            {result && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  result.success
                    ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-medium">{result.message}</p>
                  {result.twilioSid && (
                    <p className="text-sm opacity-80">
                      Twilio SID: <code className="bg-background/50 px-1 rounded">{result.twilioSid}</code>
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DebugWhatsappPage;
