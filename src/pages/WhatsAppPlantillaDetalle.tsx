import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTemplateById } from '@/lib/whatsappApi';
import { t, statusLabel, getDateLocale } from '@/lib/i18n';

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
              <p className="text-muted-foreground">{t('td.not_found')}</p>
              <Button variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                {t('td.back')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

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
                <p className="text-muted-foreground">{t('td.category')}</p>
                <p className="font-medium">{template.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('td.language')}</p>
                <p className="font-medium">{template.language}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('td.status')}</p>
                <Badge variant={template.status === 'APPROVED' ? 'default' : 'secondary'}>
                  {statusLabel(template.status)}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">{t('td.updated')}</p>
                <p className="font-medium">{new Date(template.updated_at).toLocaleDateString(getDateLocale())}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('td.body')}</p>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {template.body}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                {t('td.back')}
              </Button>
              <Button disabled>
                {t('td.use_btn')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
