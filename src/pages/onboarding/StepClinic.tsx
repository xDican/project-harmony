import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import OnboardingLayout from './OnboardingLayout';
import { getOnboardingStatus, setupClinic } from '@/lib/api.supabase';

export default function StepClinic() {
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify we're at the right step
  useEffect(() => {
    getOnboardingStatus()
      .then(({ step }) => {
        if (step === 'doctor') navigate('/onboarding/doctor', { replace: true });
        else if (step === 'schedule') navigate('/onboarding/schedule', { replace: true });
        else if (step === 'summary') navigate('/onboarding/summary', { replace: true });
        else if (step === 'complete') navigate('/agenda-semanal', { replace: true });
      })
      .catch(() => {
        // Proceed — user may legitimately be at start
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!clinicName.trim()) {
      setError('El nombre de la clínica es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      await setupClinic(clinicName.trim());
      navigate('/onboarding/doctor');
    } catch (err: any) {
      setError(err.message || 'Error al crear la clínica. Intenta de nuevo.');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo crear la clínica.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <OnboardingLayout currentStep={1}>
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={1}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nombra tu clínica</h1>
          <p className="text-muted-foreground mt-1">
            Este nombre aparecerá en tu agenda y comunicaciones con pacientes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinicName">Nombre de la clínica</Label>
            <Input
              id="clinicName"
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Ej: Clínica San Rafael"
              required
              disabled={loading}
              autoFocus
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
