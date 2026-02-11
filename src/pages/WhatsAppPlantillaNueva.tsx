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
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Plantilla creada correctamente' });
    navigate('/configuracion/whatsapp');
  }

  return (
    <MainLayout backTo="/configuracion/whatsapp">
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl md:mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear plantilla</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la plantilla *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="confirmacion_cita" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
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
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es_ES">Español (es_ES)</SelectItem>
                      <SelectItem value="en_US">Inglés (en_US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Cuerpo del mensaje *</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Hola {{1}}, tu cita con {{2}} es el {{3}} a las {{4}}."
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{1}}'}, {'{{2}}'} para variables dinámicas.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !name.trim() || !body.trim()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear plantilla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
