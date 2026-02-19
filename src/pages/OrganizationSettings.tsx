import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getOrganizationDetails, updateOrganization } from '@/lib/api.supabase';
import type { Organization } from '@/types/organization';
import { Loader2, Building2 } from 'lucide-react';

const TIMEZONE_OPTIONS = [
  { value: 'America/Tegucigalpa', label: 'Tegucigalpa (UTC-6)' },
  { value: 'America/Mexico_City', label: 'Ciudad de Mexico (UTC-6)' },
  { value: 'America/Guatemala', label: 'Guatemala (UTC-6)' },
  { value: 'America/Costa_Rica', label: 'Costa Rica (UTC-6)' },
  { value: 'America/Panama', label: 'Panama (UTC-5)' },
  { value: 'America/New_York', label: 'Nueva York (UTC-5)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
  { value: 'America/Denver', label: 'Denver (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
];

export default function OrganizationSettings() {
  const { isAdmin } = useCurrentUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    setLoading(true);
    try {
      const data = await getOrganizationDetails();
      if (data) {
        setOrg(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setTimezone(data.timezone || '');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al cargar la organizacion',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la organizacion es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateOrganization(org.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        timezone: timezone || undefined,
      });
      setOrg(updated);
      toast({
        title: 'Exito',
        description: 'Organizacion actualizada correctamente',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al actualizar la organizacion',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              No tienes permisos para acceder a esta pagina
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Organizacion</h1>
          <p className="text-muted-foreground">
            Configura los datos generales de tu organizacion.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        ) : !org ? (
          <Alert variant="destructive">
            <AlertDescription>No se encontro la organizacion</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos de la organizacion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Editable fields */}
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nombre *</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre de la organizacion"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-phone">Telefono</Label>
                  <Input
                    id="org-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +504 9999-9999"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-email">Email</Label>
                  <Input
                    id="org-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@organizacion.com"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-timezone">Zona horaria</Label>
                  <Select
                    value={timezone}
                    onValueChange={setTimezone}
                    disabled={saving}
                  >
                    <SelectTrigger id="org-timezone">
                      <SelectValue placeholder="Selecciona una zona horaria" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Read-only fields */}
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug</Label>
                  <Input
                    id="org-slug"
                    value={org.slug}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-created">Fecha de creacion</Label>
                  <Input
                    id="org-created"
                    value={new Date(org.createdAt).toLocaleDateString('es-HN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
