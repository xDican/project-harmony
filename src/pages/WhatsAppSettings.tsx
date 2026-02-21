import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, CheckCircle2, XCircle, AlertTriangle, Phone, Building2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { listTemplates, type WhatsAppTemplate, type EmbeddedSignupResult } from '@/lib/whatsappApi';
import MetaEmbeddedSignup from '@/components/whatsapp/MetaEmbeddedSignup';
import { useToast } from '@/hooks/use-toast';
import { t, getLang, setLang, statusLabel, getDateLocale, type Lang } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface ConnectedLine {
  phone_number: string;
  label: string;
}

export default function WhatsAppSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lang, setLangState] = useState<Lang>(getLang);
  const [connectedLine, setConnectedLine] = useState<ConnectedLine | null>(null);
  const [lineLoading, setLineLoading] = useState(true);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    loadConnectedLine();
    loadTemplates();
  }, []);

  function handleLangChange(value: string) {
    if (value === 'es' || value === 'en') {
      setLang(value);
      setLangState(value);
    }
  }

  async function loadConnectedLine() {
    setLineLoading(true);
    const { data } = await supabase
      .from('whatsapp_lines')
      .select('phone_number, label')
      .eq('is_active', true)
      .eq('provider', 'meta')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setConnectedLine(data ?? null);
    setLineLoading(false);
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    setTemplatesError(null);
    const result = await listTemplates();
    setTemplates(result.data ?? []);
    setIsMockMode(result.isMockMode);
    setTemplatesError(result.error);
    setTemplatesLoading(false);
  }

  function handleConnected(result: EmbeddedSignupResult) {
    setConnectedLine({ phone_number: result.phone_number, label: result.verified_name });
    toast({
      title: t('mes.success'),
      description: `${result.verified_name} · ${result.phone_number}`,
    });
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
              {lineLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : connectedLine ? (
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
          <CardContent>
            {lineLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando conexión...
              </div>
            ) : connectedLine ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('mes.connected_phone')}:</span>
                  <span className="font-medium">{connectedLine.phone_number}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('mes.connected_name')}:</span>
                  <span className="font-medium">{connectedLine.label}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setConnectedLine(null)}>
                  {t('mes.reconnect')}
                </Button>
              </div>
            ) : (
              <MetaEmbeddedSignup onSuccess={handleConnected} />
            )}
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
            {templatesError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{templatesError}</AlertDescription>
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
