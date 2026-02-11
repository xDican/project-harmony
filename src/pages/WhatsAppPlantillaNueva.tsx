import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createTemplate } from '@/lib/whatsappApi';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';

export default function WhatsAppPlantillaNueva() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'UTILITY' | 'MARKETING' | 'AUTHENTICATION'>('UTILITY');
  const [language, setLanguage] = useState('es_ES');
  const [body, setBody] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;

    setSaving(true);
    const result = await createTemplate({ name: name.trim(), category, language, body: body.trim() });
    setSaving(false);

    if (result.error) {
      toast({ title: t('ct.error'), description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: t('ct.success') });
    navigate('/configuracion/whatsapp');
  }

  return (
    <MainLayout backTo="/configuracion/whatsapp">
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl md:mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('ct.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">{t('ct.name_label')}</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder={t('ct.name_placeholder')} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('ct.category_label')}</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">UTILITY</SelectItem>
                      <SelectItem value="MARKETING">MARKETING</SelectItem>
                      <SelectItem value="AUTHENTICATION">AUTHENTICATION</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('ct.language_label')}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es_ES">{t('ct.lang_es')}</SelectItem>
                      <SelectItem value="en_US">{t('ct.lang_en')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">{t('ct.body_label')}</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={t('ct.body_placeholder')}
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('ct.body_hint')}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                  {t('ct.cancel')}
                </Button>
                <Button type="submit" disabled={saving || !name.trim() || !body.trim()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('ct.submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
