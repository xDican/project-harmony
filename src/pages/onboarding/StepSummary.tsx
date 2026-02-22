import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import OnboardingLayout from './OnboardingLayout';
import { getOnboardingStatus, completeOnboarding } from '@/lib/api.supabase';

export default function StepSummary() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingStatus()
      .then(({ step, onboarding_status }) => {
        if (step === 'clinic') navigate('/onboarding/clinic', { replace: true });
        else if (step === 'doctor') navigate('/onboarding/doctor', { replace: true });
        else if (step === 'schedule') navigate('/onboarding/schedule', { replace: true });
        else if (step === 'complete') navigate('/agenda-semanal', { replace: true });
        else if (onboarding_status === 'ready_to_activate') setAlreadyRequested(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate]);

  const handleRequestActivation = async () => {
    setError(null);
    setLoading(true);
    try {
      await completeOnboarding();
      setSubmitted(true);
      toast({
        title: 'Solicitud enviada',
        description: 'Te notificaremos cuando tu cuenta esté activa.',
      });
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud. Intenta de nuevo.');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo enviar la solicitud.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <OnboardingLayout currentStep={4}>
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </OnboardingLayout>
    );
  }

  const showWaiting = submitted || alreadyRequested;

  return (
    <OnboardingLayout currentStep={4}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resumen de configuración</h1>
          <p className="text-muted-foreground mt-1">
            Revisa que todo esté correcto antes de solicitar la activación.
          </p>
        </div>

        {/* Checklist */}
        <div className="border border-border rounded-lg bg-card divide-y divide-border">
          <ChecklistItem icon="✅" label="Clínica creada" />
          <ChecklistItem icon="✅" label="Perfil de médico configurado" />
          <ChecklistItem icon="✅" label="Horarios de atención configurados" />
          <ChecklistItem
            icon="⏳"
            label="WhatsApp se configurará después de la activación"
            muted
          />
        </div>

        {showWaiting ? (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <h2 className="font-semibold text-foreground">¡Solicitud enviada!</h2>
            <p className="text-sm text-muted-foreground">
              El equipo de OrionCare revisará tu cuenta y te notificará cuando esté activa.
              Normalmente esto toma menos de 24 horas.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={handleRequestActivation}
              disabled={loading}
            >
              {loading ? 'Enviando solicitud...' : 'Solicitar activación'}
            </Button>
          </>
        )}
      </div>
    </OnboardingLayout>
  );
}

function ChecklistItem({
  icon,
  label,
  muted = false,
}: {
  icon: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-lg">{icon}</span>
      <span className={muted ? 'text-sm text-muted-foreground' : 'text-sm text-foreground'}>
        {label}
      </span>
    </div>
  );
}
