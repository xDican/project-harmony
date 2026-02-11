import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { startOAuth, listTemplates, type WhatsAppTemplate } from '@/lib/whatsappApi';
import { useToast } from '@/hooks/use-toast';

export default function WhatsAppSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(() => localStorage.getItem('meta_connected') === 'true');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setTemplatesLoading(true);
    const result = await listTemplates();
    setTemplates(result.data ?? []);
    setIsMockMode(result.isMockMode);
    setTemplatesLoading(false);
  }

  async function handleConnect() {
    setConnectLoading(true);
    setConnectError(null);
    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    const result = await startOAuth(redirectUri);
    if (result.error) {
      setConnectError(result.error);
      setConnectLoading(false);
      return;
    }
    if (result.data?.authorize_url) {
      window.location.href = result.data.authorize_url;
    } else {
      setConnectError('No se recibió la URL de autorización.');
      setConnectLoading(false);
    }
  }

  const statusLabel: Record<string, string> = {
    APPROVED: 'Aprobada',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazada',
    borrador: 'Borrador',
  };

  return (
    <MainLayout backTo="/configuracion">
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl md:mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Configuración de WhatsApp</h1>

        {/* Card 1: Meta Connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conexión con Meta</CardTitle>
              {isConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> No conectado
                </Badge>
              )}
            </div>
            <CardDescription>Esta conexión es obligatoria para la revisión de Meta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectError && (
              <Alert variant="destructive">
                <AlertDescription>{connectError}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleConnect} disabled={connectLoading}>
              {connectLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Conectar WhatsApp Business
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Plantillas de Mensajes</CardTitle>
                <CardDescription>Requerido para la revisión de Meta</CardDescription>
              </div>
              <Button size="sm" onClick={() => navigate('/configuracion/whatsapp/plantillas/nueva')}>
                <Plus className="h-4 w-4" /> Crear plantilla
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isMockMode && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Backend no conectado aún. Ejecutando en modo demostración.
                </AlertDescription>
              </Alert>
            )}

            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aún no hay plantillas creadas.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Idioma</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Actualización</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/configuracion/whatsapp/plantillas/${t.id}`)}
                    >
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'APPROVED' ? 'default' : 'secondary'}>
                          {statusLabel[t.status] ?? t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(t.updated_at).toLocaleDateString('es-MX')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
