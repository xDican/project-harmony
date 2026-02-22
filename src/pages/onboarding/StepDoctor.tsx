import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import OnboardingLayout from './OnboardingLayout';
import { getOnboardingStatus, setupDoctor } from '@/lib/api.supabase';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/context/UserContext';

const PREFIXES = ['Dr.', 'Dra.', 'Lic.', 'Mtro.', 'Mtra.', 'Otro'];

export default function StepDoctor() {
  const navigate = useNavigate();
  const { loading: userLoading } = useCurrentUser();
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('Dr.');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load current user email
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  // Verify we're at the right step — wait for auth to settle first
  useEffect(() => {
    if (userLoading) return;

    getOnboardingStatus()
      .then(({ step }) => {
        if (step === 'clinic') navigate('/onboarding/clinic', { replace: true });
        else if (step === 'schedule') navigate('/onboarding/schedule', { replace: true });
        else if (step === 'summary') navigate('/onboarding/summary', { replace: true });
        else if (step === 'complete') navigate('/agenda-semanal', { replace: true });
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate, userLoading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      await setupDoctor({ name: name.trim(), prefix, phone: phone.trim() || undefined });
      navigate('/onboarding/schedule');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el perfil. Intenta de nuevo.');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo guardar el perfil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <OnboardingLayout currentStep={2}>
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={2}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil del médico</h1>
          <p className="text-muted-foreground mt-1">
            Estos datos aparecerán en tu agenda y en los recordatorios a pacientes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefijo</Label>
              <Select value={prefix} onValueChange={setPrefix} disabled={loading}>
                <SelectTrigger id="prefix">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREFIXES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan García López"
                required
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              El email es el de tu cuenta y no se puede cambiar aquí.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: +52 55 1234 5678"
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Continuar'}
          </Button>
        </form>
      </div>
    </OnboardingLayout>
  );
}
