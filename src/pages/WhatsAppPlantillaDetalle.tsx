import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTemplateById } from '@/lib/whatsappApi';

export default function WhatsAppPlantillaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const template = id ? getTemplateById(id) : null;

  if (!template) {
    return (
      <MainLayout backTo="/configuracion/whatsapp">
        <div className="p-4 md:p-6 lg:p-8 max-w-2xl md:mx-auto">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-muted-foreground">Plantilla no encontrada.</p>
              <Button variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const statusLabel: Record<string, string> = {
    APPROVED: 'Aprobada',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazada',
    borrador: 'Borrador',
  };

  return (
    <MainLayout backTo="/configuracion/whatsapp">
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl md:mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{template.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Categoría</p>
                <p className="font-medium">{template.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Idioma</p>
                <p className="font-medium">{template.language}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <Badge variant={template.status === 'APPROVED' ? 'default' : 'secondary'}>
                  {statusLabel[template.status] ?? template.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Última actualización</p>
                <p className="font-medium">{new Date(template.updated_at).toLocaleDateString('es-MX')}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Cuerpo del mensaje</p>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {template.body}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                Volver
              </Button>
              <Button disabled>
                Usar en confirmación de cita
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
