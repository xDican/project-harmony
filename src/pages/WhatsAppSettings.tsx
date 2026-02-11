import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { startOAuth, listTemplates, type WhatsAppTemplate } from '@/lib/whatsappApi';
import { useToast } from '@/hooks/use-toast';
import { t, getLang, setLang, statusLabel, getDateLocale, type Lang } from '@/lib/i18n';

export default function WhatsAppSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lang, setLangState] = useState<Lang>(getLang);
  const [isConnected, setIsConnected] = useState(() => localStorage.getItem('meta_connected') === 'true');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  function handleLangChange(value: string) {
    if (value === 'es' || value === 'en') {
      setLang(value);
      setLangState(value);
    }
  }

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
      setConnectError(t('ws.no_auth_url'));
      setConnectLoading(false);
    }
  }

  return (
    <MainLayout backTo="/configuracion">
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl md:mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t('ws.title')}</h1>
          <ToggleGroup type="single" value={lang} onValueChange={handleLangChange} size="sm" variant="outline">
            <ToggleGroupItem value="es" className="text-xs px-2">ES</ToggleGroupItem>
            <ToggleGroupItem value="en" className="text-xs px-2">EN</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Card 1: Meta Connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('ws.meta_title')}</CardTitle>
              {isConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('ws.connected')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {t('ws.not_connected')}
                </Badge>
              )}
            </div>
            <CardDescription>{t('ws.meta_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectError && (
              <Alert variant="destructive">
                <AlertDescription>{connectError}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleConnect} disabled={connectLoading}>
              {connectLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('ws.connect_btn')}
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t('ws.templates_title')}</CardTitle>
                <CardDescription>{t('ws.templates_desc')}</CardDescription>
              </div>
              <Button size="sm" onClick={() => navigate('/configuracion/whatsapp/plantillas/nueva')}>
                <Plus className="h-4 w-4" /> {t('ws.create_template')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isMockMode && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('ws.mock_banner')}</AlertDescription>
              </Alert>
            )}

            {templatesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('ws.no_templates')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ws.col_name')}</TableHead>
                    <TableHead>{t('ws.col_category')}</TableHead>
                    <TableHead>{t('ws.col_language')}</TableHead>
                    <TableHead>{t('ws.col_status')}</TableHead>
                    <TableHead>{t('ws.col_updated')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tpl) => (
                    <TableRow
                      key={tpl.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/configuracion/whatsapp/plantillas/${tpl.id}`)}
                    >
                      <TableCell className="font-medium">{tpl.name}</TableCell>
                      <TableCell>{tpl.category}</TableCell>
                      <TableCell>{tpl.language}</TableCell>
                      <TableCell>
                        <Badge variant={tpl.status === 'APPROVED' ? 'default' : 'secondary'}>
                          {statusLabel(tpl.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(tpl.updated_at).toLocaleDateString(getDateLocale())}
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
